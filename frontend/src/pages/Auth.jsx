import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService, shopService } from '../services/api';

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

  const storeTokensAndUser = (data) => {
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    
    // Normalize user role mapping for the frontend routing
    const user = { ...data.user };
    let normalizedRole = 'student';
    if (user.role === 'SHOP_OWNER') normalizedRole = 'shopkeeper';
    if (user.role === 'SUPER_ADMIN') normalizedRole = 'admin';
    
    user.role = normalizedRole;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const response = await authService.login(email, password);
        const user = storeTokensAndUser(response.data);
        
        // Redirect according to user role
        if (user.role === 'student') {
          onLoginSuccess(user);
          navigate('/student/dashboard');
        } else if (user.role === 'shopkeeper') {
          // Check shop approval status
          try {
            const shopRes = await shopService.getMyShop();
            if (!shopRes.data.is_approved) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
              throw new Error("Your shop profile is registered but pending Admin approval. Please check back later.");
            }
            onLoginSuccess(user);
            navigate('/shop/dashboard');
          } catch (shopErr) {
            if (shopErr.message.includes('pending Admin approval')) {
              throw shopErr;
            }
            throw new Error("Could not fetch shop details");
          }
        } else if (user.role === 'admin') {
          onLoginSuccess(user);
          navigate('/admin/dashboard');
        }
      } else {
        // Register Mode
        let nameParts = name.split(' ');
        let firstName = nameParts[0] || '';
        let lastName = nameParts.slice(1).join(' ') || '';
        const fullPhone = phone.startsWith('+91') ? phone : '+91 ' + phone;

        if (role === 'shopkeeper') {
          if (!shopName || !shopAddress) {
            throw new Error("Please fill in your shop name and address.");
          }
          await authService.registerShop({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            phone_number: fullPhone,
            shop_name: shopName,
            shop_address: shopAddress,
            price_per_bw: pricePerBw,
            price_per_color: pricePerColor
          });

          setSuccessMsg("Shopkeeper registration successful! Your shop requires platform Admin approval before going live. We will review your profile shortly.");
          setEmail('');
          setPassword('');
          setName('');
          setPhone('');
          setShopName('');
          setShopAddress('');
        } else {
          // Student login automatic
          const response = await authService.registerStudent({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            phone_number: fullPhone,
          });
          
          const user = storeTokensAndUser(response.data);
          onLoginSuccess(user);
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      if (err.response && err.response.data) {
        // DRF usually returns errors as objects
        const errors = err.response.data;
        let msg = '';
        if (errors.error) msg = errors.error;
        else if (typeof errors === 'object') {
           msg = Object.values(errors).map(v => Array.isArray(v) ? v[0] : v).join(', ');
        }
        setErrorMsg(msg || "Authentication failed");
      } else {
        setErrorMsg(err.message || "An error occurred");
      }
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
                  onChange={(e) => {
                    const lettersOnly = e.target.value.replace(/[^A-Za-z\s]/g, '');
                    setName(lettersOnly);
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>WhatsApp Number</label>
                <div style={styles.phoneInputWrapper}>
                  <span style={styles.phonePrefix}>+91</span>
                  <input
                    type="tel"
                    className="form-input"
                    style={styles.phoneInput}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(digits);
                    }}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    title="Please enter exactly 10 digits"
                    required
                  />
                </div>
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
              pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
              title="Please enter a valid email address (e.g., name@example.com)"
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
  phoneInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '2px solid var(--dark-slate)',
    borderRadius: 'var(--border-radius-md)',
    overflow: 'hidden',
  },
  phonePrefix: {
    padding: '0.75rem 0.75rem',
    backgroundColor: 'var(--dark-slate)',
    color: 'var(--white)',
    fontWeight: '700',
    fontSize: '1rem',
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  phoneInput: {
    border: 'none',
    borderRadius: '0',
    flex: 1,
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
