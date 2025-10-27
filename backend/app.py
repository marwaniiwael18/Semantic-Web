from flask import Flask, request, jsonify
from flask_cors import CORS
from rdflib import Graph, Namespace, RDF, RDFS, OWL, Literal, URIRef
from rdflib.namespace import XSD
from rdflib.plugins.sparql import prepareQuery
import re
import os
import json
import requests
from datetime import datetime
import sys
from ai_helper import (
    generate_sparql_from_natural_language,
    get_ai_suggestions,
    explain_sparql_results,
    get_smart_city_insights,
    suggest_related_queries
)
from cloudinary_helper import upload_profile_image, delete_profile_image, upload_station_image

app = Flask(__name__)

# Quick compatibility check: detect mismatched pyparsing / rdflib versions early
try:
    import pyparsing
    import rdflib
    pyver = getattr(pyparsing, '__version__', None)
    rdver = getattr(rdflib, '__version__', None)
    if pyver is None:
        print("WARNING: pyparsing is installed but its __version__ is not available.")
    else:
        # rdflib 7.x expects pyparsing 2.x API. If pyparsing is 3.x, the SPARQL parser
        # may raise TypeError at runtime (see parser.postParse2 signature mismatches).
        if not pyver.startswith('2.'):
            # Provide a clearer, actionable error with both versions printed.
            print('\nERROR: Incompatible pyparsing version detected: ' + str(pyver))
            print('rdflib version detected: ' + str(rdver))
            print('rdflib 7.x requires pyparsing 2.x (e.g. 2.4.7).\n')
            print('To fix this environment, run (PowerShell):')
            print('    python -m pip install --upgrade pip; python -m pip install --force-reinstall -r backend/requirements.txt')
            print('\nOr to install only pyparsing 2.4.7:')
            print('    python -m pip install --force-reinstall pyparsing==2.4.7')
            # Exit early to avoid confusing runtime parse errors in SPARQL handling.
            sys.exit(1)
except Exception as _e:
    # Don't block startup if the check itself fails; just log the error.
    print('Warning: version check for pyparsing/rdflib failed:', str(_e))


def enrich_results_with_labels(result_list):
    """
    For each row in result_list, detect values that look like URIs and try to
    replace them with a human-friendly label when available (rdfs:label or ont:Nom).
    Fallback: shorten the URI to its last segment.
    This mutates result_list in-place.
    """
    try:
        from rdflib import URIRef
        ont_nom = URIRef('http://www.co-ode.org/ontologies/ont.owl#Nom')
        for row in result_list:
            for k, v in list(row.items()):
                if v is None:
                    continue
                sv = str(v)
                if sv.startswith('http://') or sv.startswith('https://') or ('#' in sv):
                    # attempt to resolve label
                    try:
                        u = URIRef(sv)
                        lab = g.value(u, RDFS.label)
                        if lab is None:
                            lab = g.value(u, ont_nom)
                        if lab is not None:
                            row[k] = str(lab)
                        else:
                            # shorten URI
                            if '#' in sv:
                                row[k] = sv.split('#')[-1]
                            else:
                                row[k] = sv.rstrip('/').split('/')[-1]
                    except Exception:
                        # best-effort: shorten URI
                        try:
                            if '#' in sv:
                                row[k] = sv.split('#')[-1]
                            else:
                                row[k] = sv.rstrip('/').split('/')[-1]
                        except Exception:
                            pass
    except Exception:
        # If anything fails, leave result_list as-is
        return

# Configure CORS to allow all origins and methods
CORS(app, 
     resources={r"/api/*": {
         "origins": "*",
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "expose_headers": ["Content-Type"],
         "supports_credentials": False
     }})

# Load RDF ontology
g = Graph()
rdf_file = os.path.join(os.path.dirname(__file__), '..', 'Projet.rdf')
# Parse the RDF file. rdflib may raise on malformed dateTime literals (date-only strings
# typed as xsd:dateTime). Try a normal parse first, and if it fails, perform a
# tolerant text-based replacement of dateTime->date for date-only literals and parse from string.
try:
    g.parse(rdf_file, format='xml')
except Exception as parse_err:
    print('Initial RDF parse failed:', str(parse_err))
    try:
        import re
        with open(rdf_file, 'r', encoding='utf-8') as fh:
            src = fh.read()

        # Replace occurrences where a literal contains only YYYY-MM-DD but is typed as xsd:dateTime
        # e.g. rdf:Description ... ont:aDateEvenement rdf:datatype="...#dateTime">2025-10-27</...
        pattern = re.compile(r"(datatype=\"[^\"]*dateTime[^\"]*\"[^>]*>)(\s*)(\d{4}-\d{2}-\d{2})(\s*<)", re.IGNORECASE)

        def _fix(m):
            # change dateTime -> date in the datatype attribute portion
            head = m.group(1).replace('dateTime', 'date')
            return head + m.group(2) + m.group(3) + m.group(4)

        fixed = pattern.sub(_fix, src)

        # Parse from the fixed string
        g.parse(data=fixed, format='xml')
        print('Parsed RDF from tolerant fallback (dateTime->date replacements applied).')
    except Exception as e2:
        print('Tolerant RDF parse also failed:', str(e2))
        raise

# Normalize date/datetime literals: rdflib will attempt to convert xsd:dateTime literals
# to Python datetimes. Some literals in Projet.rdf are typed as xsd:dateTime but use
# a date-only lexical form like '2025-10-27' (missing the 'T' time designator). That
# causes conversion warnings. We'll normalize those to xsd:date to avoid parsing errors.
try:
    fixes = []
    adds = []
    for s, p, o in list(g.triples((None, None, None))):
        if isinstance(o, Literal) and o.datatype:
            # detect xsd:dateTime typed literals with no 'T' in the lexical form
            if (str(o.datatype).endswith('dateTime') or o.datatype == XSD.dateTime) and 'T' not in str(o):
                # create a date-typed literal instead
                new_lit = Literal(str(o), datatype=XSD.date)
                fixes.append((s, p, o))
                adds.append((s, p, new_lit))

    # apply removals and additions
    for t in fixes:
        g.remove(t)
    for t in adds:
        g.add(t)

    if len(fixes) > 0:
        print(f"Normalized {len(fixes)} dateTime literals to xsd:date to avoid parse warnings")
except Exception as _e:
    # Don't fail startup for this normalization; just log and continue
    print("Date normalization warning:", str(_e))

# Define namespaces
SMARTCITY = Namespace("http://example.org/smartcity#")
ONT = Namespace("http://www.co-ode.org/ontologies/ont.owl#")

