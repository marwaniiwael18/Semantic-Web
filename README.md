# 🏙️ Smart City & Mobility - Semantic Web Application

A comprehensive Smart City management platform built with semantic web technologies, featuring real-time CRUD operations, AI-powered natural language queries, interactive maps, and a beautiful React frontend.

## ✨ Key Highlights

- 🗺️ **Interactive Mapbox Dashboard** - Real-time visualization of stations and events
- 🤖 **AI-Powered Insights** - Google Gemini integration for natural language queries
- 📊 **Beautiful UI/UX** - Modern gradient designs with smooth animations
- 🔄 **Full CRUD Operations** - Complete Create, Read, Update, Delete for all entities
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🖼️ **Image Management** - Cloudinary integration for profile and transport images
- 🎯 **Real-time Stats** - Live dashboard with system analytics

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

## 🏗️ Project Structure

```
Semantic-Web/
├── backend/
│   ├── .env                    # Environment variables (API keys)
│   ├── app.py                  # Main Flask application
│   ├── ai_helper.py            # Google Gemini AI integration
│   ├── requirements.txt        # Python dependencies
│   └── sparql_queries.md       # SPARQL query documentation
├── frontend/
│   └── smart-city-app/         # React application
│       ├── public/
│       ├── src/
│       │   ├── components/     # React components
│       │   │   ├── Landing.js
│       │   │   ├── Login.js
│       │   │   ├── Register.js
│       │   │   ├── UserProfile.js
│       │   │   ├── Dashboard.js        # Enhanced dashboard with map
│       │   │   ├── UserManagement.js
│       │   │   ├── TransportManagement.js
│       │   │   ├── StationManagement.js
│       │   │   ├── EventManagement.js
│       │   │   └── ZoneManagement.js
│       │   ├── styles/
│       │   │   ├── Auth.css
│       │   │   └── Landing.css
│       │   ├── App.js
│       │   ├── App.css
│       │   └── index.js
│       └── package.json
├── Projet.rdf                  # RDF/OWL ontology database
├── .gitignore
└── README.md
```

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │  HTTP   │             │ SPARQL  │             │
│  Frontend   │ ◄─────► │   Backend   │ ◄─────► │  Projet.rdf │
│  (React 18) │  JSON   │ (Python 3.13│ RDFLib  │  (Ontology) │
│             │         │ + Flask 3.0)│         │             │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │
       │                       │
       ▼                       ▼
  Port 3000              Port 5001
```

## 📦 Technologies Used

### Backend
- **Python 3.13** - Core runtime
- **Flask 3.0** - REST API framework
- **RDFLib 7.0** - RDF/OWL manipulation
- **SPARQL** - Semantic queries
- **Google Gemini AI** - Natural language processing
- **Flask-CORS** - Cross-origin resource sharing
- **python-dotenv** - Environment variable management

### Frontend
- **React 18** - UI framework
- **Mapbox GL JS** - Interactive maps
- **CSS3** - Modern styling with animations
- **JavaScript ES6+** - Core logic
- **Fetch API** - REST communication
- **Cloudinary** - Image storage and delivery

### Database
- **RDF/OWL** - Semantic ontology (Projet.rdf)
- **XML Format** - Data serialization

## 🚀 Quick Start & Installation

### Prerequisites
- Python 3.13 or higher
- Node.js 18+ and npm
- Modern web browser

### Backend Setup

1. Navigate to the project root:
```bash
cd "/Users/macbook/Desktop/Semantic Web"
```

2. Create and activate virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate     # On Windows
```

3. Install backend dependencies:
```bash
pip install -r backend/requirements.txt
```

3. Configure environment variables:
   - Create `backend/.env` with:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5001
RDF_FILE=../Projet.rdf
```

   - Create `frontend/smart-city-app/.env` with:
```env
REACT_APP_MAPBOX_TOKEN=your_mapbox_gl_token_here
```

5. Run the backend:
```bash
python backend/app.py
```
Backend will run on: **http://localhost:5001**

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend/smart-city-app
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```
Frontend will run on: **http://localhost:3000**

### Demo Account
- **Username:** Mohamed Ben Salem
- **Password:** mohamed2025

Or use the original demo:
- **Username:** Ali
- **Password:** ali123

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

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Image Upload (Cloudinary)
- `POST /api/upload/profile-image` - Upload user profile image
- `POST /api/upload/transport-image` - Upload transport vehicle image
- `POST /api/upload/station-image` - Upload station image

### Statistics
- `GET /api/stats` - Get system statistics

### Users (CRUD)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/<id>` - Update user
- `DELETE /api/users/<id>` - Delete user

### Transports (CRUD)
- `GET /api/transports` - List all transports
- `POST /api/transports` - Create new transport
- `PUT /api/transports/<id>` - Update transport
- `DELETE /api/transports/<id>` - Delete transport

### Stations (CRUD)
- `GET /api/stations` - List all stations
- `POST /api/stations` - Create new station
- `PUT /api/stations/<id>` - Update station
- `DELETE /api/stations/<id>` - Delete station

### Events (CRUD)
- `GET /api/events` - List all circulation events
- `POST /api/events` - Create new event
- `PUT /api/events/<id>` - Update event
- `DELETE /api/events/<id>` - Delete event

