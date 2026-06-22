import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer style={styles.footer}>
      <div className="container">
        {/* Top Section */}
        <div style={styles.topSection}>
          {/* Brand Info */}
          <div style={styles.brandCol}>
            <div style={styles.logoContainer}>
              <span style={styles.logoText}>PrintKarDoBhaiya</span>
              <span style={styles.logoEmoji}>🖨️</span>
            </div>
            <p style={styles.brandDesc}>
              Skip the queue. Print smart. Get your files printed at your local campus shop and pick them up when ready.
            </p>
          </div>

          {/* Nav Links */}
          <div style={styles.linksCol}>
            <h4 style={styles.colTitle}>Navigation</h4>
            <div style={styles.linksList}>
              <Link to="/" style={styles.link}>Home</Link>
              <Link to="/auth?mode=login" style={styles.link}>Login</Link>
              <Link to="/auth?mode=register" style={styles.link}>Register Shop</Link>
            </div>
          </div>

          {/* Newsletter / Contact */}
          <div style={styles.newsletterCol}>
            <h4 style={styles.colTitle}>Keep Updated</h4>
            {!subscribed ? (
              <form onSubmit={handleSubscribe} style={styles.form}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
                <button type="submit" className="btn btn-accent" style={styles.subscribeBtn}>
                  Subscribe
                </button>
              </form>
            ) : (
              <div style={styles.subscribedMsg}>
                🎉 Thank you for subscribing!
              </div>
            )}
          </div>
        </div>

        {/* Separator line */}
        <div style={styles.separator}></div>

        {/* Bottom Section */}
        <div style={styles.bottomSection}>
          <span style={styles.copyText}>
            &copy; {new Date().getFullYear()} PrintKarDoBhaiya. All rights reserved.
          </span>
          <div style={styles.bottomLinks}>
            <span style={styles.bottomLink}>Terms of Service</span>
            <span style={styles.bottomLink}>Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: 'var(--dark-slate)',
    color: 'var(--white)',
    padding: '4rem 0 2rem 0',
    marginTop: 'auto',
    borderTop: 'var(--border-width) solid var(--border-color)',
  },
  topSection: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '3rem',
    justifyContent: 'space-between',
    marginBottom: '2.5rem',
  },
  brandCol: {
    flex: '2 1 350px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  logoText: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--white)',
  },
  logoEmoji: {
    fontSize: '1.75rem',
  },
  brandDesc: {
    color: '#D0D0D5',
    fontSize: '1rem',
    maxWidth: '380px',
    lineHeight: '1.6',
  },
  linksCol: {
    flex: '1 1 150px',
  },
  colTitle: {
    color: 'var(--white)',
    fontSize: '1.125rem',
    fontWeight: '700',
    marginBottom: '1.25rem',
  },
  linksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  link: {
    color: '#D0D0D5',
    fontSize: '0.95rem',
    transition: 'color 0.2s',
  },
  newsletterCol: {
    flex: '2 1 300px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxWidth: '350px',
  },
  input: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--border-radius-md)',
    border: '1px solid #444',
    backgroundColor: '#2A2B35',
    color: 'var(--white)',
  },
  subscribeBtn: {
    padding: '0.6rem 1rem',
    fontSize: '1rem',
    width: '100%',
  },
  subscribedMsg: {
    backgroundColor: '#2A2B35',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-md)',
    color: 'var(--neon-green)',
    fontWeight: '500',
    border: '1px solid var(--neon-green)',
  },
  separator: {
    height: '1px',
    backgroundColor: '#3A3B45',
    margin: '2rem 0',
  },
  bottomSection: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.9rem',
    color: '#A0A0A5',
  },
  copyText: {
    display: 'inline-block',
  },
  bottomLinks: {
    display: 'flex',
    gap: '1.5rem',
  },
  bottomLink: {
    cursor: 'pointer',
    transition: 'color 0.2s',
  }
};
