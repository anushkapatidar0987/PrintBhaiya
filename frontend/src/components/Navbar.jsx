import React from 'react';
import { Link, useNavigate } from 'react-router-dom';


export default function Navbar({ currentUser, onLogout }) {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <div className="container" style={styles.container}>
        <Link to="/" style={styles.logoLink}>
          <div style={styles.logoContainer}>
            <span style={styles.logoText}>PrintKarDoBhaiya</span>
            <span style={styles.logoEmoji}>🖨️</span>
          </div>
        </Link>

        <div style={styles.navLinks}>
          {!currentUser ? (
            <>
              <Link to="/" style={styles.link}>Home</Link>
              <Link to="/auth?mode=login" className="btn btn-secondary" style={styles.authBtn}>Login</Link>
              <Link to="/auth?mode=register" className="btn btn-primary" style={styles.authBtn}>Register</Link>
            </>
          ) : (
            <>
              {currentUser.role === 'student' && (
                <>
                  <Link to="/student/dashboard" style={styles.link}>Dashboard</Link>
                  <Link to="/student/new-order" style={styles.link}>New Print</Link>
                </>
              )}
              {currentUser.role === 'shopkeeper' && (
                <>
                  <Link to="/shop/dashboard" style={styles.link}>Shop Portal</Link>
                </>
              )}
              {currentUser.role === 'admin' && (
                <>
                  <Link to="/admin/dashboard" style={styles.link}>Admin Panel</Link>
                </>
              )}
              <div style={styles.userContainer}>
                <span style={styles.userName}>
                  Hi, <strong>{currentUser.name}</strong>
                  {currentUser.role !== 'admin' && <span style={styles.roleTag}>({currentUser.role})</span>}
                </span>
                <button onClick={handleLogoutClick} className="btn btn-secondary" style={styles.logoutBtn}>
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: 'var(--white)',
    borderBottom: 'var(--border-width) solid var(--border-color)',
    padding: '1.25rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  logoLink: {
    display: 'inline-block',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logoText: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--dark-slate)',
    letterSpacing: '-0.5px',
  },
  logoEmoji: {
    fontSize: '1.75rem',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  link: {
    fontSize: '1.125rem',
    fontWeight: '500',
    color: 'var(--dark-slate)',
    padding: '0.25rem 0.5rem',
  },
  authBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '1rem',
  },
  userContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    marginLeft: '0.5rem',
    borderLeft: '1px solid #ccc',
    paddingLeft: '1.25rem',
  },
  userName: {
    fontSize: '1rem',
    color: 'var(--dark-slate)',
  },
  roleTag: {
    fontSize: '0.8rem',
    marginLeft: '0.25rem',
    color: '#666',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    padding: '0.4rem 1rem',
    fontSize: '0.95rem',
  }
};