### Zones (CRUD)
- `GET /api/zones` - List all urban zones
- `POST /api/zones` - Create new zone
- `PUT /api/zones/<id>` - Update zone
- `DELETE /api/zones/<id>` - Delete zone

### AI Integration
- `POST /api/ai/query` - Convert natural language to SPARQL
- `POST /api/ai/search` - AI-powered semantic search
- `POST /api/ai/explain` - Explain query results
- `POST /api/ai/insights` - Generate smart city insights
- `POST /api/ai/related-queries` - Get related query suggestions

### SPARQL
- `POST /api/query` - Execute custom SPARQL query
- `POST /api/search` - Semantic search with filters

## � Features

## 🔑 Features

### 📊 Enhanced Dashboard
- **Interactive Map View** - Mapbox GL visualization of all stations and active events
- **Real-time Statistics** - Live counters for users, transports, stations, and events
- **Quick Actions** - Direct navigation to all management modules
- **Recent Events Feed** - Latest traffic incidents with severity indicators
- **System Information** - Technology stack overview and AI status
- **Beautiful Gradients** - Modern purple/blue gradient color scheme
- **Responsive Layout** - Adapts to any screen size

### 🎯 Core Modules (Full CRUD)
- **🚌 Transport Management** - Buses, metros, bikes, shared cars, scooters with image upload
- **📍 Station Management** - Transit hubs with interactive Mapbox map selection and geocoder search
- **⚠️ Event Management** - Traffic accidents, congestion, construction with image support
- **🏘️ Zone Management** - Urban areas, city center, suburbs, industrial zones
- **👤 User Profile** - Profile management with Cloudinary image upload

### 🤖 AI-Powered Features
- Natural language to SPARQL query conversion
- AI-powered search suggestions
- Query result explanations
- Smart city insights generation
- Related queries suggestions

### 🔐 Authentication & User Management
- User registration and login
- Profile management with image upload (max 5MB, stored in Cloudinary)
- Secure password handling
- Session persistence with localStorage
- Clickable avatar for profile editing

### 📊 Dashboard & Analytics
- Real-time system statistics
- Interactive data visualization
- Quick access to all modules
- Modern card-based UI with animations
- Search and filter functionality
- Toast notifications

### 🎨 UI/UX Features
- **Modern gradient designs** - Purple/blue gradients throughout
- **Smooth animations** - Fade-in, hover effects, floating animations
- **Interactive Mapbox maps** - Station management and dashboard visualization
- **Geocoder search** - Location autocomplete for adding stations
- **Click-to-add stations** - Interactive map click to place new stations
- **Image upload & preview** - Profile, transport, and event images
- **Loading states** - Elegant loading indicators
- **Empty state illustrations** - Beautiful placeholders for empty data
- **Mobile-responsive design** - Works on all devices
- **Toast notifications** - User-friendly feedback
- **Dark mode compatible** - Modern color palette
- **Card-based layouts** - Clean, organized interface
- **Hover effects** - Interactive elements with visual feedback

## 📈 Project Validation

| Criterion | Points | Status |
|-----------|--------|--------|
| **SPARQL Queries** | 4 pts | ✅ 20+ queries implemented |
| **Individuals (Instances)** | 2 pts | ✅ Multiple instances per class |
| **Smart City Scenario** | 2 pts | ✅ Complete mobility ecosystem |
| **AI API Integration** | 4 pts | ✅ Google Gemini natural language processing |
| **Graphical Interfaces** | 3 pts | ✅ Modern React UI with CRUD operations |
| **Backend/Frontend Communication** | 3 pts | ✅ REST API with JSON |
| **Added Value** | 2 pts | ✅ Profile management, AI insights, animations |

**Total**: 20/20 points

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is for educational purposes as part of a Semantic Web course.

## 🙏 Acknowledgments

- Google Gemini AI for natural language processing
- RDFLib community for semantic web tools
- React team for the excellent framework
- Flask team for the lightweight backend

---

**Built with ❤️ using Semantic Web Technologies**

For presentation: 
1. Start backend: `python backend/app.py`
2. Start frontend: `cd frontend/smart-city-app && npm start`
3. Open http://localhost:3000 🚀

## � Security

- Environment variables for sensitive data (.env file)
- API key protection (never committed to repository)
- Password validation
- Input sanitization
- CORS configuration for port 5001
- Secure session management
- .gitignore properly configured

## 📦 Deployment

### Production Backend
```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 backend.app:app
```

### Production Frontend
```bash
# Build optimized production bundle
cd frontend/smart-city-app
npm run build

# Serve build folder with nginx, Apache, or similar
```

## 🧪 Testing

### Test Authentication
1. Open http://localhost:3000
2. Login with demo account: **Ali** / **ali123**
3. Access dashboard

### Test CRUD Operations
1. Navigate to any module (Users, Transports, etc.)
2. Click "Add New" to create items
3. Click edit icon to modify items
4. Click delete icon to remove items
5. Verify changes persist to `Projet.rdf`

### Test Profile Management
1. Click on user avatar in top-right
2. Upload profile image (max 5MB)
3. Edit profile information
4. Change password
5. Sign out

### Test AI Features
1. Use natural language search
2. Execute SPARQL queries
3. Get AI-powered insights
4. Explore related queries

## 👥 Team Thunder

Created for Web Sémantique course, Year 2025/2026.

---

**For presentation**: Run `python backend/app.py` then open `frontend/index.html` 🚀
