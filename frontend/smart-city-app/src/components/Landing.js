import React from 'react';
import '../styles/Landing.css';

const Landing = ({ onGetStarted, onLogin }) => {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🏙️</span>
            <span className="logo-text">Smart City</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#team">Team</a>
            <button onClick={onLogin} className="btn btn-outline">Login</button>
            <button onClick={onGetStarted} className="btn btn-primary">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Smart City & Mobility<br />
            <span className="gradient-text">Management System</span>
          </h1>
          <p className="hero-description">
            A comprehensive platform for managing urban transportation, events, and zones using semantic web technologies and AI-powered insights.
          </p>
          <div className="hero-buttons">
            <button onClick={onGetStarted} className="btn btn-primary btn-large">
              Get Started →
            </button>
            <button className="btn btn-outline btn-large">
              Watch Demo
            </button>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">5</div>
              <div className="stat-label">Management Modules</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">20+</div>
              <div className="stat-label">SPARQL Queries</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">AI</div>
              <div className="stat-label">Powered Search</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">Everything you need to manage a smart city</p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>User Management</h3>
              <p>Manage city residents, tourists, and commuters with comprehensive user profiles and subscription tracking.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🚌</div>
              <h3>Transport Management</h3>
              <p>Track and manage buses, metros, bikes, shared cars, and scooters across the city.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>Station Management</h3>
              <p>Monitor transport stations with GPS coordinates and Google Maps integration.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚠️</div>
              <h3>Event Management</h3>
              <p>Track traffic events, accidents, and construction with severity ratings.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🏙️</div>
              <h3>Zone Management</h3>
              <p>Manage urban zones including downtown, suburbs, and industrial areas.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Insights</h3>
              <p>Get intelligent insights and natural language query support powered by Google Gemini.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="about" className="architecture-section">
        <div className="container">
          <h2 className="section-title">System Architecture</h2>
          <p className="section-subtitle">Built with modern semantic web technologies</p>
          
          <div className="architecture-content">
            <div className="architecture-diagram">
              <div className="arch-layer">
                <div className="arch-box frontend">
                  <h4>Frontend</h4>
                  <p>React 18 • Modern UI</p>
                </div>
              </div>
              
              <div className="arch-arrow">↕️</div>
              
              <div className="arch-layer">
                <div className="arch-box api">
                  <h4>REST API</h4>
                  <p>Flask • Google Gemini AI</p>
                </div>
              </div>
              
              <div className="arch-arrow">↕️</div>
              
              <div className="arch-layer">
                <div className="arch-box backend">
                  <h4>Backend</h4>
                  <p>RDFLib • SPARQL • OWL Ontology</p>
                </div>
              </div>
            </div>
            
            <div className="tech-stack">
              <h3>Technology Stack</h3>
              <div className="tech-list">
                <span className="tech-badge">React 18</span>
                <span className="tech-badge">Python 3.13</span>
                <span className="tech-badge">Flask 3.0</span>
                <span className="tech-badge">RDFLib 7.0</span>
                <span className="tech-badge">SPARQL</span>
                <span className="tech-badge">OWL/RDF</span>
                <span className="tech-badge">Google Gemini AI</span>
                <span className="tech-badge">REST API</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="team-section">
        <div className="container">
          <h2 className="section-title">Our Team</h2>
          <p className="section-subtitle">Meet the developers behind this project</p>
          
          <div className="team-grid">
            <div className="team-card">
              <div className="team-avatar">YM</div>
              <h3>Yassine Mannai</h3>
              <p>User Management Module</p>
            </div>
            
            <div className="team-card">
              <div className="team-avatar">WM</div>
              <h3>Wael Marouani</h3>
              <p>Transport Management Module</p>
            </div>
            
            <div className="team-card">
              <div className="team-avatar">KB</div>
              <h3>Kenza Ben Slimane</h3>
              <p>Station Management Module</p>
            </div>
            
            <div className="team-card">
              <div className="team-avatar">AJ</div>
              <h3>Aymen Jallouli</h3>
              <p>Event Management Module</p>
            </div>
            
            <div className="team-card">
              <div className="team-avatar">NK</div>
              <h3>Nassim Khaldi</h3>
              <p>Zone Management Module</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>🏙️ Smart City</h4>
              <p>Semantic Web Course Project<br />ESPRIT - 5TWIN</p>
            </div>
            
            <div className="footer-section">
              <h4>Technologies</h4>
              <ul>
                <li>React & Flask</li>
                <li>RDF & SPARQL</li>
                <li>Google Gemini AI</li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Resources</h4>
              <ul>
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#api">API Reference</a></li>
                <li><a href="#github">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>© 2025 Smart City Management System. Academic Project.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
