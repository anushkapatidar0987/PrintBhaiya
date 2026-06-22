import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import SuperAdmin from './SuperAdmin';

export default function SuperAdminEntry({ currentUser, onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in
  if (currentUser) {
    if (currentUser.role === 'admin') {
      return <SuperAdmin />;
    } else {
      // If a non-admin accidentally navigates here
      return (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You do not have Super Admin privileges.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Return Home</button>
        </div>
      );
    }
  }

  const storeTokensAndUser = (data) => {
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    
    const user = { ...data.user };
    let normalizedRole = 'student';
    if (user.role === 'SHOP_OWNER') normalizedRole = 'shopkeeper';
    if (user.role === 'SUPER_ADMIN') normalizedRole = 'admin';
    
    user.role = normalizedRole;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await authService.login(email, password);
      const user = storeTokensAndUser(response.data);

      if (user.role !== 'admin') {
        // Kick them out if they are not an admin
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setErrorMsg("This portal is restricted to Super Administrators only.");
        return;
      }

      onLoginSuccess(user);
    } catch (err) {
      if (err.response && err.response.data) {
        const errors = err.response.data;
        let msg = errors.error || "Authentication failed";
        setErrorMsg(msg);
      } else {
        setErrorMsg(err.message || "An error occurred");
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Super Admin Portal</h2>
        <p style={styles.subtitle}>Sign in with your administrative credentials.</p>
        
        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label>Admin Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@printkardobhaiya.com"
              pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
              title="Please enter a valid email address"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            Sign In to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    backgroundColor: 'var(--light-gray)',
    padding: '2rem'
  },
  card: {
    backgroundColor: 'var(--white)',
    padding: '3rem',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'var(--box-shadow)',
    width: '100%',
    maxWidth: '450px',
    border: '2px solid var(--border-color)'
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '0.5rem',
    textAlign: 'center'
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: '2rem'
  }
};
