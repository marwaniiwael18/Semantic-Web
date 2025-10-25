from flask import Flask, request, jsonify
from flask_cors import CORS
from rdflib import Graph, Namespace, RDF, RDFS, OWL
from rdflib.plugins.sparql import prepareQuery
import os
import json
from datetime import datetime
from ai_helper import (
    generate_sparql_from_natural_language,
    get_ai_suggestions,
    explain_sparql_results,
    get_smart_city_insights,
    suggest_related_queries
)

app = Flask(__name__)
CORS(app)

# Load RDF ontology
g = Graph()
rdf_file = os.path.join(os.path.dirname(__file__), '..', 'Projet.rdf')
g.parse(rdf_file, format='xml')

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
        (COUNT(DISTINCT ?trajet) as ?totalTrajets)
        (COUNT(DISTINCT ?event) as ?totalEvents)
    WHERE {
        OPTIONAL { ?user rdf:type/rdfs:subClassOf* smartcity:Utilisateur }
        OPTIONAL { ?transport rdf:type/rdfs:subClassOf* smartcity:Transport }
        OPTIONAL { ?station rdf:type/rdfs:subClassOf* smartcity:Station }
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
    
    SELECT ?transport ?nom ?type ?capacite ?immat ?vitesse ?electrique ?zone ?energie
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
                "energie": str(row.energie).split('#')[-1] if row.energie else None
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
    
    SELECT ?event ?nom ?type ?description ?date ?gravite ?trajet ?zone
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
            "zone": str(row.zone).split('#')[-1] if row.zone else None
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
    
    try:
        results = g.query(query_string)
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
        # Generate SPARQL from natural language using Gemini AI
        sparql_query = generate_sparql_from_natural_language(user_question)
        
        # Execute the generated query
        results = g.query(sparql_query)
        result_list = []
        
        for row in results:
            result_dict = {}
            for var in results.vars:
                value = row[var]
                if value:
                    result_dict[str(var)] = str(value)
            result_list.append(result_dict)
        
        # Get explanation of results
        explanation = explain_sparql_results(sparql_query, len(result_list))
        
        return jsonify({
            "success": True,
            "question": user_question,
            "generatedQuery": sparql_query,
            "results": result_list,
            "count": len(result_list),
            "explanation": explanation
        })
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
