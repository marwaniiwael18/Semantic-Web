import requests
import time
import json

API_BASE = 'http://127.0.0.1:5001/api'

queries = [
    ("List accidents with date datatype and gravite",
     "PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>\nPREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n\nSELECT ?accident ?date ?datatype ?gravite\nWHERE {\n  ?accident rdf:type ont:Accident .\n  OPTIONAL { ?accident ont:aDateEvenement ?date . BIND(DATATYPE(?date) AS ?datatype) }\n  OPTIONAL { ?accident ont:aGravite ?gravite }\n}\nORDER BY ?date"),

    ("Robust string-date comparison",
     "PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>\nPREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n\nSELECT ?accident ?date ?gravite\nWHERE {\n  ?accident rdf:type ont:Accident .\n  ?accident ont:aDateEvenement ?date .\n  ?accident ont:aGravite ?gravite .\n  FILTER ( STR(?date) >= \"2025-10-01\" && STR(?date) <= \"2025-10-27\" && ?gravite >= 3 )\n}\nORDER BY ?date"),

    ("Subclass-aware type path",
     "PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>\nPREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\nSELECT ?accident ?date ?gravite\nWHERE {\n  ?accident rdf:type/rdfs:subClassOf* ont:Accident .\n  OPTIONAL { ?accident ont:aDateEvenement ?date }\n  OPTIONAL { ?accident ont:aGravite ?gravite }\n  FILTER ( ?gravite >= 3 )\n}\nORDER BY ?date")
]


def post_query(q):
    url = f"{API_BASE}/query"
    try:
        r = requests.post(url, json={"query": q}, timeout=10)
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text}
        return r.status_code, data
    except Exception as e:
        return None, {"error": str(e)}


if __name__ == '__main__':
    print('Waiting 2s for server to boot...')
    time.sleep(2)
    for title, q in queries:
        print('\n-----')
        print('Query:', title)
        print(q)
        status, data = post_query(q)
        print('Status:', status)
        print('Response:')
        print(json.dumps(data, indent=2, ensure_ascii=False))
