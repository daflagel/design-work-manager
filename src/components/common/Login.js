import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn } from 'lucide-react';
import './Login.css';

const Login = () => {
  const { signInWithGoogle, error } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <span className="logo-text">ZDG</span>
          </div>
          <h1>Zeppelindg Manager</h1>
          <p className="subtitle">Client Portal</p>
        </div>

        <div className="login-content">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="google-signin-button"
          >
            <LogIn size={20} />
            <span>{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="login-footer">
          <p>Sign in to access your projects and communicate with your designer.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
