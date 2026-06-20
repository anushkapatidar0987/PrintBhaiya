import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { mockDb } from '../services/mockDb';

export default function Auth({ onLoginSuccess }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  // State variables for form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('student'); // student, shopkeeper
  
  // Shop details
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [pricePerBw, setPricePerBw] = useState('2.00');
  const [pricePerColor, setPricePerColor] = useState('10.00');
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Clear alerts on mode change
    setErrorMsg('');
    setSuccessMsg('');
  }, [mode]);

  const handleToggleMode = () => {
    setSearchParams({ mode: mode === 'login' ? 'register' : 'login' });
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const user = mockDb.loginUser(email, password);
        onLoginSuccess(user);
        
        // Redirect according to user role
        if (user.role === 'student') {
          navigate('/student/dashboard');
        } else if (user.role === 'shopkeeper') {
          const shop = mockDb.getShopByOwnerId(user.id);
          if (shop && !shop.isApproved) {
            mockDb.logoutUser();
            onLoginSuccess(null);
            throw new Error("Your shop profile is registered but pending Admin approval. Please check back later.");
          }
          navigate('/shop/dashboard');
        } else if (user.role === 'admin') {
          navigate('/admin/dashboard');
        }
      } else {
        // Register Mode
        let shopDetails = null;
        if (role === 'shopkeeper') {
          if (!shopName || !shopAddress) {
            throw new Error("Please fill in your shop name and address.");
          }
          shopDetails = {
            name: shopName,
            address: shopAddress,
            pricePerBw,
            pricePerColor
          };
        }

        const newUser = mockDb.registerUser(name, email, phone, role, password, shopDetails);

        if (role === 'shopkeeper') {
          setSuccessMsg("Shopkeeper registration successful! Your shop requires platform Admin approval before going live. We will review your profile shortly.");
          // Clear inputs
          setEmail('');
          setPassword('');
          setName('');
          setPhone('');
          setShopName('');
          setShopAddress('');
        } else {
          // Student login automatic
          onLoginSuccess(newUser);
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "An error occurred");
    }
  };

  return (
    <div style={styles.authPage}>
      {/* Container is styled in strictly Black and White */}
      <div className="bw-container" style={styles.authContainer}>
        <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>

        {errorMsg && (
          <div style={styles.errorAlert}>
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={styles.successAlert}>
            ✅ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bw-form" style={styles.authForm}>
          {mode === 'register' && (
            <>
              {/* Account Role Selector */}
              <div className="form-group">
                <label>Register As</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === 'student'}
                      onChange={handleRoleChange}
                      style={styles.radioInput}
                    />
                    Student
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="role"
                      value="shopkeeper"
                      checked={role === 'shopkeeper'}
                      onChange={handleRoleChange}
                      style={styles.radioInput}
                    />
                    Print Shop Owner
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Bhaiya / Behn Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>WhatsApp Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Shopkeeper-specific Details */}
          {mode === 'register' && role === 'shopkeeper' && (
            <div style={styles.shopSection}>
              <h3 style={styles.shopSectionTitle}>Shop Details</h3>
              
              <div className="form-group">
                <label>Shop Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Campus Prints & Copies"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Shop Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Opposite Gate 2, near Canteen"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  required
                />
              </div>

              <div style={styles.pricingRow}>
                <div className="form-group" style={{flex: 1}}>
                  <label>B&W Rate (₹/pg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={pricePerBw}
                    onChange={(e) => setPricePerBw(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label>Color Rate (₹/pg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={pricePerColor}
                    onChange={(e) => setPricePerColor(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-submit" style={styles.submitBtn}>
            {mode === 'login' ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        <div className="bw-footer-link" style={styles.toggleLink}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <span onClick={handleToggleMode} style={styles.clickableText}>
                Register Now
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span onClick={handleToggleMode} style={styles.clickableText}>
                Sign In
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  authPage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 1rem',
    backgroundColor: '#F9F9F9',
    flexGrow: 1,
  },
  authContainer: {
    width: '100%',
    backgroundColor: 'var(--white)',
    border: '2px solid var(--dark-slate)',
    boxShadow: 'var(--shadow-md)',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  radioGroup: {
    display: 'flex',
    gap: '1.5rem',
    marginTop: '0.25rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 'normal',
  },
  radioInput: {
    cursor: 'pointer',
  },
  shopSection: {
    borderTop: '1px solid #E0E0E0',
    paddingTop: '1.25rem',
    marginTop: '1.25rem',
  },
  shopSectionTitle: {
    fontSize: '1.15rem',
    marginBottom: '1rem',
  },
  pricingRow: {
    display: 'flex',
    gap: '1rem',
  },
  submitBtn: {
    marginTop: '1.5rem',
  },
  toggleLink: {
    marginTop: '1.5rem',
    fontSize: '0.95rem',
  },
  clickableText: {
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: '700',
  },
  errorAlert: {
    backgroundColor: '#FFF0F0',
    border: '1px solid #FF3333',
    color: '#CC0000',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-md)',
    marginBottom: '1.25rem',
    fontSize: '0.95rem',
    lineHeight: '1.4',
  },
  successAlert: {
    backgroundColor: '#F0FFF0',
    border: '1px solid #33CC33',
    color: '#008800',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-md)',
    marginBottom: '1.25rem',
    fontSize: '0.95rem',
    lineHeight: '1.4',
  }
};
