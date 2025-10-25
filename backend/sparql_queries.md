# Comprehensive SPARQL Queries for Smart City & Mobility

## 1. Query: All Citizens (Citoyens)
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?citoyen ?nom ?age ?email
WHERE {
    ?citoyen rdf:type ont:Citoyen .
    OPTIONAL { ?citoyen ont:Nom ?nom }
    OPTIONAL { ?citoyen ont:Age ?age }
    OPTIONAL { ?citoyen ont:Email ?email }
}
```

## 2. Query: Electric Transports Only
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?transport ?nom ?type
WHERE {
    ?transport rdf:type ?transportType .
    ?transportType rdfs:subClassOf* smartcity:Transport .
    ?transport ont:estElectrique true .
    OPTIONAL { ?transport ont:Nom ?nom }
    BIND(STRAFTER(STR(?transportType), "#") AS ?type)
}
```

## 3. Query: Users Using Electric Vehicles
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?user ?userName ?transport ?transportName
WHERE {
    ?user smartcity:utiliseTransport ?transport .
    ?transport ont:estElectrique true .
    ?user ont:Nom ?userName .
    ?transport ont:Nom ?transportName .
}
```

## 4. Query: All Transports in CentreVille
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?transport ?nom ?type
WHERE {
    ?transport smartcity:circuleDans ?zone .
    ?zone rdf:type ont:CentreVille .
    ?transport rdf:type ?transportType .
    ?transportType rdfs:subClassOf* smartcity:Transport .
    OPTIONAL { ?transport ont:Nom ?nom }
    BIND(STRAFTER(STR(?transportType), "#") AS ?type)
}
```

## 5. Query: Count Transports by Type
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?type (COUNT(?transport) as ?count)
WHERE {
    ?transport rdf:type ?transportType .
    ?transportType rdfs:subClassOf* smartcity:Transport .
    FILTER(?transportType != smartcity:Transport)
    BIND(STRAFTER(STR(?transportType), "#") AS ?type)
}
GROUP BY ?type
ORDER BY DESC(?count)
```

## 6. Query: Stations with Coordinates
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?station ?nom ?latitude ?longitude
WHERE {
    ?station rdf:type ?stationType .
    ?stationType rdfs:subClassOf* smartcity:Station .
    ?station ont:aNomStation ?nom .
    ?station ont:aLatitude ?latitude .
    ?station ont:aLongitude ?longitude .
}
```

## 7. Query: Events Impacting Trajets
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?event ?eventName ?trajet ?trajetName ?gravite
WHERE {
    ?event smartcity:impacte ?trajet .
    ?event rdf:type ?eventType .
    ?eventType rdfs:subClassOf* smartcity:EvenementDeCirculation .
    OPTIONAL { ?event ont:Nom ?eventName }
    OPTIONAL { ?trajet ont:Nom ?trajetName }
    OPTIONAL { ?event ont:aGravite ?gravite }
}
ORDER BY DESC(?gravite)
```

## 8. Query: Valid Tickets
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?ticket ?user ?userName ?prix ?valid
WHERE {
    ?user smartcity:aTicket ?ticket .
    ?ticket ont:aValide ?valid .
    ?ticket ont:aPrixTicket ?prix .
    ?user ont:Nom ?userName .
    FILTER(?valid = true)
}
```

## 9. Query: Transports by Energy Type
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?transport ?transportName ?energie ?energieType
WHERE {
    ?transport smartcity:alimentePar ?energie .
    ?energie rdf:type ?energieType .
    ?energieType rdfs:subClassOf* smartcity:Energie .
    OPTIONAL { ?transport ont:Nom ?transportName }
    OPTIONAL { ?energie ont:Nom ?energieNom }
}
```

## 10. Query: Users with Subscription (AbonnementMensuel)
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?user ?nom ?age ?ticket
WHERE {
    ?user smartcity:aTicket ?ticket .
    ?ticket rdf:type ont:AbonnementMensuel .
    ?user ont:Nom ?nom .
    OPTIONAL { ?user ont:Age ?age }
}
```

