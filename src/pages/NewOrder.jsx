import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDb } from '../services/mockDb';

export default function NewOrder({ currentUser }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [shops, setShops] = useState([]);

  // Form State
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [printType, setPrintType] = useState('bw'); // bw, color
  const [copies, setCopies] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [doubleSided, setDoubleSided] = useState(false);
  const [bindingOption, setBindingOption] = useState('None');
  const [studentComment, setStudentComment] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');
  
  // Payment Simulator Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, success, failed

  useEffect(() => {
    // Load all approved shops
    const list = mockDb.getShops(true);
    setShops(list);
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile) => {
    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => {
      setFile({
        name: selectedFile.name,
        size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB'
      });
      // Simulate page count detection (random number between 2 and 20 for PDFs)
      const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
      const detectedPages = isPdf ? Math.floor(Math.random() * 15) + 3 : 1;
      setPageCount(detectedPages);
      setIsUploading(false);
      setStep(2);
    }, 1500);
  };

  const handleNextStep = () => {
    if (step === 2) {
      // Find first open shop and set default
      const openShops = shops.filter(s => s.status === 'OPEN');
      if (openShops.length > 0 && !selectedShopId) {
        setSelectedShopId(openShops[0].id);
      }
      setStep(3);
    } else if (step === 3) {
      if (!selectedShopId) {
        alert("Please select a print shop first!");
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const getSelectedShop = () => {
    return shops.find(s => s.id === selectedShopId) || null;
  };

  // Live Price Calculation
  const calculatePrice = (shop) => {
    if (!shop) return 0;
    const pageRate = printType === 'color' ? shop.pricePerColor : shop.pricePerBw;
    const baseCost = pageCount * copies * pageRate;
    
    let bindingCost = 0;
    if (bindingOption && bindingOption !== 'None') {
      const option = shop.bindingOptions.find(b => b.name === bindingOption);
      if (option) bindingCost = option.price;
    }
    
    return baseCost + bindingCost;
  };

  const handlePayClick = () => {
    setShowPaymentModal(true);
    setPaymentStatus('pending');
  };

  const simulatePaymentSuccess = () => {
    setPaymentStatus('processing');
    setTimeout(() => {
      try {
        const orderData = {
          fileName: file.name,
          fileSize: file.size,
          printType,
          copies,
          pageCount,
          doubleSided,
          bindingOption,
          studentComment
        };
        
        // Create order in DB (initializes as pending_payment)
        const order = mockDb.createOrder(currentUser.id, selectedShopId, orderData);
        
        // Mark payment successful & order status placed
        mockDb.updateOrderStatus(order.id, 'PLACED');
        
        setPaymentStatus('success');
        
        // Redirect after success screen
        setTimeout(() => {
          setShowPaymentModal(false);
          navigate('/student/dashboard');
        }, 1500);
      } catch (err) {
        alert(err.message);
        setPaymentStatus('failed');
      }
    }, 2000);
  };

  const simulatePaymentFailure = () => {
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('failed');
    }, 1500);
  };

  const selectedShop = getSelectedShop();
  const totalPrice = calculatePrice(selectedShop);

  return (
    <div className="section" style={{flexGrow: 1}}>
      <div className="container" style={{maxWidth: '800px'}}>
        
        {/* Multi-step progress bar */}
        <div style={styles.progressBar}>
          <div style={{...styles.progressStep, ...(step >= 1 ? styles.progressActive : {})}}>
            <span style={styles.stepNum}>1</span>
            <span style={styles.stepText}>Upload</span>
          </div>
          <div style={styles.progressLine}></div>
          <div style={{...styles.progressStep, ...(step >= 2 ? styles.progressActive : {})}}>
            <span style={styles.stepNum}>2</span>
            <span style={styles.stepText}>Options</span>
          </div>
          <div style={styles.progressLine}></div>
          <div style={{...styles.progressStep, ...(step >= 3 ? styles.progressActive : {})}}>
            <span style={styles.stepNum}>3</span>
            <span style={styles.stepText}>Shop</span>
          </div>
          <div style={styles.progressLine}></div>
          <div style={{...styles.progressStep, ...(step >= 4 ? styles.progressActive : {})}}>
            <span style={styles.stepNum}>4</span>
            <span style={styles.stepText}>Payment</span>
          </div>
        </div>

        {/* Step 1: File Upload */}
        {step === 1 && (
          <div className="card" style={{textAlign: 'center', padding: '4rem 2rem'}}>
            <h2>Upload your document</h2>
            <p style={{color: '#666', marginBottom: '2rem'}}>Upload PDF, images, or Word documents. Max size 30MB.</p>
            
            {isUploading ? (
              <div style={styles.uploadingBox}>
                <div style={styles.spinner}></div>
                <h4 style={{marginTop: '1rem'}}>Scanning and checking file specifications...</h4>
                <p style={{fontSize: '0.9rem', color: '#666'}}>Auto-detecting page count.</p>
              </div>
            ) : (
              <div
                style={styles.dropzone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <span style={{fontSize: '4rem', display: 'block', marginBottom: '1rem'}}>📂</span>
                <h3>Drag & Drop file here</h3>
                <p style={{color: '#666', margin: '0.5rem 0'}}>or click to browse from device</p>
                <input
                  id="fileInput"
                  type="file"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  style={{display: 'none'}}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Print Specifications */}
        {step === 2 && file && (
          <div className="card">
            <h2>Customize print specifications</h2>
            <p style={{color: '#666', marginBottom: '2rem'}}>📄 File: <strong>{file.name}</strong> ({file.size})</p>

            <div style={styles.formGrid}>
              {/* Print Type */}
              <div className="form-group">
                <label>Print Color Mode</label>
                <select
                  className="form-input"
                  value={printType}
                  onChange={(e) => setPrintType(e.target.value)}
                >
                  <option value="bw">Black & White (B&W)</option>
                  <option value="color">Full Color</option>
                </select>
              </div>

              {/* Copies Stepper */}
              <div className="form-group">
                <label>Number of Copies</label>
                <div style={styles.stepperInput}>
                  <button
                    type="button"
                    onClick={() => setCopies(c => Math.max(1, c - 1))}
                    style={styles.stepperBtn}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="form-input"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{textAlign: 'center', width: '80px', margin: '0 0.5rem'}}
                  />
                  <button
                    type="button"
                    onClick={() => setCopies(c => c + 1)}
                    style={styles.stepperBtn}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Page Count */}
              <div className="form-group">
                <label>Page Count</label>
                <input
                  type="number"
                  className="form-input"
                  value={pageCount}
                  onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
                <span style={{fontSize: '0.85rem', color: '#666'}}>Auto-detected from file, edit if incorrect.</span>
              </div>

              {/* Double-Sided */}
              <div className="form-group">
                <label>Layout Option</label>
                <select
                  className="form-input"
                  value={doubleSided ? 'true' : 'false'}
                  onChange={(e) => setDoubleSided(e.target.value === 'true')}
                >
                  <option value="false">Single-Sided Print</option>
                  <option value="true">Double-Sided Print (Eco)</option>
                </select>
              </div>

              {/* Binding Options */}
              <div className="form-group" style={{gridColumn: 'span 2'}}>
                <label>Binding Option</label>
                <select
                  className="form-input"
                  value={bindingOption}
                  onChange={(e) => setBindingOption(e.target.value)}
                >
                  <option value="None">No Binding (Loose pages)</option>
                  <option value="Spiral Binding">Spiral Binding (+ ₹25-30)</option>
                  <option value="Stapled">Stapled Top-Left (+ ₹2-5)</option>
                </select>
              </div>

              {/* Comments */}
              <div className="form-group" style={{gridColumn: 'span 2'}}>
                <label>Additional Instructions for Bhaiya (Optional)</label>
                <textarea
                  className="form-input"
                  placeholder="e.g. please staple page 1-4 separately, print single sided, print landscape..."
                  value={studentComment}
                  onChange={(e) => setStudentComment(e.target.value)}
                  style={{minHeight: '80px', resize: 'vertical'}}
                />
              </div>
            </div>

            <div style={styles.wizardNav}>
              <button onClick={handlePrevStep} className="btn btn-secondary">Back</button>
              <button onClick={handleNextStep} className="btn btn-primary">Next: Select Shop</button>
            </div>
          </div>
        )}

        {/* Step 3: Select Shop */}
        {step === 3 && (
          <div className="card">
            <h2>Select Print Shop</h2>
            <p style={{color: '#666', marginBottom: '2rem'}}>Only currently open shops are selectable for immediate orders.</p>

            <div style={styles.shopsGrid}>
              {shops.map(shop => {
                const isOpen = shop.status === 'OPEN';
                const calculatedCost = calculatePrice(shop);
                const isSelected = selectedShopId === shop.id;

                return (
                  <div
                    key={shop.id}
                    className="card"
                    style={{
                      ...styles.selectShopCard,
                      opacity: isOpen ? 1 : 0.6,
                      borderColor: isSelected ? 'var(--dark-slate)' : '#DDD',
                      backgroundColor: isSelected ? 'rgba(185, 255, 102, 0.15)' : 'var(--white)',
                      cursor: isOpen ? 'pointer' : 'not-allowed'
                    }}
                    onClick={() => isOpen && setSelectedShopId(shop.id)}
                  >
                    <div style={styles.shopCardHeader}>
                      <div>
                        <h4 style={{fontSize: '1.25rem'}}>{shop.name}</h4>
                        <span style={{fontSize: '0.85rem', color: '#666'}}>{shop.area}</span>
                      </div>
                      <span className={`badge ${isOpen ? 'badge-success' : 'badge-danger'}`}>
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    
                    <div style={styles.shopRatesLine}>
                      <span>B&W: ₹{shop.pricePerBw}/pg</span>
                      <span>Color: ₹{shop.pricePerColor}/pg</span>
                    </div>

                    {isOpen && (
                      <div style={styles.shopPricePreview}>
                        <span>Calculated Price:</span>
                        <span style={styles.previewPriceValue}>₹{calculatedCost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={styles.wizardNav}>
              <button onClick={handlePrevStep} className="btn btn-secondary">Back</button>
              <button onClick={handleNextStep} className="btn btn-primary">Next: Review & Pay</button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && selectedShop && file && (
          <div className="card">
            <h2>Review Order Details</h2>
            <p style={{color: '#666', marginBottom: '2.5rem'}}>Please double check the specs before proceeding to online checkout.</p>

            <div style={styles.reviewBlock}>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Document File:</span>
                <span style={styles.reviewVal}>{file.name} ({file.size})</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Color Mode:</span>
                <span style={styles.reviewVal} style={{textTransform: 'uppercase'}}>{printType}</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Pages × Copies:</span>
                <span style={styles.reviewVal}>{pageCount} pages × {copies} copies ({pageCount * copies} total prints)</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Layout:</span>
                <span style={styles.reviewVal}>{doubleSided ? 'Double-Sided (Eco)' : 'Single-Sided'}</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Binding Option:</span>
                <span style={styles.reviewVal}>{bindingOption}</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Campus Print Shop:</span>
                <span style={styles.reviewVal}><strong>{selectedShop.name}</strong> ({selectedShop.area})</span>
              </div>
              {studentComment && (
                <div style={styles.reviewItem}>
                  <span style={styles.reviewLabel}>Instructions:</span>
                  <span style={styles.reviewVal} style={{fontStyle: 'italic'}}>{studentComment}</span>
                </div>
              )}
            </div>

            {/* Price Summary Breakdown */}
            <div style={styles.priceSummaryBox}>
              <h3 style={{marginBottom: '1rem'}}>Total Summary</h3>
              <div style={styles.breakdownRow}>
                <span>Prints ({pageCount * copies} pgs × ₹{(printType === 'color' ? selectedShop.pricePerColor : selectedShop.pricePerBw).toFixed(2)})</span>
                <span>₹{(pageCount * copies * (printType === 'color' ? selectedShop.pricePerColor : selectedShop.pricePerBw)).toFixed(2)}</span>
              </div>
              {bindingOption !== 'None' && (
                <div style={styles.breakdownRow}>
                  <span>Binding Charge ({bindingOption})</span>
                  <span>₹{(selectedShop.bindingOptions.find(b => b.name === bindingOption)?.price || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={styles.breakdownRow}>
                <span>Platform Convenience Fee</span>
                <span style={{color: '#008800', fontWeight: 'bold'}}>₹0.00 (Launch Offer)</span>
              </div>
              <div style={styles.totalRow}>
                <span>Grand Total:</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div style={styles.wizardNav}>
              <button onClick={handlePrevStep} className="btn btn-secondary">Back</button>
              <button onClick={handlePayClick} className="btn btn-accent" style={{fontSize: '1.2rem', padding: '0.85rem 2rem'}}>
                💳 Pay ₹{totalPrice.toFixed(2)} via Razorpay
              </button>
            </div>
          </div>
        )}

      </div>

      {/* RAZORPAY PAYMENT SIMULATION MODAL OVERLAY */}
      {showPaymentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            
            {/* Razorpay Header */}
            <div style={styles.razorpayHeader}>
              <div style={styles.razorpayLogo}>
                <span style={{fontWeight: '900', fontStyle: 'italic', fontSize: '1.4rem', color: '#FFF'}}>Razorpay</span>
              </div>
              <div style={styles.razorpayAmountCol}>
                <span style={{fontSize: '0.8rem', color: '#BBB'}}>Amount to Pay</span>
                <span style={{fontSize: '1.4rem', fontWeight: '700', color: '#FFF'}}>₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div style={styles.modalBody}>
              {paymentStatus === 'pending' && (
                <>
                  <h3 style={{marginBottom: '1rem', textAlign: 'center'}}>Select Payment Method (Simulation)</h3>
                  <p style={{fontSize: '0.95rem', color: '#666', textAlign: 'center', marginBottom: '2rem'}}>
                    This is a simulated Razorpay Checkout. Select an outcome to proceed.
                  </p>
                  
                  <div style={styles.paymentOptionsList}>
                    <div style={styles.paymentMethodItem}>
                      <span style={{fontSize: '1.5rem'}}>📱</span>
                      <div>
                        <strong>BHIM UPI / GPay / PhonePe</strong>
                        <p style={{fontSize: '0.8rem', color: '#666', margin: 0}}>Pay securely using any UPI app</p>
                      </div>
                    </div>
                    <div style={styles.paymentMethodItem}>
                      <span style={{fontSize: '1.5rem'}}>💳</span>
                      <div>
                        <strong>Credit or Debit Cards</strong>
                        <p style={{fontSize: '0.8rem', color: '#666', margin: 0}}>Visa, Mastercard, RuPay, Maestro</p>
                      </div>
                    </div>
                  </div>

                  <div style={styles.simulationControls}>
                    <button
                      onClick={simulatePaymentSuccess}
                      className="btn btn-primary"
                      style={styles.simulateSuccessBtn}
                    >
                      🟢 Simulate Success (Mark Paid)
                    </button>
                    <button
                      onClick={simulatePaymentFailure}
                      className="btn btn-secondary"
                      style={styles.simulateFailBtn}
                    >
                      🔴 Simulate Failure
                    </button>
                  </div>
                </>
              )}

              {paymentStatus === 'processing' && (
                <div style={styles.processingState}>
                  <div style={styles.spinner}></div>
                  <h3 style={{marginTop: '1.5rem'}}>Connecting to payment server...</h3>
                  <p style={{color: '#666', marginTop: '0.5rem'}}>Verifying signatures and webhooks.</p>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div style={styles.successState}>
                  <div style={styles.successCheckmark}>✓</div>
                  <h3 style={{color: '#008800'}}>Payment Successful!</h3>
                  <p style={{color: '#555', marginTop: '0.5rem'}}>Order has been placed with the shopkeeper.</p>
                  <p style={{fontSize: '0.85rem', color: '#666'}}>Redirecting to your dashboard...</p>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div style={styles.failedState}>
                  <div style={styles.failedCross}>✗</div>
                  <h3 style={{color: '#CC0000'}}>Payment Failed</h3>
                  <p style={{color: '#555', marginTop: '0.5rem'}}>Transaction cancelled by user or insufficient balance.</p>
                  <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center'}}>
                    <button onClick={() => setPaymentStatus('pending')} className="btn btn-primary">
                      Try Again
                    </button>
                    <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Razorpay Footer */}
            <div style={styles.razorpayFooter}>
              <span>🔒 PCI-DSS Compliant Secure Gateway</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '3rem',
    backgroundColor: 'var(--light-gray)',
    border: 'var(--border-width) solid var(--border-color)',
    borderRadius: 'var(--border-radius-md)',
    padding: '1rem 1.5rem',
  },
  progressStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#999',
  },
  progressActive: {
    color: 'var(--dark-slate)',
    fontWeight: '700',
  },
  stepNum: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '2px solid #CCC',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
  },
  progressActive: {
    color: 'var(--dark-slate)',
    fontWeight: '700',
  },
  // Wait, let's redefine progressActive with stepNum styles:
  // We can inject styles dynamically or use inline conditions
  progressLine: {
    flexGrow: 1,
    height: '2px',
    backgroundColor: '#DDD',
    margin: '0 1rem',
  },
  uploadingBox: {
    padding: '3rem 0',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid var(--light-gray)',
    borderTop: '5px solid var(--dark-slate)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  dropzone: {
    border: '2px dashed var(--dark-slate)',
    borderRadius: 'var(--border-radius-lg)',
    padding: '4rem 2rem',
    backgroundColor: 'var(--light-gray)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
  },
  stepperInput: {
    display: 'flex',
    alignItems: 'center',
  },
  stepperBtn: {
    width: '38px',
    height: '38px',
    border: 'var(--border-width) solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    backgroundColor: 'var(--white)',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  wizardNav: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '2.5rem',
    borderTop: '1px solid #EEE',
    paddingTop: '1.5rem',
  },
  shopsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
  },
  selectShopCard: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '160px',
    boxShadow: 'none',
  },
  shopCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shopRatesLine: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '0.9rem',
    color: '#555',
    margin: '0.75rem 0',
  },
  shopPricePreview: {
    borderTop: '1px solid #EEE',
    paddingTop: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
  },
  previewPriceValue: {
    fontWeight: '700',
    color: 'var(--dark-slate)',
  },
  reviewBlock: {
    backgroundColor: 'var(--light-gray)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-lg)',
    padding: '1.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    marginBottom: '2rem',
  },
  reviewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #E4E4E8',
    paddingBottom: '0.65rem',
  },
  reviewLabel: {
    color: '#666',
  },
  reviewVal: {
    fontWeight: '500',
    textAlign: 'right',
  },
  priceSummaryBox: {
    border: 'var(--border-width) solid var(--border-color)',
    borderRadius: 'var(--border-radius-lg)',
    padding: '1.5rem 2rem',
    backgroundColor: 'var(--white)',
    boxShadow: 'var(--shadow-md)',
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#555',
    marginBottom: '0.6rem',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: 'var(--border-width) dashed var(--border-color)',
    paddingTop: '1rem',
    marginTop: '1rem',
    fontSize: '1.35rem',
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'var(--white)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 5px 25px rgba(0,0,0,0.5)',
    border: '1px solid #444',
  },
  razorpayHeader: {
    backgroundColor: '#1E2337',
    padding: '1.25rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  razorpayAmountCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  modalBody: {
    padding: '2rem',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  paymentOptionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  paymentMethodItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    border: '1px solid #DDD',
    borderRadius: '6px',
    backgroundColor: '#FAF9FB',
    cursor: 'pointer',
  },
  simulationControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  simulateSuccessBtn: {
    backgroundColor: '#008800',
    color: '#FFF',
    borderColor: '#007700',
    boxShadow: 'none',
    padding: '0.65rem',
  },
  simulateFailBtn: {
    backgroundColor: '#FCE8E6',
    color: '#C5221F',
    borderColor: '#C5221F',
    boxShadow: 'none',
    padding: '0.65rem',
  },
  processingState: {
    textAlign: 'center',
    padding: '2rem 0',
  },
  successState: {
    textAlign: 'center',
    padding: '2rem 0',
  },
  successCheckmark: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#D4EDDA',
    color: '#155724',
    fontSize: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem auto',
    fontWeight: 'bold',
  },
  failedState: {
    textAlign: 'center',
    padding: '2rem 0',
  },
  failedCross: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#F8D7DA',
    color: '#721C24',
    fontSize: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem auto',
    fontWeight: 'bold',
  },
  razorpayFooter: {
    backgroundColor: '#F7F6F8',
    padding: '0.75rem',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#888',
    borderTop: '1px solid #EEE',
  }
};
