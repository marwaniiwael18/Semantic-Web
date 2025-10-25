import React, { useState } from 'react';
import '../styles/Auth.css';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    // For demo purposes, accept any credentials
    // In production, this would call your backend API
    const user = {
      email: formData.email,
      name: formData.email.split('@')[0],
      role: 'user'
    };

    localStorage.setItem('smartcity_user', JSON.stringify(user));
    onLogin(user);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to access your Smart City Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#forgot" className="forgot-link">Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            Sign In
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button onClick={onSwitchToRegister} className="link-button">
              Sign up
            </button>
          </p>
        </div>

        <div className="demo-credentials">
          <p><strong>Demo:</strong> Use any email and password to login</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