## 11. Query: High Capacity Transports (> 40 places)
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?transport ?nom ?capacite ?type
WHERE {
    ?transport ont:Capacite ?capacite .
    ?transport rdf:type ?transportType .
    ?transportType rdfs:subClassOf* smartcity:Transport .
    OPTIONAL { ?transport ont:Nom ?nom }
    FILTER(?capacite > 40)
    BIND(STRAFTER(STR(?transportType), "#") AS ?type)
}
ORDER BY DESC(?capacite)
```

## 12. Query: Citizens vs Tourists
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?type (COUNT(?user) as ?count)
WHERE {
    ?user rdf:type ?userType .
    { ?user rdf:type ont:Citoyen } UNION { ?user rdf:type ont:Touriste }
    BIND(STRAFTER(STR(?userType), "#") AS ?type)
}
GROUP BY ?type
```

## 13. Query: Connected Stations (Transitive)
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?station1 ?station2
WHERE {
    ?station1 smartcity:connecteA ?station2 .
    ?station1 ont:aNomStation ?nom1 .
    ?station2 ont:aNomStation ?nom2 .
}
```

## 14. Query: Average Ticket Price
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT (AVG(?prix) as ?avgPrice) (MIN(?prix) as ?minPrice) (MAX(?prix) as ?maxPrice)
WHERE {
    ?ticket rdf:type ?ticketType .
    ?ticketType rdfs:subClassOf* smartcity:Ticket .
    ?ticket ont:aPrixTicket ?prix .
}
```

## 15. Query: Trajets with Distance and Duration
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?trajet ?nom ?distance ?duree ?prix
WHERE {
    ?trajet rdf:type smartcity:Trajet .
    OPTIONAL { ?trajet ont:Nom ?nom }
    OPTIONAL { ?trajet ont:aDistance ?distance }
    OPTIONAL { ?trajet ont:aDuree ?duree }
    OPTIONAL { ?trajet ont:aPrix ?prix }
}
ORDER BY DESC(?distance)
```

## 16. Query: Capteurs Measuring Events
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?capteur ?capteurNom ?event ?eventNom ?eventType
WHERE {
    ?capteur smartcity:mesure ?event .
    ?capteur rdf:type ?capteurType .
    ?capteurType rdfs:subClassOf* smartcity:Capteur .
    ?event rdf:type ?eventType .
    ?eventType rdfs:subClassOf* smartcity:EvenementDeCirculation .
    OPTIONAL { ?capteur ont:Nom ?capteurNom }
    OPTIONAL { ?event ont:Nom ?eventNom }
}
```

## 17. Query: Recent Events (with dates)
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?event ?nom ?date ?gravite ?description
WHERE {
    ?event rdf:type ?eventType .
    ?eventType rdfs:subClassOf* smartcity:EvenementDeCirculation .
    ?event ont:aDateEvenement ?date .
    OPTIONAL { ?event ont:Nom ?nom }
    OPTIONAL { ?event ont:aGravite ?gravite }
    OPTIONAL { ?event ont:aDescription ?description }
}
ORDER BY DESC(?date)
```

## 18. Query: Zone with Most Transports
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?zone ?zoneNom (COUNT(?transport) as ?transportCount)
WHERE {
    ?transport smartcity:circuleDans ?zone .
    ?zone rdf:type ?zoneType .
    ?zoneType rdfs:subClassOf* smartcity:ZoneUrbaine .
    OPTIONAL { ?zone ont:Nom ?zoneNom }
}
GROUP BY ?zone ?zoneNom
ORDER BY DESC(?transportCount)
```

## 19. Query: Users by Age Group
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?user ?nom ?age ?ageGroup
WHERE {
    ?user rdf:type ?userType .
    ?userType rdfs:subClassOf* smartcity:Utilisateur .
    ?user ont:Age ?age .
    ?user ont:Nom ?nom .
    BIND(
        IF(?age < 18, "Mineur",
        IF(?age < 30, "Jeune",
        IF(?age < 60, "Adulte", "Senior")))
    AS ?ageGroup)
}
ORDER BY ?age
```

## 20. Query: Complete User Journey
```sparql
PREFIX smartcity: <http://example.org/smartcity#>
PREFIX ont: <http://www.co-ode.org/ontologies/ont.owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?user ?userName ?transport ?ticket ?ticketPrice ?valid
WHERE {
    ?user ont:Nom ?userName .
    ?user smartcity:utiliseTransport ?transport .
    ?user smartcity:aTicket ?ticket .
    OPTIONAL { ?ticket ont:aPrixTicket ?ticketPrice }
    OPTIONAL { ?ticket ont:aValide ?valid }
}
```
