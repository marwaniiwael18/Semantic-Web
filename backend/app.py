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
from cloudinary_helper import upload_profile_image, delete_profile_image, upload_station_image

app = Flask(__name__)

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
        
        if data.get('nom'):
            g.add((event_uri, ONT.Nom, Literal(data['nom'])))
        if data.get('description'):
            g.add((event_uri, ONT.aDescription, Literal(data['description'])))
        if data.get('gravite'):
            g.add((event_uri, ONT.aGravite, Literal(int(data['gravite']), datatype=XSD.int)))
        if data.get('date'):
            g.add((event_uri, ONT.aDateEvenement, Literal(data['date'], datatype=XSD.dateTime)))
        
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

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='127.0.0.1')
