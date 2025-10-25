import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables. Please check your .env file.")

genai.configure(api_key=GEMINI_API_KEY)

# Initialize Gemini model
model = genai.GenerativeModel('gemini-pro')

def generate_sparql_from_natural_language(user_query):
    """
    Convert natural language query to SPARQL using Gemini AI
    """
    prompt = f"""
You are an expert in SPARQL queries for a Smart City & Mobility ontology.

The ontology has these main classes:
- smartcity:Transport (Bus, Métro, Vélo, VoiturePartagée, Trottinette)
- smartcity:Utilisateur (Citoyen, Touriste)
- smartcity:Station (StationMétro, StationBus, Parking)
- smartcity:Trajet
- smartcity:ZoneUrbaine (CentreVille, Banlieue, ZoneIndustrielle)
- smartcity:EvenementDeCirculation (Embouteillage, Accident)
- smartcity:Capteur (CapteurTrafic, CapteurQualiteAir)
- smartcity:Ticket (TicketSimple, AbonnementMensuel)
- smartcity:Energie (Électrique, Diesel, Hybride)

Object Properties:
- utiliseTransport (Utilisateur → Transport)
- circuleDans (Transport → ZoneUrbaine)
- partDe / arriveA (Trajet → Station)
- impacte (EvenementDeCirculation → Trajet)
- mesure (Capteur → EvenementDeCirculation)
- aTicket (Utilisateur → Ticket)
- alimentePar (Transport → Energie)
- connecteA (Station → Station)

Data Properties:
- ont:Nom, ont:Age, ont:Email (for Utilisateur)
- ont:Capacite, ont:Immatriculation, ont:estElectrique (for Transport)
- ont:aNomStation, ont:aLatitude, ont:aLongitude (for Station)
- ont:aGravite, ont:aDateEvenement (for EvenementDeCirculation)
- ont:aPrixTicket, ont:aValide (for Ticket)

Namespaces:
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

User question: "{user_query}"

Generate a SPARQL query that answers this question. Return ONLY the SPARQL query, no explanations.
"""
    
    try:
        response = model.generate_content(prompt)
        sparql_query = response.text.strip()
        
        # Clean up the response (remove markdown code blocks if present)
        if sparql_query.startswith('```sparql'):
            sparql_query = sparql_query.replace('```sparql', '').replace('```', '').strip()
        elif sparql_query.startswith('```'):
            sparql_query = sparql_query.replace('```', '').strip()
        
        return sparql_query
    except Exception as e:
        return f"Error generating SPARQL: {str(e)}"


def get_ai_suggestions(context):
    """
    Get AI suggestions based on current context
    """
    prompt = f"""
You are a helpful assistant for a Smart City & Mobility semantic web application.

Based on this context: {context}

Provide 3 useful SPARQL query suggestions that users might want to execute.
Each suggestion should be on a new line, formatted as:
"Description: Brief query description"

Keep suggestions practical and relevant to smart city mobility.
"""
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Error getting suggestions: {str(e)}"


def explain_sparql_results(query, results_count):
    """
    Generate human-readable explanation of SPARQL query results
    """
    prompt = f"""
Explain in 1-2 simple sentences what this SPARQL query does and what the results mean:

Query: {query}
Number of results found: {results_count}

Keep the explanation simple and user-friendly in French.
"""
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return "Résultats de la requête SPARQL"


def get_smart_city_insights(data_summary):
    """
    Generate AI insights about the smart city data
    """
    prompt = f"""
Based on this Smart City & Mobility data summary:
{data_summary}

Provide 2-3 actionable insights or observations about the urban mobility situation.
Write in French, keep it concise and professional.
"""
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return "Impossible de générer des insights pour le moment."


def suggest_related_queries(current_query):
    """
    Suggest related queries based on the current one
    """
    prompt = f"""
A user just executed this SPARQL query:
{current_query}

Suggest 2 related follow-up queries they might want to run next.
Format each as a valid SPARQL query for the Smart City ontology.
Separate them with "---"
"""
    
    try:
        response = model.generate_content(prompt)
        suggestions = response.text.strip().split('---')
        return [s.strip() for s in suggestions if s.strip()]
    except Exception as e:
        return []
