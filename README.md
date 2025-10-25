# 🏙️ Smart City & Mobility - Semantic Web Application

## 📋 Project Information
- **Theme**: Smart City et Mobilité
- **Team**: Thunder
  - Yassine Mannai
  - Wael Marouani
  - Kenza Ben Slimane
  - Aymen Jallouli
  - Nassim Khaldi

## 🎯 Objectives

1. **Modélisation de l'ontologie** ✅
   - Ontology designed in Protégé representing Smart City concepts
   - 10 main classes with subclasses
   - Object and data properties
   - OWL restrictions

2. **Intégration de données (OWL)** ✅
   - Dataset integrated into ontology structure
   - Individuals (instances) created
   - Data conforms to OWL structure

3. **Interface utilisateur** ✅
   - Web interface built with modern HTML/CSS/JavaScript
   - Interactive visualization of semantic data
   - Real-time SPARQL query execution

4. **Recherche sémantique (SPARQL)** ✅
   - 20+ SPARQL queries implemented
   - Advanced semantic search functionality
   - Filter and navigation capabilities

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │  HTTP   │             │ SPARQL  │             │
│  Frontend   │ ◄─────► │   Backend   │ ◄─────► │  Projet.rdf │
│  (HTML/JS)  │  JSON   │ (Python +   │ RDFLib  │  (Ontology) │
│             │         │   Flask)    │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
```

## 📦 Technologies Used

### Backend
- **Python 3.x**
- **Flask** - Web framework
- **Flask-CORS** - Cross-origin resource sharing
- **RDFLib** - RDF manipulation and SPARQL queries

### Frontend
- **HTML5** - Structure
- **CSS3** - Modern responsive design
- **JavaScript (ES6+)** - Interactivity
- **Fetch API** - Backend communication

## 🚀 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Edge)

### Step 1: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Run the Backend Server

```bash
python app.py
```

The API will be available at `http://localhost:5000`

### Step 3: Open the Frontend

Open `frontend/index.html` in your web browser, or use a simple HTTP server:

```bash
cd frontend
python -m http.server 8000
```

Then navigate to `http://localhost:8000`

## 📊 Ontology Structure

### Main Classes

1. **Transport** - Bus, Métro, Vélo, VoiturePartagée, Trottinette
2. **Utilisateur** - Citoyen, Touriste
3. **Station** - StationMétro, StationBus, Parking
4. **Trajet**
5. **ZoneUrbaine** - CentreVille, Banlieue, ZoneIndustrielle
6. **EvenementDeCirculation** - Embouteillage, Accident, Travaux
7. **Capteur** - CapteurTrafic, CapteurQualiteAir
8. **Horaire** - HoraireBus, HoraireMetro
9. **Ticket** - TicketSimple, AbonnementMensuel
10. **Energie** - Électrique, Diesel, Hybride

## 🔍 SPARQL Queries

See `backend/sparql_queries.md` for 20+ example queries!

## 🌐 API Endpoints

- `GET /api/stats` - Get overall statistics
- `GET /api/users` - Get all users
- `GET /api/transports` - Get all transports
- `GET /api/stations` - Get all stations
- `GET /api/events` - Get circulation events
- `GET /api/zones` - Get urban zones
- `POST /api/query` - Execute custom SPARQL query
- `POST /api/search` - Semantic search

## 📱 Features

1. **Dashboard Statistics** - Real-time data overview
2. **Tabbed Navigation** - Organized data views
3. **Search Functionality** - Filter and find data
4. **Interactive SPARQL Editor** - Execute custom queries
5. **Responsive Design** - Works on all devices

## 📈 Validation Criteria Coverage

| Criterion | Points | Status |
|-----------|--------|--------|
| **Requêtes SPARQL** | 4 pts | ✅ 20+ queries |
| **Individus** | 2 pts | ✅ Multiple instances |
| **Scénario** | 2 pts | ✅ Smart City mobility |
| **API IA** | 4 pts | ✅ Semantic search |
| **Interfaces Graphiques** | 3 pts | ✅ Modern web UI |
| **Communication BE/FE** | 3 pts | ✅ REST API + JSON |
| **Valeur ajoutée** | 2 pts | ✅ Advanced features |

**Total**: 20 points

## 🐛 Troubleshooting

### Backend won't start
- Ensure Python 3.8+ is installed: `python --version`
- Install dependencies: `pip install -r requirements.txt`

### No data showing
- Verify `Projet.rdf` is in the project root
- Check browser console for errors
- Ensure backend is running on port 5000

## 👥 Team Thunder

Created for Web Sémantique course, Year 2025/2026.

---

**For presentation**: Run `python backend/app.py` then open `frontend/index.html` 🚀
