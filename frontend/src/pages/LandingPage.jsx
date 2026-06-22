import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shopService } from '../services/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeAccordion, setActiveAccordion] = useState(0);
  const [shops, setShops] = useState([]);

  React.useEffect(() => {
    shopService.getPublicList()
      .then(res => setShops(res.data.results || res.data))
      .catch(err => console.error("Failed to fetch shops", err));
  }, []);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (contactName && contactEmail && contactMsg) {
      setContactSubmitted(true);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
    }
  };

  const processSteps = [
    {
      number: '01',
      title: 'Upload Files',
      desc: 'Simply drag and drop your PDF, DOCX, or image files onto our portal. We support documents up to 30MB.'
    },
    {
      number: '02',
      title: 'Choose Print Specifications',
      desc: 'Select your options: Color or Black & White, single or double-sided, number of copies, and binding options (e.g. Spiral binding or Stapling).'
    },
    {
      number: '03',
      title: 'Select Shop & Pay',
      desc: 'Choose from our list of local campus print shops. Check their live prices, pay securely online via UPI, Card, or Netbanking using Razorpay.'
    },
    {
      number: '04',
      title: 'Collect on Ready Alert',
      desc: 'You will receive a WhatsApp and email notification the moment the shopkeeper marks your order as "Ready for Collection". Just walk in, show your Order ID, and grab your print!'
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="section" style={styles.heroSection}>
        <div className="container grid-2" style={styles.heroContainer}>
          <div style={styles.heroTextCol}>
            <h1 style={styles.heroTitle}>
              Skip the queue.<br />
              <span className="highlight">Print smart.</span>
            </h1>
            <p style={styles.heroDesc}>
              PrintKarDoBhaiya lets students upload assignments and documents, pay online, and collect them from campus print shops without waiting in line.
            </p>
            <div style={styles.heroBtns}>
              <Link to="/auth?mode=register" className="btn btn-accent" style={styles.heroCtaPrimary}>🎓 Join as Student — It's Free</Link>
              <Link to="/auth?mode=login" className="btn btn-secondary">Order Prints</Link>
            </div>
          </div>
          <div style={styles.heroImgCol}>
            {/* Neo-brutalist line illustration using SVG */}
            <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={styles.heroSvg}>
              {/* Background abstract shapes */}
              <rect x="50" y="50" width="380" height="280" rx="14" fill="#F3F3F3" stroke="#191A23" strokeWidth="2" />
              <circle cx="120" cy="120" r="40" fill="#B9FF66" stroke="#191A23" strokeWidth="2" />
              
              {/* Printer representation */}
              <rect x="150" y="180" width="200" height="100" rx="8" fill="#FFFFFF" stroke="#191A23" strokeWidth="3" />
              <rect x="180" y="140" width="140" height="40" fill="#F3F3F3" stroke="#191A23" strokeWidth="3" />
              
              {/* Paper exiting printer */}
              <path d="M190 240H310V320H190V240Z" fill="#FFFFFF" stroke="#191A23" strokeWidth="3" />
              {/* Lines on paper */}
              <line x1="210" y1="265" x2="290" y2="265" stroke="#191A23" strokeWidth="2" strokeLinecap="round" />
              <line x1="210" y1="285" x2="290" y2="285" stroke="#191A23" strokeWidth="2" strokeLinecap="round" />
              <line x1="210" y1="305" x2="260" y2="305" stroke="#191A23" strokeWidth="2" strokeLinecap="round" />
              
              {/* Sparkles / Details */}
              <path d="M410 90L425 105M425 90L410 105" stroke="#191A23" strokeWidth="3" strokeLinecap="round" />
              <path d="M70 280L85 295M85 280L70 295" stroke="#191A23" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* Campus Brands Section */}
      <section style={styles.brandsSection}>
        <div className="container" style={styles.brandsContainer}>
          <span style={styles.brand}>🎓 Central Library</span>
          <span style={styles.brand}>💻 CS Dept</span>
          <span style={styles.brand}>🔬 Science Block</span>
          <span style={styles.brand}>📚 Commerce Block</span>
          <span style={styles.brand}>🏛️ Hostels Market</span>
        </div>
      </section>

      {/* Partner Shops Section — Moved above Services */}
      <section className="section" id="shops">
        <div className="container">
          <div className="section-header">
            <h2><span className="highlight">Partner Print Shops</span></h2>
            <p>Explore verified printing partners around the university campus area. Only currently open shops accept orders.</p>
          </div>

          <div className="grid-3">
            {shops.map(shop => (
              <div key={shop.id} className="card" style={styles.shopCard}>
                <div style={styles.shopCardHeader}>
                  <h3 style={styles.shopName}>{shop.name}</h3>
                  <span className={`badge ${shop.status === 'OPEN' ? 'badge-success' : 'badge-danger'}`} style={{textTransform: 'uppercase'}}>
                    {shop.status === 'OPEN' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p style={styles.shopAddress}>{shop.address}</p>
                <p style={styles.shopArea}>📍 {shop.area}, {shop.city}</p>
                <div style={styles.shopPricingBlock}>
                  <div style={styles.priceItem}>
                    <span style={styles.priceLabel}>B&W Print:</span>
                    <span style={styles.priceValue}>₹{shop.pricePerBw}/pg</span>
                  </div>
                  <div style={styles.priceItem}>
                    <span style={styles.priceLabel}>Color Print:</span>
                    <span style={styles.priceValue}>₹{shop.pricePerColor}/pg</span>
                  </div>
                </div>
                
                {shop.status === 'OPEN' ? (
                  <Link to="/auth?mode=login" className="btn btn-primary" style={styles.orderBtn}>
                    Order Prints
                  </Link>
                ) : (
                  <button className="btn btn-disabled" style={styles.orderBtn} disabled>
                    Currently Closed
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section" id="services">
        <div className="container">
          <div className="section-header">
            <h2><span className="highlight">Services</span></h2>
            <p>
              We provide standard document printing and binding options designed to meet all your academic and general printing needs.
            </p>
          </div>

          <div className="grid-2">
            {/* Card 1 */}
            <div className="card-green" style={styles.serviceCard}>
              <div style={styles.serviceCardContent}>
                <h3 style={styles.serviceTitle}><span className="highlight-white">B&W Printing</span></h3>
                <p style={styles.serviceDesc}>High-speed laser printing for your notes, assignments, and reports.</p>
                <span style={styles.servicePrice}>Starts at ₹1.50/page</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="card-dark" style={styles.serviceCard}>
              <div style={styles.serviceCardContent}>
                <h3 style={styles.serviceTitle}><span className="highlight">Color Printing</span></h3>
                <p style={styles.serviceDesc}>Vibrant, high-resolution laser printing for resumes, research papers, and charts.</p>
                <span style={{color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '1rem'}}>Starts at ₹8.00/page</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="card" style={styles.serviceCard}>
              <div style={styles.serviceCardContent}>
                <h3 style={styles.serviceTitle}><span className="highlight">Spiral Binding</span></h3>
                <p style={styles.serviceDesc}>Durable plastic spiral binding with transparent front sheet for project submissions.</p>
                <span style={styles.servicePrice}>Starting at ₹25.00/book</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="card-green" style={styles.serviceCard}>
              <div style={styles.serviceCardContent}>
                <h3 style={styles.serviceTitle}><span className="highlight-white">Double-Sided</span></h3>
                <p style={styles.serviceDesc}>Eco-friendly printing on both sides of high-quality paper, saving trees and weight.</p>
                <span style={styles.servicePrice}>Standard pricing per printed page</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box Block */}
      <section className="section">
        <div className="container">
          <div className="card" style={styles.ctaBox}>
            <div style={styles.ctaBoxText}>
              <h3>Let's make things happen</h3>
              <p style={styles.ctaBoxDesc}>
                Ready to skip the print shop rush? Register an account today, upload your document, and print on your own terms.
              </p>
              <Link to="/auth?mode=register" className="btn btn-primary">Get Started</Link>
            </div>
            <div style={styles.ctaBoxImg}>
              <svg viewBox="0 0 200 200" width="150" height="150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="20" width="160" height="160" rx="14" fill="#B9FF66" stroke="#191A23" strokeWidth="2" />
                <path d="M50 70L80 100L150 50" stroke="#191A23" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="40" y1="140" x2="160" y2="140" stroke="#191A23" strokeWidth="3" />
                <line x1="40" y1="160" x2="120" y2="160" stroke="#191A23" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / Accordion Process Section */}
      <section className="section" id="process">
        <div className="container">
          <div className="section-header">
            <h2><span className="highlight">Working Process</span></h2>
            <p>A Simple Step-by-Step Guide to getting your prints in record time.</p>
          </div>

          <div style={styles.accordionContainer}>
            {processSteps.map((step, idx) => (
              <div
                key={idx}
                className={`accordion-item ${activeAccordion === idx ? 'active' : ''}`}
                style={styles.accordionItem}
              >
                <button onClick={() => toggleAccordion(idx)} className="accordion-trigger">
                  <span className="accordion-number">{step.number}</span>
                  <span className="accordion-title">{step.title}</span>
                  <span className="accordion-icon">
                    {activeAccordion === idx ? '−' : '+'}
                  </span>
                </button>
                {activeAccordion === idx && (
                  <div className="accordion-content">
                    <p style={{marginBottom: 0}}>{step.desc}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section" id="contact" style={{paddingBottom: '6rem'}}>
        <div className="container">
          <div className="section-header">
            <h2><span className="highlight">Contact Us</span></h2>
            <p>Have questions, running into payment issues, or want to list your shop? Shoot us a message!</p>
          </div>

          <div className="card grid-2" style={styles.contactCard}>
            <div style={styles.contactFormCol}>
              {!contactSubmitted ? (
                <form onSubmit={handleContactSubmit} className="bw-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Your Name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Your Email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea
                      className="form-input"
                      style={{minHeight: '120px', resize: 'vertical'}}
                      placeholder="Tell us what you need..."
                      value={contactMsg}
                      onChange={(e) => setContactMsg(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem'}}>
                    Send Message
                  </button>
                </form>
              ) : (
                <div style={styles.contactSuccess}>
                  <h3>📬 Message Sent!</h3>
                  <p>Thanks for reaching out, Bhaiya. We will get back to you shortly on email.</p>
                  <button onClick={() => setContactSubmitted(false)} className="btn btn-secondary" style={{marginTop: '1rem'}}>
                    Send Another Message
                  </button>
                </div>
              )}
            </div>

            <div style={styles.contactDetailsCol}>
              <h3 style={{marginBottom: '1rem'}}>Get in Touch</h3>
              <div style={styles.contactItem}>
                <strong>📧 Email:</strong> support@printkardobhaiya.com
              </div>
              <div style={styles.contactItem}>
                <strong>📱 WhatsApp Support:</strong> +91 98765 43210
              </div>
              <div style={styles.contactItem}>
                <strong>🏢 Office Address:</strong> Campus Incubation Center, Indore, MP, India
              </div>
              <div style={styles.contactDivider}></div>
              <p style={{fontSize: '1rem', color: '#666'}}>
                If you are a print shop owner looking to join, sign up via the register link or drop a line via WhatsApp for quick onboarding assistance!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  heroSection: {
    padding: '3rem 0 4rem 0',
  },
  heroContainer: {
    alignItems: 'center',
  },
  heroTextCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: '3.75rem',
    marginBottom: '1.5rem',
  },
  heroDesc: {
    fontSize: '1.25rem',
    lineHeight: '1.6',
    marginBottom: '2rem',
    color: 'var(--dark-slate)',
  },
  heroBtns: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  heroCtaPrimary: {
    fontSize: '1.25rem',
    padding: '1rem 2rem',
    fontWeight: '700',
    animation: 'pulse-glow 2s ease-in-out infinite',
  },
  heroImgCol: {
    display: 'flex',
    justifyContent: 'center',
  },
  heroSvg: {
    width: '100%',
    maxWidth: '460px',
    height: 'auto',
  },
  brandsSection: {
    backgroundColor: 'var(--light-gray)',
    padding: '2rem 0',
    borderTop: 'var(--border-width) solid var(--border-color)',
    borderBottom: 'var(--border-width) solid var(--border-color)',
    overflow: 'hidden',
  },
  brandsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '2rem',
  },
  brand: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#666',
  },
  serviceCard: {
    minHeight: '220px',
  },
  serviceCardContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  serviceTitle: {
    fontSize: '1.75rem',
  },
  serviceDesc: {
    fontSize: '1.05rem',
    marginBottom: 0,
  },
  servicePrice: {
    fontSize: '1rem',
    fontWeight: '500',
  },
  ctaBox: {
    backgroundColor: 'var(--light-gray)',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3rem',
    gap: '2rem',
  },
  ctaBoxText: {
    flex: '2 1 350px',
  },
  ctaBoxDesc: {
    fontSize: '1.15rem',
    margin: '1rem 0 1.5rem 0',
    maxWidth: '500px',
  },
  ctaBoxImg: {
    flex: '1 1 150px',
    display: 'flex',
    justifyContent: 'center',
  },
  accordionContainer: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  accordionItem: {
    transition: 'all 0.2s ease',
  },
  shopCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '320px',
  },
  shopCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  shopName: {
    fontSize: '1.35rem',
    lineHeight: '1.2',
  },
  shopAddress: {
    fontSize: '0.95rem',
    color: '#555',
    marginBottom: '0.25rem',
  },
  shopArea: {
    fontSize: '0.95rem',
    fontWeight: '500',
    marginBottom: '1rem',
  },
  shopPricingBlock: {
    backgroundColor: 'var(--light-gray)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-md)',
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    marginBottom: '1.25rem',
  },
  priceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
  },
  priceLabel: {
    color: '#555',
  },
  priceValue: {
    fontWeight: '700',
  },
  orderBtn: {
    width: '100%',
  },
  contactCard: {
    padding: '3rem',
    gap: '3rem',
  },
  contactFormCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  contactSuccess: {
    textAlign: 'center',
    padding: '2rem 1rem',
  },
  contactDetailsCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '1rem',
  },
  contactItem: {
    fontSize: '1.05rem',
  },
  contactDivider: {
    height: '1px',
    backgroundColor: '#DDD',
    margin: '0.5rem 0',
  }
};