# Bind namespaces
g.bind("smartcity", SMARTCITY)
g.bind("ont", ONT)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Smart City API is running"})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get overall statistics"""
    query = """
    PREFIX smartcity: <http://example.org/smartcity#>
    PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    
    SELECT 
        (COUNT(DISTINCT ?user) as ?totalUsers)
        (COUNT(DISTINCT ?transport) as ?totalTransports)
        (COUNT(DISTINCT ?station) as ?totalStations)
        (COUNT(DISTINCT ?zone) as ?totalZones)
        (COUNT(DISTINCT ?trajet) as ?totalTrajets)
        (COUNT(DISTINCT ?event) as ?totalEvents)
    WHERE {
        OPTIONAL { ?user rdf:type/rdfs:subClassOf* smartcity:Utilisateur }
        OPTIONAL { ?transport rdf:type/rdfs:subClassOf* smartcity:Transport }
        OPTIONAL { ?station rdf:type/rdfs:subClassOf* smartcity:Station }
    OPTIONAL { ?zone rdf:type ?zoneType . ?zoneType rdfs:subClassOf* smartcity:ZoneUrbaine }
        OPTIONAL { ?trajet rdf:type smartcity:Trajet }
        OPTIONAL { ?event rdf:type/rdfs:subClassOf* smartcity:EvenementDeCirculation }
    }
    """
    
    results = g.query(query)
    for row in results:
        return jsonify({
            "totalUsers": int(row.totalUsers),
            "totalTransports": int(row.totalTransports),
            "totalStations": int(row.totalStations),
            "totalZones": int(row.totalZones),
            "totalTrajets": int(row.totalTrajets),
            "totalEvents": int(row.totalEvents)
        })
    
    return jsonify({})

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users with their details"""
    query = """
    PREFIX smartcity: <http://example.org/smartcity#>
    PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    
    SELECT ?user ?nom ?age ?email ?type ?transport ?ticket
    WHERE {
        ?user rdf:type ?userType .
        ?userType rdfs:subClassOf* smartcity:Utilisateur .
        FILTER(?userType != smartcity:Utilisateur)
        
        OPTIONAL { ?user ont:Nom ?nom }
        OPTIONAL { ?user ont:Age ?age }
        OPTIONAL { ?user ont:Email ?email }
        OPTIONAL { ?user smartcity:utiliseTransport ?transport }
        OPTIONAL { ?user smartcity:aTicket ?ticket }
        
        BIND(STRAFTER(STR(?userType), "#") AS ?type)
    }
    """
    
    results = g.query(query)
    users = []
    user_dict = {}
    
    for row in results:
        user_id = str(row.user)
        if user_id not in user_dict:
            user_dict[user_id] = {
                "id": user_id.split('#')[-1],
                "nom": str(row.nom) if row.nom else "Unknown",
                "age": int(row.age) if row.age else None,
                "email": str(row.email) if row.email else None,
                "type": str(row.type) if row.type else "Unknown",
                "transports": [],
                "tickets": []
            }
        
        if row.transport and str(row.transport) not in user_dict[user_id]["transports"]:
            user_dict[user_id]["transports"].append(str(row.transport).split('#')[-1])
        
        if row.ticket and str(row.ticket) not in user_dict[user_id]["tickets"]:
            user_dict[user_id]["tickets"].append(str(row.ticket).split('#')[-1])
    
    return jsonify(list(user_dict.values()))

@app.route('/api/transports', methods=['GET'])
def get_transports():
    """Get all transports with their details"""
    query = """
    PREFIX smartcity: <http://example.org/smartcity#>
    PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    
    SELECT ?transport ?nom ?type ?capacite ?immat ?vitesse ?electrique ?zone ?energie ?imageUrl
    WHERE {
        ?transport rdf:type ?transportType .
        ?transportType rdfs:subClassOf* smartcity:Transport .
        FILTER(?transportType != smartcity:Transport)
        
        OPTIONAL { ?transport ont:Nom ?nom }
        OPTIONAL { ?transport ont:Capacite ?capacite }
        OPTIONAL { ?transport ont:Immatriculation ?immat }
        OPTIONAL { ?transport ont:VitesseMax ?vitesse }
        OPTIONAL { ?transport ont:estElectrique ?electrique }
        OPTIONAL { ?transport smartcity:circuleDans ?zone }
        OPTIONAL { ?transport smartcity:alimentePar ?energie }
        OPTIONAL { ?transport ont:ImageURL ?imageUrl }
        
        BIND(STRAFTER(STR(?transportType), "#") AS ?type)
    }
    """
    
    results = g.query(query)
    transports = []
    transport_dict = {}
    
    for row in results:
        transport_id = str(row.transport)
        if transport_id not in transport_dict:
            transport_dict[transport_id] = {
                "id": transport_id.split('#')[-1],
                "nom": str(row.nom) if row.nom else transport_id.split('#')[-1],
                "type": str(row.type) if row.type else "Unknown",
                "capacite": int(row.capacite) if row.capacite else None,
                "immatriculation": str(row.immat) if row.immat else None,
                "vitesseMax": int(row.vitesse) if row.vitesse else None,
                "electrique": bool(row.electrique) if row.electrique else False,
                "zone": str(row.zone).split('#')[-1] if row.zone else None,
                "energie": str(row.energie).split('#')[-1] if row.energie else None,
                "imageUrl": str(row.imageUrl) if row.imageUrl else None
            }
    
    return jsonify(list(transport_dict.values()))

@app.route('/api/stations', methods=['GET'])
def get_stations():
    """Get all stations with their details"""
    query = """
    PREFIX smartcity: <http://example.org/smartcity#>
    PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    
    SELECT ?station ?nom ?type ?latitude ?longitude
    WHERE {
        ?station rdf:type ?stationType .
        ?stationType rdfs:subClassOf* smartcity:Station .
        FILTER(?stationType != smartcity:Station)
        
        OPTIONAL { ?station ont:aNomStation ?nom }
        OPTIONAL { ?station ont:aLatitude ?latitude }
        OPTIONAL { ?station ont:aLongitude ?longitude }
        
        BIND(STRAFTER(STR(?stationType), "#") AS ?type)
    }
    """
    
    results = g.query(query)
    stations = []
    
    for row in results:
        stations.append({
            "id": str(row.station).split('#')[-1],
            "nom": str(row.nom) if row.nom else str(row.station).split('#')[-1],
            "type": str(row.type) if row.type else "Unknown",
            "latitude": float(row.latitude) if row.latitude else None,
            "longitude": float(row.longitude) if row.longitude else None
        })
    
    return jsonify(stations)

@app.route('/api/events', methods=['GET'])
def get_events():
    """Get all circulation events"""
    query = """
    PREFIX smartcity: <http://example.org/smartcity#>
    PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    
    SELECT ?event ?nom ?type ?description ?date ?gravite ?trajet ?zone ?imageUrl
    WHERE {
        ?event rdf:type ?eventType .
        ?eventType rdfs:subClassOf* smartcity:EvenementDeCirculation .
        FILTER(?eventType != smartcity:EvenementDeCirculation)
        
        OPTIONAL { ?event ont:Nom ?nom }
        OPTIONAL { ?event ont:aDescription ?description }
        OPTIONAL { ?event ont:aDateEvenement ?date }
        OPTIONAL { ?event ont:aGravite ?gravite }
        OPTIONAL { ?event smartcity:impacte ?trajet }
        OPTIONAL { ?event smartcity:organiseDans ?zone }
        OPTIONAL { ?event ont:imageUrl ?imageUrl }
        
        BIND(STRAFTER(STR(?eventType), "#") AS ?type)
    }
    """
    
    results = g.query(query)
    events = []
    
    for row in results:
        events.append({
            "id": str(row.event).split('#')[-1],
            "nom": str(row.nom) if row.nom else str(row.event).split('#')[-1],
            "type": str(row.type) if row.type else "Unknown",
            "description": str(row.description) if row.description else None,
            "date": str(row.date) if row.date else None,
            "gravite": int(row.gravite) if row.gravite else None,
            "trajet": str(row.trajet).split('#')[-1] if row.trajet else None,
            "zone": str(row.zone).split('#')[-1] if row.zone else None,
            "imageUrl": str(row.imageUrl) if row.imageUrl else None
        })
    
    return jsonify(events)

@app.route('/api/trajets', methods=['GET'])
def get_trajets():
    """Get all trajets (trips)"""
    query = """
    PREFIX smartcity: <http://example.org/smartcity#>
    PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    
    SELECT ?trajet ?nom ?duree ?distance ?prix ?depart ?arrivee
    WHERE {
        ?trajet rdf:type smartcity:Trajet .
        
        OPTIONAL { ?trajet ont:Nom ?nom }
        OPTIONAL { ?trajet ont:aDuree ?duree }
        OPTIONAL { ?trajet ont:aDistance ?distance }
        OPTIONAL { ?trajet ont:aPrix ?prix }
        OPTIONAL { ?trajet smartcity:partDe ?depart }
        OPTIONAL { ?trajet smartcity:arriveA ?arrivee }
    }
    """
    
    results = g.query(query)
    trajets = []
    
    for row in results:
        trajets.append({
            "id": str(row.trajet).split('#')[-1],
            "nom": str(row.nom) if row.nom else str(row.trajet).split('#')[-1],
            "duree": float(row.duree) if row.duree else None,
            "distance": float(row.distance) if row.distance else None,
            "prix": float(row.prix) if row.prix else None,
            "depart": str(row.depart).split('#')[-1] if row.depart else None,
            "arrivee": str(row.arrivee).split('#')[-1] if row.arrivee else None
        })
    
    return jsonify(trajets)

@app.route('/api/query', methods=['POST'])
def execute_sparql():
    """Execute custom SPARQL query"""
    data = request.get_json()
    query_string = data.get('query', '')
    
    # Preserve original query for debug/UI, but execute a DISTINCT-aware version
    exec_query = query_string
    try:
        # If the user used COUNT(?var) without DISTINCT, replace with COUNT(DISTINCT ?var)
        exec_query = re.sub(r"COUNT\(\s*(?!DISTINCT\b)\?([A-Za-z0-9_]+)\s*\)",
                            r"COUNT(DISTINCT ?\1)", exec_query, flags=re.IGNORECASE)
        results = g.query(exec_query)
        # Build result_list from the rdflib results object
        result_list = []
        for row in results:
            result_dict = {}
            for var in results.vars:
                value = row[var]
                # include zero/empty-string/falsey literals; only skip None
                if value is not None:
                    result_dict[str(var)] = str(value)
            result_list.append(result_dict)

        return jsonify({
            "success": True,
            "results": result_list,
            "count": len(result_list)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route('/api/search', methods=['POST'])
def semantic_search():
    """Semantic search with AI enhancement"""
    data = request.get_json()
    search_term = data.get('query', '').lower()
    category = data.get('category', 'all')
    
    # Build dynamic SPARQL query based on category
    if category == 'users':
        query = f"""
        PREFIX smartcity: <http://example.org/smartcity#>
        PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        SELECT ?user ?nom ?age ?email ?type
        WHERE {{
            ?user rdf:type ?userType .
            ?userType rdfs:subClassOf* smartcity:Utilisateur .
            OPTIONAL {{ ?user ont:Nom ?nom }}
            OPTIONAL {{ ?user ont:Age ?age }}
            OPTIONAL {{ ?user ont:Email ?email }}
            BIND(STRAFTER(STR(?userType), "#") AS ?type)
            FILTER(CONTAINS(LCASE(?nom), "{search_term}") || CONTAINS(LCASE(?email), "{search_term}"))
        }}
        """
    elif category == 'transports':
        query = f"""
        PREFIX smartcity: <http://example.org/smartcity#>
        PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        SELECT ?transport ?nom ?type ?capacite
        WHERE {{
            ?transport rdf:type ?transportType .
            ?transportType rdfs:subClassOf* smartcity:Transport .
            OPTIONAL {{ ?transport ont:Nom ?nom }}
            OPTIONAL {{ ?transport ont:Capacite ?capacite }}
            BIND(STRAFTER(STR(?transportType), "#") AS ?type)
            FILTER(CONTAINS(LCASE(?nom), "{search_term}") || CONTAINS(LCASE(?type), "{search_term}"))
        }}
        """
    else:
        # General search across all entities
        query = """
        PREFIX smartcity: <http://example.org/smartcity#>
        PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        SELECT ?entity ?nom ?type
        WHERE {
            ?entity rdf:type ?entityType .
            OPTIONAL { ?entity ont:Nom ?nom }
            BIND(STRAFTER(STR(?entityType), "#") AS ?type)
        }
        """
    
    try:
        results = g.query(query)
        result_list = []
        
        for row in results:
            result_dict = {}
            for var in results.vars:
                value = row[var]
                if value:
                    result_dict[str(var)] = str(value)
            result_list.append(result_dict)
        
        return jsonify({
            "success": True,
            "results": result_list,
            "query": search_term,
            "count": len(result_list)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route('/api/zones', methods=['GET'])
def get_zones():
    """Get all urban zones"""
    query = """
    PREFIX smartcity: <http://example.org/smartcity#>
    PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    
    SELECT ?zone ?nom ?type (COUNT(DISTINCT ?transport) as ?transports)
    WHERE {
        ?zone rdf:type ?zoneType .
        ?zoneType rdfs:subClassOf* smartcity:ZoneUrbaine .
        FILTER(?zoneType != smartcity:ZoneUrbaine)
        
        OPTIONAL { ?zone ont:Nom ?nom }
        OPTIONAL { ?transport smartcity:circuleDans ?zone }
        
        BIND(STRAFTER(STR(?zoneType), "#") AS ?type)
    }
    GROUP BY ?zone ?nom ?type
    """
    
    results = g.query(query)
    zones = []
    
    for row in results:
        zones.append({
            "id": str(row.zone).split('#')[-1],
            "nom": str(row.nom) if row.nom else str(row.zone).split('#')[-1],
            "type": str(row.type) if row.type else "Unknown",
            "totalTransports": int(row.transports)
        })
    
    return jsonify(zones)

@app.route('/api/ai/natural-query', methods=['POST'])
def natural_language_query():
    """Convert natural language to SPARQL and execute it"""
    data = request.get_json()
    user_question = data.get('question', '')
    
    if not user_question:
        return jsonify({"success": False, "error": "No question provided"}), 400
    
    try:
        # Quick heuristic: if the user asks for "moyenne" of "gravite" over last N days,
        # bypass the AI and run a safe, type-robust SPARQL that enforces numeric gravite
        # and uses a concrete date window. This avoids false positives caused by
        # mixed xsd:date/xsd:dateTime and non-numeric gravite values.
        import re
        from datetime import datetime as _dt, timedelta as _td

        m_avg = re.search(r"moyenn?e|moyen|average", user_question, re.IGNORECASE)
        m_grav = re.search(r"gravit", user_question, re.IGNORECASE)
        if m_avg and m_grav:
            # extract a day window if present (e.g., '30 derniers jours')
            m_days = re.search(r"(\d+)\s*(?:derniers?|dernier|jours|jours)", user_question, re.IGNORECASE)
            days = int(m_days.group(1)) if m_days else 30
            start_date = (_dt.utcnow().date() - _td(days=days)).isoformat()

            import textwrap
            # Use a simple SELECT to fetch events with date and gravite, then compute average in Python.
            safe_q = textwrap.dedent(f"""
            PREFIX smartcity: <http://example.org/smartcity#>
            PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

            SELECT ?e ?d ?grav
            WHERE {{
                ?e rdf:type/rdfs:subClassOf* smartcity:EvenementDeCirculation .
                OPTIONAL {{ ?e ont:aDateEvenement ?d }}
                OPTIONAL {{ ?e ont:aGravite ?grav }}
                FILTER( STR(?d) >= "{start_date}" )
            }}
            """
            ).strip()

            try:
                results_obj = g.query(safe_q)
                total = 0.0
                count_numeric = 0
                events_seen = set()
                for row in results_obj:
                    # row vars: ?e, ?d, ?grav
                    e = row.get('e')
                    grav = row.get('grav')
                    if e is None:
                        continue
                    events_seen.add(str(e))
                    if grav is not None:
                        try:
                            v = float(str(grav))
                            total += v
                            count_numeric += 1
                        except Exception:
                            # non-numeric grav value -> skip
                            pass

                avg = None
                if count_numeric > 0:
                    avg = total / count_numeric

                result_list = [{ 'avgGravite': str(avg) if avg is not None else None, 'countEvents': len(events_seen) }]

                # If there were events but none had numeric gravite, collect sample grav values for diagnostics
                diagnostic_grav_values = None
                if len(events_seen) > 0 and count_numeric == 0:
                    try:
                        diag_q = textwrap.dedent(f"""
                        PREFIX smartcity: <http://example.org/smartcity#>
                        PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
                        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

                        SELECT DISTINCT ?grav WHERE {{
                            ?e rdf:type/rdfs:subClassOf* smartcity:EvenementDeCirculation .
                            OPTIONAL {{ ?e ont:aDateEvenement ?d }}
                            OPTIONAL {{ ?e ont:aGravite ?grav }}
                            FILTER( STR(?d) >= "{start_date}" )
                        }} LIMIT 20
                        """
                        ).strip()
                        diag_res = g.query(diag_q)
                        diagnostic_grav_values = [str(r.grav) for r in diag_res if getattr(r, 'grav', None) is not None]
                    except Exception:
                        diagnostic_grav_values = None

                explanation = explain_sparql_results(safe_q, len(result_list))
                user_message = f"Requête sécurisée exécutée : moyenne sur les {days} derniers jours (à partir de {start_date})."
                resp = {
                    "success": True,
                    "question": user_question,
                    "generatedQuery": None,
                    "executedQuery": safe_q,
                    "results": result_list,
                    "count": len(result_list),
                    "explanation": explanation,
                    "userMessage": user_message,
                    "diagnosticGravValues": diagnostic_grav_values
                }
                return jsonify(resp)
            except Exception as e:
                # If the safe query fails for any reason, log and fall through to the AI path
                print('Safe AVG gravite query failed:', str(e))
                try:
                    print('--- Safe query (raw) ---')
                    print(safe_q)
                    print('--- Safe query (repr) ---')
                    print(repr(safe_q))
                except Exception:
                    pass

        # Generate SPARQL from natural language using Gemini AI
        try:
            sparql_query = generate_sparql_from_natural_language(user_question)
        except Exception as e:
            # If AI helper failed, return a clear error to the frontend
            err_msg = f"AI generation failed: {str(e)}"
            print(err_msg)
            return jsonify({"success": False, "error": err_msg}), 500

        # Basic sanity check: ensure the returned text looks like SPARQL
        try:
            sq_up = (sparql_query or '').upper()
            if not any(tok in sq_up for tok in ['SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE', 'PREFIX', 'WITH']):
                msg = 'AI did not return a valid SPARQL query.'
                print(msg + f" Raw AI output: {str(sparql_query)[:300]}")
                return jsonify({"success": False, "error": msg, "rawAI": str(sparql_query)}), 400
        except Exception:
            # If any unexpected error occurs during sanity check, continue and let query execution handle it
            pass
        
        # Best-effort: fix prefixed names (namespace mismatches) in AI-generated SPARQL
        # If AI used prefix:Local that doesn't exist in the graph, search bound
        # namespaces for a matching local-name and replace with full IRI <...>.
        try:
            import re
            prefix_map = {p: ns for (p, ns) in g.namespaces()}

            def _exists_in_graph(uri_str):
                u = URIRef(uri_str)
                return any(g.triples((u, None, None))) or any(g.triples((None, None, u))) or any(g.triples((None, u, None)))

            tokens = re.findall(r"\b([A-Za-z_][A-Za-z0-9_-]*)\:([A-Za-z0-9_]+)\b", sparql_query)
            for prefix, local in tokens:
                if prefix not in prefix_map:
                    continue
                base = str(prefix_map[prefix])
                candidate = base + local
                if _exists_in_graph(candidate):
                    continue

                found = None
                for (p2, ns2) in g.namespaces():
                    uri_try = str(ns2) + local
                    if _exists_in_graph(uri_try):
                        found = uri_try
                        break

                if found:
                    pattern = re.compile(r"\b" + re.escape(prefix) + r":" + re.escape(local) + r"\b")
                    sparql_query = pattern.sub(f"<{found}>", sparql_query)
            # Rewrite shorthand 'a PREFIX:Class' or "a <IRI>" to use subclass-aware path
            # so that queries asking for 'a smartcity:Station' will match instances
            # of subclasses (e.g., ont:StationBus) via rdf:type/rdfs:subClassOf*.
            try:
                # replace 'a prefix:LocalName' -> 'rdf:type/rdfs:subClassOf* prefix:LocalName'
                sparql_query = re.sub(r"\ba\s+([A-Za-z_][A-Za-z0-9_-]*:[A-Za-z0-9_]+)\b",
                                      r"rdf:type/rdfs:subClassOf* \1",
                                      sparql_query)

                # replace 'a <http://...>' -> 'rdf:type/rdfs:subClassOf* <http://...>'
                sparql_query = re.sub(r"\ba\s+(<https?:[^>]+>)\b",
                                      r"rdf:type/rdfs:subClassOf* \1",
                                      sparql_query)
            except Exception:
                # best-effort; don't block execution if rewrite fails
                pass
        except Exception:
            # ignore preprocessing failures; proceed with original query
            pass

        # Prepare initial exec_query from AI-generated SPARQL but do NOT modify
        # the generatedQuery shown to the user. We'll apply safe rewrites for execution.
        base_exec = sparql_query

        # Helper: replace COUNT(?x) -> COUNT(DISTINCT ?x)
        try:
            base_exec = re.sub(r"COUNT\(\s*(?!DISTINCT\b)\?([A-Za-z0-9_]+)\s*\)",
                               r"COUNT(DISTINCT ?\1)", base_exec, flags=re.IGNORECASE)
        except Exception:
            pass

        # Helper: replace relative NOW()-"P30D"^^xsd:dayTimeDuration with concrete date literal (xsd:date)
        try:
            from datetime import datetime as _dt, timedelta as _td

            def _replace_now_minus(match):
                days = 0
                try:
                    days = int(match.group('days'))
                except Exception:
                    days = 0
                target = (_dt.utcnow().date() - _td(days=days)).isoformat()
                return f'"{target}"^^xsd:date'

            now_pattern = re.compile(r"NOW\(\)\s*-\s*\"P(?P<days>\d+)D\"\^\^xsd:dayTimeDuration", flags=re.IGNORECASE)
            base_exec = now_pattern.sub(_replace_now_minus, base_exec)
        except Exception:
            pass

        # Attempt 1: execute the base_exec as-is
        executed_query = base_exec
        try:
            results_obj = g.query(executed_query)
            result_list = []
            for row in results_obj:
                rd = {}
                for var in results_obj.vars:
                    value = row[var]
                    if value is not None:
                        rd[str(var)] = str(value)
                result_list.append(rd)
        except Exception as e:
            # If execution fails, attempt a safer fallback later
            result_list = []

        # Determine if we should attempt STR(date) fallback
        need_fallback = False
        try:
            if len(result_list) == 0:
                need_fallback = True
        except Exception:
            need_fallback = True

        # Fallback attempt: replace date comparisons with STR(...) lexical comparisons
        if need_fallback:
            fallback_exec = executed_query
            try:
                # Replace pattern: ?var >= "YYYY-MM-DD"^^...  OR ?var >= "YYYY-MM-DD" with STR(?var) >= "YYYY-MM-DD"
                def _date_comp_repl(m):
                    var = m.group('var')
                    op = m.group('op')
                    date = m.group('date')
                    return f"STR({var}) {op} \"{date}\""

                date_pattern = re.compile(r"(?P<var>\?[A-Za-z0-9_]+)\s*(?P<op>>=|<=|>|<)\s*\"(?P<date>\d{4}-\d{2}-\d{2})(?:T[^\"]*)?\"(?:\^\^[^\s\)]+)?",
                                          flags=re.IGNORECASE)
                fallback_exec = date_pattern.sub(_date_comp_repl, fallback_exec)

                # Execute fallback
                executed_query = fallback_exec
                results_obj2 = g.query(executed_query)
                result_list2 = []
                for row in results_obj2:
                    rd = {}
                    for var in results_obj2.vars:
                        value = row[var]
                        if value is not None:
                            rd[str(var)] = str(value)
                    result_list2.append(rd)

                # If fallback produced results, use them
                if len(result_list2) > 0:
                    result_list = result_list2
            except Exception:
                # ignore fallback errors
                pass
        # result_list is already populated from the primary execution (results_obj)
        # or from the fallback (result_list2) above. No further iteration needed here.

        # Detect single-row COUNT aggregate returning zero (e.g. {"numberOfStations": "0"})
        is_count_zero = False
        if len(result_list) == 1 and len(result_list[0]) > 0:
            try:
                vals = list(result_list[0].values())
                numeric_zero = True
                for v in vals:
                    try:
                        # treat numeric string zeros as zero (int or float)
                        if float(v) != 0.0:
                            numeric_zero = False
                            break
                    except Exception:
                        numeric_zero = False
                        break
                if numeric_zero:
                    is_count_zero = True
            except Exception:
                is_count_zero = False

        # If results are empty (or contain an empty binding), attempt a permissive rewrite
        diagnostic_preds = None
        if len(result_list) == 0 or (len(result_list) == 1 and list(result_list[0].keys()) == []) or is_count_zero:
            try:
                import re
                # Try a permissive rewrite: replace 'rdf:type X' with 'rdf:type/rdfs:subClassOf* X'
                rewritten = re.sub(r"rdf:type\s+(smartcity:[A-Za-z0-9_]+)", r"rdf:type/rdfs:subClassOf* \1", sparql_query)
                if rewritten != sparql_query:
                    results2 = g.query(rewritten)
                    result_list2 = []
                    for row in results2:
                        rd = {}
                        for var in results2.vars:
                            value = row[var]
                            # include zero/empty-string/falsey literals; only skip None
                            if value is not None:
                                rd[str(var)] = str(value)
                        result_list2.append(rd)
                    # if rewrite produced results, use them and mark generatedQuery for UI
                    if len(result_list2) > 0 and not (len(result_list2) == 1 and list(result_list2[0].keys()) == []):
                        result_list = result_list2
                        sparql_query = rewritten
                        # Clear the is_count_zero flag now that we have real results
                        is_count_zero = False
                # If still empty, run a diagnostic to list common predicates for likely entity classes
                if len(result_list) == 0 or (len(result_list) == 1 and list(result_list[0].keys()) == []):
                    # Try to find a smartcity:Class mentioned in the query
                    m = re.search(r"smartcity:([A-Za-z0-9_]+)", sparql_query)
                    if m:
                        cls = m.group(1)
                        diag_q = f"""
                        PREFIX smartcity: <http://example.org/smartcity#>
                        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

                        SELECT ?p (COUNT(?p) as ?count)
                        WHERE {{
                          ?s rdf:type/rdfs:subClassOf* smartcity:{cls} .
                          ?s ?p ?o .
                        }} GROUP BY ?p ORDER BY DESC(?count) LIMIT 20
                        """
                        diag_res = g.query(diag_q)
                        diagnostic_preds = []
                        for row in diag_res:
                            diagnostic_preds.append({
                                'predicate': str(row.p),
                                'count': int(row.count) if row.count else 0
                            })
            except Exception:
                # diagnostic is best-effort; ignore failures
                diagnostic_preds = diagnostic_preds or None
        
        # Enrich results with labels / shorten URIs for display
        try:
            enrich_results_with_labels(result_list)
        except Exception:
            pass

        # Get explanation of results
        explanation = explain_sparql_results(sparql_query, len(result_list))

        # Build a user-friendly message explaining 0-results or summarizing the outcome
        user_message = None
        try:
            if len(result_list) == 0 or (len(result_list) == 1 and list(result_list[0].keys()) == []) or is_count_zero:
                if diagnostic_preds and len(diagnostic_preds) > 0:
                    # Show top 5 predicate suggestions (local names if possible)
                    top = diagnostic_preds[:5]
                    preds = ', '.join([p['predicate'].split('#')[-1] if '#' in p['predicate'] else p['predicate'].split('/')[-1] for p in top])
                    user_message = (
                        "La requête n'a retourné aucun résultat. "
                        "Suggestions : propriétés fréquentes trouvées pour l'entité détectée — " + preds + ". "
                        "Essayez de modifier la requête en utilisant l'une de ces propriétés."
                    )
                else:
                    # If we rewrote date comparisons to STR(...) let the user know
                    try:
                        if ('STR(' in executed_query) and ('STR(' not in sparql_query):
                            user_message = (
                                "Aucun résultat trouvé. Le serveur a appliqué un ajustement des comparaisons de date (STR(...)) "
                                "pour tenir compte de formats de date hétérogènes. Vous pouvez élargir la période de recherche ou vérifier les filtres de date."
                            )
                        else:
                            user_message = (
                                "Aucun résultat — vérifiez les filtres (dates, propriétés) ou essayez une requête plus générale."
                            )
                    except Exception:
                        user_message = "Aucun résultat — essayez d'élargir votre recherche ou vérifiez les propriétés utilisées."
            else:
                user_message = f"Requête exécutée : {len(result_list)} résultat(s) trouvé(s)."
        except Exception:
            user_message = None

        resp = {
            "success": True,
            "question": user_question,
            "generatedQuery": sparql_query,
            "executedQuery": executed_query,
            "results": result_list,
            "count": len(result_list),
            "explanation": explanation,
            "userMessage": user_message
        }
        if diagnostic_preds:
            resp['diagnosticPredicates'] = diagnostic_preds

        return jsonify(resp)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "question": user_question
        }), 400

@app.route('/api/ai/suggestions', methods=['GET'])
def get_suggestions():
    """Get AI-powered query suggestions"""
    try:
        suggestions_text = get_ai_suggestions("Smart City & Mobility data")
        return jsonify({
            "success": True,
            "suggestions": suggestions_text
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route('/api/ai/insights', methods=['GET'])
def get_insights():
    """Get AI insights about the smart city data"""
    try:
        # Get stats for context
        stats_query = """
        PREFIX smartcity: <http://example.org/smartcity#>
        PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        SELECT 
            (COUNT(DISTINCT ?user) as ?totalUsers)
            (COUNT(DISTINCT ?transport) as ?totalTransports)
            (COUNT(DISTINCT ?event) as ?totalEvents)
        WHERE {
            OPTIONAL { ?user rdf:type/rdfs:subClassOf* smartcity:Utilisateur }
            OPTIONAL { ?transport rdf:type/rdfs:subClassOf* smartcity:Transport }
            OPTIONAL { ?event rdf:type/rdfs:subClassOf* smartcity:EvenementDeCirculation }
        }
        """
        
        results = g.query(stats_query)
        data_summary = ""
        for row in results:
            data_summary = f"Users: {row.totalUsers}, Transports: {row.totalTransports}, Events: {row.totalEvents}"
        
        insights = get_smart_city_insights(data_summary)
        
        return jsonify({
            "success": True,
            "insights": insights
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

# ==================== AUTHENTICATION ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user in the RDF database"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not username or not email or not password:
            return jsonify({'success': False, 'error': 'All fields are required'}), 400
        
        # Check if username already exists
        query = f"""
        SELECT ?user WHERE {{
            ?user ont:Nom "{username}" .
        }}
        """
        results = g.query(query)
        if len(list(results)) > 0:
            return jsonify({'success': False, 'error': 'Username already exists'}), 400
        
        # Check if email already exists
        query = f"""
        SELECT ?user WHERE {{
            ?user ont:Email "{email}" .
        }}
        """
        results = g.query(query)
        if len(list(results)) > 0:
            return jsonify({'success': False, 'error': 'Email already exists'}), 400
        
        # Create new user
        user_count = len(list(g.subjects(RDF.type, ONT.Citoyen))) + len(list(g.subjects(RDF.type, ONT.Touriste)))
        user_id = f"Utilisateur_{user_count + 1}"
        user_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{user_id}")
        
        # Add user triples
        g.add((user_uri, RDF.type, ONT.Citoyen))
        g.add((user_uri, ONT.Nom, Literal(username)))
        g.add((user_uri, ONT.Email, Literal(email)))
        g.add((user_uri, ONT.MotDePasse, Literal(password)))  # In production, use hashing!
        g.add((user_uri, ONT.Age, Literal(25, datatype=XSD.decimal)))  # Default age
        
        save_graph()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': user_id,
                'username': username,
                'email': email
            }
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user by validating credentials against RDF database"""
    try:
        data = request.json
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password are required'}), 400
        
        # Query for user with matching username and password
        query = f"""
        SELECT ?user ?email ?age WHERE {{
            ?user ont:Nom "{username}" .
            ?user ont:MotDePasse "{password}" .
            OPTIONAL {{ ?user ont:Email ?email }}
            OPTIONAL {{ ?user ont:Age ?age }}
        }}
        """
        results = list(g.query(query))
        
        if len(results) == 0:
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401
        
        # User found
        user_data = results[0]
        user_uri = str(user_data[0])
        user_id = user_uri.split('#')[-1]
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user_id,
                'username': username,
                'email': str(user_data[1]) if user_data[1] else '',
                'age': int(user_data[2]) if user_data[2] else 0
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/upload/profile-image', methods=['POST'])
def upload_user_profile_image():
    """Upload user profile image to Cloudinary"""
    try:
        data = request.json
        user_id = data.get('user_id')
        image_data = data.get('image_data')
        
        if not user_id or not image_data:
            return jsonify({'success': False, 'error': 'user_id and image_data are required'}), 400
        
        # Upload to Cloudinary
        result = upload_profile_image(image_data, user_id)
        
        if 'error' in result:
            return jsonify({'success': False, 'error': result['error']}), 400
        
        # Update user's image URL in RDF
        from rdflib import Literal, URIRef
        user_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{user_id}")
        
        # Remove old image URL
        g.remove((user_uri, ONT.ImageURL, None))
        
        # Add new image URL
        g.add((user_uri, ONT.ImageURL, Literal(result['url'])))
        save_graph()
        
        return jsonify({
            'success': True,
            'url': result['url'],
            'public_id': result['public_id']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/upload/transport-image', methods=['POST'])
def upload_transport_image_endpoint():
    """Upload transport image to Cloudinary"""
    try:
        data = request.json
        transport_id = data.get('transport_id')
        image_data = data.get('image_data')
        
        if not transport_id or not image_data:
            return jsonify({'success': False, 'error': 'transport_id and image_data are required'}), 400
        
        # Upload to Cloudinary  
        from cloudinary_helper import upload_station_image
        result = upload_station_image(image_data, transport_id)  # Reuse station upload function
        
        if 'error' in result:
            return jsonify({'success': False, 'error': result['error']}), 400
        
        return jsonify({
            'success': True,
            'url': result['url'],
            'public_id': result['public_id']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/upload/station-image', methods=['POST'])
def upload_station_image_endpoint():
    """Upload station image to Cloudinary"""
    try:
        data = request.json
        station_id = data.get('station_id')
        image_data = data.get('image_data')
        
        if not station_id or not image_data:
            return jsonify({'success': False, 'error': 'station_id and image_data are required'}), 400
        
        # Upload to Cloudinary
        result = upload_station_image(image_data, station_id)
        
        if 'error' in result:
            return jsonify({'success': False, 'error': result['error']}), 400
        
        # Update station's image URL in RDF
        from rdflib import Literal, URIRef
        station_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{station_id}")
        
        # Remove old image URL
        g.remove((station_uri, ONT.ImageURL, None))
        
        # Add new image URL
        g.add((station_uri, ONT.ImageURL, Literal(result['url'])))
        save_graph()
        
        return jsonify({
            'success': True,
            'url': result['url'],
            'public_id': result['public_id']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/upload/event-image', methods=['POST'])
def upload_event_image_endpoint():
    """Upload event image to Cloudinary"""
    try:
        data = request.json
        event_id = data.get('event_id')
        image_data = data.get('image_data')
        
        if not event_id or not image_data:
            return jsonify({'success': False, 'error': 'event_id and image_data are required'}), 400
        
        # Upload to Cloudinary - reuse station upload function
        result = upload_station_image(image_data, event_id)
        
        if 'error' in result:
            return jsonify({'success': False, 'error': result['error']}), 400
        
        return jsonify({
            'success': True,
            'url': result['url'],
            'public_id': result['public_id']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/ai/related-queries', methods=['POST'])
def get_related_queries():
    """Get related query suggestions based on current query"""
    data = request.get_json()
    current_query = data.get('query', '')
    
    if not current_query:
        return jsonify({"success": False, "error": "No query provided"}), 400
    
    try:
        related = suggest_related_queries(current_query)
        return jsonify({
            "success": True,
            "relatedQueries": related
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

# ==================== CRUD OPERATIONS ====================

def save_graph():
    """Helper function to save the graph to RDF file"""
    try:
        g.serialize(destination=rdf_file, format='xml')
        return True
    except Exception as e:
        print(f"Error saving graph: {e}")
        return False

# ========== USER CRUD ==========
@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        
        # Generate unique ID
        user_count = len(list(g.subjects(RDF.type, ONT.Citoyen))) + len(list(g.subjects(RDF.type, ONT.Touriste)))
        user_id = f"Utilisateur_{user_count + 1}"
        user_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{user_id}")
        
        # Determine user type
        user_type = ONT.Citoyen if data.get('type') == 'Citoyen' else ONT.Touriste
        
        # Add triples
        g.add((user_uri, RDF.type, user_type))
        g.add((user_uri, ONT.Nom, Literal(data['nom'])))
        g.add((user_uri, ONT.Age, Literal(int(data['age']), datatype=XSD.decimal)))
        g.add((user_uri, ONT.Email, Literal(data['email'])))
        
        if data.get('carteAbonnement'):
            g.add((user_uri, ONT.CarteAbonnement, Literal(data['carteAbonnement'] == 'true', datatype=XSD.boolean)))
        
        # Save to file
        save_graph()
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'id': user_id
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """Update an existing user"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        user_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{user_id}")
        
        # Check if user exists
        if not (user_uri, RDF.type, None) in g:
            return jsonify({'error': 'User not found'}), 404
        
        # Remove old properties
        g.remove((user_uri, ONT.Nom, None))
        g.remove((user_uri, ONT.Age, None))
        g.remove((user_uri, ONT.Email, None))
        g.remove((user_uri, ONT.CarteAbonnement, None))
        
        # Add new properties
        g.add((user_uri, ONT.Nom, Literal(data['nom'])))
        g.add((user_uri, ONT.Age, Literal(int(data['age']), datatype=XSD.decimal)))
        g.add((user_uri, ONT.Email, Literal(data['email'])))
        
        if data.get('carteAbonnement'):
            g.add((user_uri, ONT.CarteAbonnement, Literal(data['carteAbonnement'] == 'true', datatype=XSD.boolean)))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'User updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user"""
    try:
        from rdflib import URIRef
        user_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{user_id}")
        
        # Check if user exists
        if not (user_uri, RDF.type, None) in g:
            return jsonify({'error': 'User not found'}), 404
        
        # Remove all triples related to this user
        g.remove((user_uri, None, None))
        g.remove((None, None, user_uri))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'User deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ========== TRANSPORT CRUD ==========
@app.route('/api/transports', methods=['POST'])
def create_transport():
    """Create a new transport"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        
        # Generate unique ID
        transport_count = len(list(g.subjects(RDF.type, ONT.Bus))) + len(list(g.subjects(RDF.type, ONT.Métro)))
        transport_id = f"{data.get('type', 'Transport')}_{transport_count + 1}"
        transport_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{transport_id}")
        
        # Determine transport type
        type_map = {
            'Bus': ONT.Bus,
            'Métro': ONT.Métro,
            'Vélo': ONT.Vélo,
            'VoiturePartagée': ONT.VoiturePartagée,
            'Trottinette': ONT.Trottinette
        }
        transport_type = type_map.get(data.get('type'), ONT.Bus)
        
        # Add triples
        g.add((transport_uri, RDF.type, transport_type))
        if data.get('nom'):
            g.add((transport_uri, ONT.Nom, Literal(data['nom'])))
        if data.get('capacite'):
            g.add((transport_uri, ONT.Capacite, Literal(int(data['capacite']), datatype=XSD.decimal)))
        if data.get('immatriculation'):
            g.add((transport_uri, ONT.Immatriculation, Literal(data['immatriculation'])))
        if data.get('vitesseMax'):
            g.add((transport_uri, ONT.VitesseMax, Literal(int(data['vitesseMax']), datatype=XSD.decimal)))
        if 'electrique' in data:
            g.add((transport_uri, ONT.estElectrique, Literal(data['electrique'] == 'true', datatype=XSD.boolean)))
        if data.get('imageUrl'):
            g.add((transport_uri, ONT.ImageURL, Literal(data['imageUrl'])))
        
        save_graph()
        
        return jsonify({
            'success': True,
            'message': 'Transport created successfully',
            'id': transport_id
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/transports/<transport_id>', methods=['PUT'])
def update_transport(transport_id):
    """Update an existing transport"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        transport_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{transport_id}")
        
        if not (transport_uri, RDF.type, None) in g:
            return jsonify({'error': 'Transport not found'}), 404
        
        # Remove old properties
        g.remove((transport_uri, ONT.Nom, None))
        g.remove((transport_uri, ONT.Capacite, None))
        g.remove((transport_uri, ONT.Immatriculation, None))
        g.remove((transport_uri, ONT.VitesseMax, None))
        g.remove((transport_uri, ONT.estElectrique, None))
        g.remove((transport_uri, ONT.ImageURL, None))
        
        # Add new properties
        if data.get('nom'):
            g.add((transport_uri, ONT.Nom, Literal(data['nom'])))
        if data.get('capacite'):
            g.add((transport_uri, ONT.Capacite, Literal(int(data['capacite']), datatype=XSD.decimal)))
        if data.get('immatriculation'):
            g.add((transport_uri, ONT.Immatriculation, Literal(data['immatriculation'])))
        if data.get('vitesseMax'):
            g.add((transport_uri, ONT.VitesseMax, Literal(int(data['vitesseMax']), datatype=XSD.decimal)))
        if 'electrique' in data:
            g.add((transport_uri, ONT.estElectrique, Literal(data['electrique'] == 'true', datatype=XSD.boolean)))
        if data.get('imageUrl'):
            g.add((transport_uri, ONT.ImageURL, Literal(data['imageUrl'])))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'Transport updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/transports/<transport_id>', methods=['DELETE'])
def delete_transport(transport_id):
    """Delete a transport"""
    try:
        from rdflib import URIRef
        transport_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{transport_id}")
        
        if not (transport_uri, RDF.type, None) in g:
            return jsonify({'error': 'Transport not found'}), 404
        
        g.remove((transport_uri, None, None))
        g.remove((None, None, transport_uri))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'Transport deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ========== STATION CRUD ==========
@app.route('/api/stations', methods=['POST'])
def create_station():
    """Create a new station"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        
        station_count = len(list(g.subjects(RDF.type, ONT.StationBus))) + len(list(g.subjects(RDF.type, ONT.StationMétro)))
        station_id = f"Station_{station_count + 1}"
        station_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{station_id}")
        
        # Determine station type
        type_map = {
            'StationBus': ONT.StationBus,
            'StationMétro': ONT.StationMétro,
            'Parking': ONT.Parking
        }
        station_type = type_map.get(data.get('type'), ONT.StationBus)
        
        g.add((station_uri, RDF.type, station_type))
        if data.get('nom'):
            g.add((station_uri, ONT.aNomStation, Literal(data['nom'])))
        if data.get('latitude'):
            g.add((station_uri, ONT.aLatitude, Literal(float(data['latitude']), datatype=XSD.decimal)))
        if data.get('longitude'):
            g.add((station_uri, ONT.aLongitude, Literal(float(data['longitude']), datatype=XSD.decimal)))
        
        save_graph()
        
        return jsonify({
            'success': True,
            'message': 'Station created successfully',
            'id': station_id
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stations/<station_id>', methods=['PUT'])
def update_station(station_id):
    """Update an existing station"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        station_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{station_id}")
        
        if not (station_uri, RDF.type, None) in g:
            return jsonify({'error': 'Station not found'}), 404
        
        g.remove((station_uri, ONT.aNomStation, None))
        g.remove((station_uri, ONT.aLatitude, None))
        g.remove((station_uri, ONT.aLongitude, None))
        
        if data.get('nom'):
            g.add((station_uri, ONT.aNomStation, Literal(data['nom'])))
        if data.get('latitude'):
            g.add((station_uri, ONT.aLatitude, Literal(float(data['latitude']), datatype=XSD.decimal)))
        if data.get('longitude'):
            g.add((station_uri, ONT.aLongitude, Literal(float(data['longitude']), datatype=XSD.decimal)))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'Station updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stations/<station_id>', methods=['DELETE'])
def delete_station(station_id):
    """Delete a station"""
    try:
        from rdflib import URIRef
        station_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{station_id}")
        
        if not (station_uri, RDF.type, None) in g:
            return jsonify({'error': 'Station not found'}), 404
        
        g.remove((station_uri, None, None))
        g.remove((None, None, station_uri))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'Station deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ========== EVENT CRUD ==========
@app.route('/api/events', methods=['POST'])
def create_event():
    """Create a new event"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        
        event_count = len(list(g.subjects(RDF.type, ONT.Accident))) + len(list(g.subjects(RDF.type, ONT.Embouteillage)))
        event_id = f"{data.get('type', 'Event')}_{event_count + 1}"
        event_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{event_id}")
        
        type_map = {
            'Accident': ONT.Accident,
            'Embouteillage': ONT.Embouteillage,
            'Travaux': SMARTCITY.EvenementDeCirculation  # Generic type for construction
        }
        event_type = type_map.get(data.get('type'), ONT.Accident)
        
        g.add((event_uri, RDF.type, event_type))
        if data.get('nom'):
            g.add((event_uri, ONT.Nom, Literal(data['nom'])))
        if data.get('description'):
            g.add((event_uri, ONT.aDescription, Literal(data['description'])))
        if data.get('gravite'):
            g.add((event_uri, ONT.aGravite, Literal(int(data['gravite']), datatype=XSD.int)))
        if data.get('date'):
            g.add((event_uri, ONT.aDateEvenement, Literal(data['date'], datatype=XSD.dateTime)))
        if data.get('imageUrl'):
            g.add((event_uri, ONT.imageUrl, Literal(data['imageUrl'])))
        
        save_graph()
        
        return jsonify({
            'success': True,
            'message': 'Event created successfully',
            'id': event_id
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    """Update an existing event"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        event_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{event_id}")
        
        if not (event_uri, RDF.type, None) in g:
            return jsonify({'error': 'Event not found'}), 404
        
        g.remove((event_uri, ONT.Nom, None))
        g.remove((event_uri, ONT.aDescription, None))
        g.remove((event_uri, ONT.aGravite, None))
        g.remove((event_uri, ONT.aDateEvenement, None))
        g.remove((event_uri, ONT.imageUrl, None))
        
        if data.get('nom'):
            g.add((event_uri, ONT.Nom, Literal(data['nom'])))
        if data.get('description'):
            g.add((event_uri, ONT.aDescription, Literal(data['description'])))
        if data.get('gravite'):
            g.add((event_uri, ONT.aGravite, Literal(int(data['gravite']), datatype=XSD.int)))
        if data.get('date'):
            g.add((event_uri, ONT.aDateEvenement, Literal(data['date'], datatype=XSD.dateTime)))
        if data.get('imageUrl'):
            g.add((event_uri, ONT.imageUrl, Literal(data['imageUrl'])))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'Event updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an event"""
    try:
        from rdflib import URIRef
        event_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{event_id}")
        
        if not (event_uri, RDF.type, None) in g:
            return jsonify({'error': 'Event not found'}), 404
        
        g.remove((event_uri, None, None))
        g.remove((None, None, event_uri))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'Event deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ========== ZONE CRUD ==========
@app.route('/api/zones', methods=['POST'])
def create_zone():
    """Create a new zone"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        
        zone_count = len(list(g.subjects(RDF.type, ONT.CentreVille))) + len(list(g.subjects(RDF.type, ONT.Banlieue)))
        zone_id = f"Zone_{zone_count + 1}"
        zone_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{zone_id}")
        
        type_map = {
            'CentreVille': ONT.CentreVille,
            'Banlieue': ONT.Banlieue,
            'ZoneIndustrielle': ONT.ZoneIndustrielle
        }
        zone_type = type_map.get(data.get('type'), ONT.CentreVille)
        
        g.add((zone_uri, RDF.type, zone_type))
        if data.get('nom'):
            g.add((zone_uri, ONT.Nom, Literal(data['nom'])))
        if data.get('superficie'):
            g.add((zone_uri, ONT.Superficie, Literal(float(data['superficie']), datatype=XSD.decimal)))
        if data.get('population'):
            g.add((zone_uri, ONT.Population, Literal(int(data['population']), datatype=XSD.int)))
        if data.get('description'):
            g.add((zone_uri, ONT.aDescription, Literal(data['description'])))
        
        save_graph()
        
        return jsonify({
            'success': True,
            'message': 'Zone created successfully',
            'id': zone_id
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/zones/<zone_id>', methods=['PUT'])
def update_zone(zone_id):
    """Update an existing zone"""
    try:
        from rdflib import Literal, URIRef, XSD
        data = request.json
        zone_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{zone_id}")
        
        if not (zone_uri, RDF.type, None) in g:
            return jsonify({'error': 'Zone not found'}), 404
        
        g.remove((zone_uri, ONT.Nom, None))
        g.remove((zone_uri, ONT.Superficie, None))
        g.remove((zone_uri, ONT.Population, None))
        g.remove((zone_uri, ONT.aDescription, None))
        
        if data.get('nom'):
            g.add((zone_uri, ONT.Nom, Literal(data['nom'])))
        if data.get('superficie'):
            g.add((zone_uri, ONT.Superficie, Literal(float(data['superficie']), datatype=XSD.decimal)))
        if data.get('population'):
            g.add((zone_uri, ONT.Population, Literal(int(data['population']), datatype=XSD.int)))
        if data.get('description'):
            g.add((zone_uri, ONT.aDescription, Literal(data['description'])))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'Zone updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/zones/<zone_id>', methods=['DELETE'])
def delete_zone(zone_id):
    """Delete a zone"""
    try:
        from rdflib import URIRef
        zone_uri = URIRef(f"http://www.co-ode.org/ontologies/ont.owl#{zone_id}")
        
        if not (zone_uri, RDF.type, None) in g:
            return jsonify({'error': 'Zone not found'}), 404
        
        g.remove((zone_uri, None, None))
        g.remove((None, None, zone_uri))
        
        save_graph()
        
        return jsonify({'success': True, 'message': 'Zone deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/ai/recommend-stations', methods=['POST'])
def recommend_stations():
    """AI-powered station recommendation using Gemini API"""
    try:
        print("🤖 AI Recommendation Request Started")
        
        # Get existing stations from the RDF graph
        query = """
        PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        SELECT ?station ?nom ?latitude ?longitude ?type
        WHERE {
            ?station rdf:type ?stationType .
            FILTER(?stationType IN (ont:StationMétro, ont:StationBus, ont:Parking))
            ?station ont:aNomStation ?nom .
            OPTIONAL { ?station ont:aLatitude ?latitude }
            OPTIONAL { ?station ont:aLongitude ?longitude }
            BIND(STRAFTER(STR(?stationType), "#") AS ?type)
        }
        """
        
        results = g.query(query)
        existing_stations = []
        for row in results:
            existing_stations.append({
                'name': str(row.nom),
                'type': str(row.type),
                'latitude': float(row.latitude) if row.latitude else None,
                'longitude': float(row.longitude) if row.longitude else None
            })
        
        print(f"📍 Found {len(existing_stations)} existing stations")
        
        # Use Gemini to analyze and recommend new station locations
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ GEMINI_API_KEY not found in environment")
            return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500
        
        print(f"🔑 API Key found: {api_key[:10]}...")
        
        # Prepare the prompt for Gemini
        prompt = f"""Based on these existing stations in a smart city:
{existing_stations}

Analyze the coverage and recommend 3 optimal locations for new stations to improve urban mobility.
For each recommendation, provide:
1. Station type (StationMétro, StationBus, or Parking)
2. Suggested name
3. Approximate latitude and longitude (realistic coordinates for Tunisia/North Africa)
4. Brief reason for this location
5. Priority level (high, medium, or low)

Respond ONLY with a valid JSON array in this exact format:
[
  {{
    "type": "StationBus",
    "name": "Station Name",
    "latitude": 36.1234,
    "longitude": 10.5678,
    "reason": "Brief explanation",
    "priority": "high"
  }}
]

No markdown, no code blocks, just the JSON array."""
        
        # Try different API endpoints for Gemini free tier
        # Based on actual available models from API
        model_configs = [
            ('gemini-2.5-flash', 'v1beta'),          # Stable release - BEST FOR FREE TIER
            ('gemini-2.0-flash', 'v1beta'),          # Also stable
            ('gemini-flash-latest', 'v1beta'),       # Latest version
            ('gemini-2.5-flash-lite', 'v1beta'),     # Lighter version
            ('gemini-2.0-flash-lite', 'v1beta'),     # Lighter 2.0
        ]
        
        response = None
        last_error = None
        
        for model_name, api_version in model_configs:
            try:
                print(f"🔄 Trying model: {model_name} with API version: {api_version}")
                
                # Call Gemini API with appropriate version
                url = f'https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent?key={api_key}'
                
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }],
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 2048,
                    }
                }
                
                print(f"🌐 Calling: {url[:80]}...")
                response = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=30)
                
                print(f"📡 Response status: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"✅ Success with model: {model_name}")
                    break
                else:
                    last_error = f"Model {model_name} returned {response.status_code}: {response.text[:200]}"
                    print(f"⚠️ {last_error}")
                    
            except Exception as e:
                last_error = f"Model {model_name} failed: {str(e)}"
                print(f"❌ {last_error}")
                continue
        
        if not response or response.status_code != 200:
            error_msg = last_error or f'All models failed. Last response: {response.text[:500] if response else "No response"}'
            print(f"❌ Final error: {error_msg}")
            return jsonify({
                'error': 'Gemini API error',
                'details': error_msg,
                'status_code': response.status_code if response else 'N/A'
            }), 500
        
        result = response.json()
        print(f"📦 Got response from Gemini")
        
        # Extract the text from Gemini response
        if 'candidates' in result and len(result['candidates']) > 0:
            text = result['candidates'][0]['content']['parts'][0]['text']
            print(f"📝 AI Response length: {len(text)} characters")
            
            # Clean up the response (remove markdown if present)
            text = text.strip()
            if text.startswith('```json'):
                text = text.replace('```json', '').replace('```', '').strip()
            elif text.startswith('```'):
                text = text.replace('```', '').strip()
            
            print(f"🧹 Cleaned response preview: {text[:100]}...")
            
            # Parse the JSON recommendations
            recommendations = json.loads(text)
            
            print(f"✅ Successfully parsed {len(recommendations)} recommendations")
            
            return jsonify({
                'success': True,
                'recommendations': recommendations
            })
        else:
            print(f"❌ No candidates in response: {result}")
            return jsonify({'error': 'No response from Gemini API', 'details': str(result)}), 500
            
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse AI response: {str(e)}"
        print(f"❌ {error_msg}")
        return jsonify({
            'error': 'Failed to parse AI response',
            'details': str(e),
            'raw_response': text[:500] if 'text' in locals() else 'N/A'
        }), 500
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"❌ {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to get AI recommendations',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='127.0.0.1')
