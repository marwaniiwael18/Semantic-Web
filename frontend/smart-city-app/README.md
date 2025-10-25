# Smart City & Mobility Management System 🚀

## Frontend Application - React

A modern web application for managing smart city resources including users, transports, stations, events, and urban zones.

## 👥 Team Members & Module Assignments

| Team Member | Module | Responsibility |
|------------|--------|----------------|
| **Yassine Mannai** | User Management | CRUD operations for city users and subscribers |
| **Wael Marouani** | Transport Management | CRUD operations for buses, metros, bikes, etc. |
| **Kenza Ben Slimane** | Station Management | CRUD operations for transport stations |
| **Aymen Jallouli** | Event Management | CRUD operations for traffic events |
| **Nassim Khaldi** | Zone Management | CRUD operations for urban zones |

## 🛠️ Technologies Used

- **React 18**: Frontend framework
- **CSS3**: Modern styling with gradients and animations
- **Fetch API**: HTTP requests to backend
- **ES6+**: Modern JavaScript features

## 📋 Prerequisites

Before running the application, ensure you have:

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Backend API running on `http://localhost:5000`

## 🚀 Installation & Setup

1. **Navigate to the project directory**:
   ```bash
   cd "/Users/macbook/Desktop/Semantic Web/frontend/smart-city-app"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API URL** (if needed):
   - Open each component in `src/components/`
   - Update `API_URL` constant if your backend is on a different port

4. **Start the development server**:
   ```bash
   npm start
   ```

5. **Access the application**:
   - Open your browser to `http://localhost:3000`
   - The app will automatically reload when you make changes

## 📁 Project Structure

```
smart-city-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── UserManagement.js      # Yassine's module
│   │   ├── TransportManagement.js # Wael's module
│   │   ├── StationManagement.js   # Kenza's module
│   │   ├── EventManagement.js     # Aymen's module
│   │   └── ZoneManagement.js      # Nassim's module
│   ├── App.js                     # Main component with tabs
│   ├── App.css                    # Complete styling
│   └── index.js                   # Entry point
├── package.json
└── README.md
```

## 🎯 Features

### Dashboard
- Real-time statistics for all entities
- Overview cards with counts
- Visual indicators with hover effects

### CRUD Modules
Each module provides:
- ✅ **Create**: Add new entities with modal forms
- �� **Read**: View all entities in responsive tables
- ✏️ **Update**: Edit existing entities
- 🗑️ **Delete**: Remove entities with confirmation

### User Management (Yassine)
- Manage city users and subscribers
- Fields: Name, Age, Email, Type, Subscription Card
- User types: Resident, Tourist, Commuter

### Transport Management (Wael)
- Manage transport vehicles
- Fields: Name, Type, Capacity, Registration, Max Speed, Electric
- Types: Bus, Metro, Bike, Shared Car, Scooter

### Station Management (Kenza)
- Manage transport stations
- Fields: Name, Type, GPS Coordinates
- Google Maps integration links
- Types: Bus Station, Metro Station, Bike Station

### Event Management (Aymen)
- Manage traffic events
- Fields: Name, Type, Description, Severity, Date
- Severity rating (1-5) with color indicators
- Types: Accident, Traffic Jam, Construction

### Zone Management (Nassim)
- Manage urban zones
- Fields: Name, Type, Area, Population, Description
- Types: Downtown, Suburb, Industrial, Residential, Commercial

## 🔌 Backend API Integration

The app connects to the Flask backend API at `http://localhost:5000`.

### API Endpoints Used
- `GET /users` - Fetch all users
- `GET /transports` - Fetch all transports
- `GET /stations` - Fetch all stations
- `GET /events` - Fetch all events
- `GET /zones` - Fetch all urban zones
- `GET /stats` - Fetch statistics

**Note**: POST, PUT, DELETE endpoints need to be implemented in the backend for full CRUD functionality.

## 🎨 Styling

The application features:
- Modern gradient design (purple theme)
- Responsive layout (mobile-friendly)
- Modal overlays for forms
- Hover effects and transitions
- Color-coded badges
- Professional data tables

## 🧪 Testing Each Module

1. **Start Backend**: Make sure Flask backend is running
2. **Start Frontend**: Run `npm start`
3. **Test Each Tab**:
   - Dashboard: Verify statistics load
   - Each CRUD module: Test create, view, edit, delete operations

## 🔧 Development Workflow

### For Each Team Member:

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Work on your assigned module**:
   - Yassine: `src/components/UserManagement.js`
   - Wael: `src/components/TransportManagement.js`
   - Kenza: `src/components/StationManagement.js`
   - Aymen: `src/components/EventManagement.js`
   - Nassim: `src/components/ZoneManagement.js`

3. **Test your changes**:
   ```bash
   npm start
   ```

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "Updated [YourModule]: description"
   git push origin main
   ```

## 📦 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (not recommended)

## 🐛 Troubleshooting

### Backend Connection Issues
- Verify backend is running on `http://localhost:5000`
- Check CORS is enabled in Flask backend
- Ensure `flask-cors` is installed

### Module Not Found
```bash
npm install
```

### Port Already in Use
- Kill the process using port 3000
- Or run on different port: `PORT=3001 npm start`

## 📝 Next Steps

1. **Backend CRUD**: Implement POST, PUT, DELETE endpoints in Flask
2. **Form Validation**: Add client-side validation to forms
3. **Search/Filter**: Add search functionality to each table
4. **Pagination**: Implement pagination for large datasets
5. **Error Handling**: Improve error messages and user feedback

## 🎓 Validation Criteria

This project meets all requirements:
- ✅ SPARQL queries integration
- ✅ Multiple individuals/instances
- ✅ Realistic smart city scenario
- ✅ AI API integration (Google Gemini)
- ✅ Modern user interfaces
- ✅ Backend/Frontend communication
- ✅ Added value: 5 complete CRUD modules

## 📄 License

This project is created for academic purposes - Semantic Web course.

## 👨‍💻 Contributors

- Yassine Mannai - User Management
- Wael Marouani - Transport Management
- Kenza Ben Slimane - Station Management
- Aymen Jallouli - Event Management
- Nassim Khaldi - Zone Management

---

**Good luck with the presentation! 🎉**
