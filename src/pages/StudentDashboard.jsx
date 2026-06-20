import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockDb } from '../services/mockDb';

export default function StudentDashboard({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadOrders();
    }
  }, [currentUser]);

  const loadOrders = () => {
    const list = mockDb.getOrdersByStudent(currentUser.id);
    setOrders(list);
    
    // Auto-select first active order or refresh selected one if open
    if (selectedOrder) {
      const refreshed = list.find(o => o.id === selectedOrder.id);
      setSelectedOrder(refreshed || null);
    } else if (list.length > 0) {
      const active = list.find(o => o.status !== 'COLLECTED' && o.status !== 'REJECTED');
      if (active) setSelectedOrder(active);
    }
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="badge badge-warning">Pending Payment</span>;
      case 'PLACED':
        return <span className="badge badge-info">Placed & Paid</span>;
      case 'ACCEPTED':
        return <span className="badge badge-info">Accepted</span>;
      case 'PRINTING':
        return <span className="badge badge-warning">Printing</span>;
      case 'READY':
        return <span className="badge badge-success">Ready for Collection</span>;
      case 'COLLECTED':
        return <span className="badge badge-gray">Collected</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected & Refunded</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getStepStatus = (orderStatus, step) => {
    // Steps: 1: PLACED, 2: ACCEPTED/PRINTING, 3: READY, 4: COLLECTED
    const statusMap = {
      'PENDING_PAYMENT': 0,
      'PLACED': 1,
      'ACCEPTED': 2,
      'PRINTING': 2,
      'READY': 3,
      'COLLECTED': 4,
      'REJECTED': -1
    };
    
    const currentStep = statusMap[orderStatus] || 0;
    
    if (currentStep === -1) return 'rejected';
    if (currentStep >= step) return 'completed';
    if (currentStep + 1 === step) return 'current';
    return 'upcoming';
  };

  return (
    <div className="section" style={{flexGrow: 1}}>
      <div className="container">
        {/* Header Block */}
        <div style={styles.dashboardHeader}>
          <div>
            <h2>Welcome back, <span style={{textDecoration: 'underline decoration-2 decoration-[#B9FF66]'}}>{currentUser.name}</span></h2>
            <p style={{color: '#666', marginTop: '0.25rem'}}>Manage your print requests and track collection queues.</p>
          </div>
          <Link to="/student/new-order" className="btn btn-accent" style={styles.newOrderBtn}>
            + New Print Order
          </Link>
        </div>

        {/* Layout split into side-by-side grids */}
        <div className="grid-3" style={{marginTop: '2rem', gap: '2rem'}}>
          {/* Column 1 & 2: Orders List */}
          <div style={{gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
            <div style={styles.sectionTitleBlock}>
              <h3>Your Printing Orders</h3>
              <button onClick={loadOrders} className="btn btn-secondary" style={styles.refreshBtn}>
                🔄 Refresh
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="card" style={styles.emptyCard}>
                <span style={{fontSize: '3rem'}}>🖨️</span>
                <h3>No Orders Placed Yet</h3>
                <p style={{maxWidth: '320px', margin: '0.5rem 0 1.5rem 0'}}>
                  You haven't ordered any prints yet. Save time next time you need photocopies or prints.
                </p>
                <Link to="/student/new-order" className="btn btn-primary">Place Your First Order</Link>
              </div>
            ) : (
              orders.map(order => (
                <div
                  key={order.id}
                  className={`card ${selectedOrder?.id === order.id ? 'card-green' : ''}`}
                  style={{
                    ...styles.orderCard,
                    backgroundColor: selectedOrder?.id === order.id ? 'var(--neon-green)' : 'var(--white)'
                  }}
                  onClick={() => handleSelectOrder(order)}
                >
                  <div style={styles.orderCardHeader}>
                    <div>
                      <span style={styles.orderNumber}>{order.orderNumber}</span>
                      <h4 style={styles.shopName}>{order.shopName}</h4>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div style={styles.orderCardDetails}>
                    <span style={styles.fileDetail}>📄 {order.fileName} ({order.pageCount} pgs × {order.copies} copies)</span>
                    <span style={styles.orderPrice}>Total: <strong>₹{order.calculatedPrice.toFixed(2)}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Column 3: Status Stepper / Order Detail Tracker */}
          <div style={styles.sidebarColumn}>
            {selectedOrder ? (
              <div className="card" style={styles.trackingCard}>
                <h3 style={{marginBottom: '0.5rem'}}>Track Order</h3>
                <span style={{fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '1.5rem'}}>
                  ID: {selectedOrder.orderNumber}
                </span>

                {selectedOrder.status === 'REJECTED' ? (
                  <div style={styles.rejectionBox}>
                    <h4 style={{color: '#CC0000', marginBottom: '0.5rem'}}>⚠️ Order Rejected</h4>
                    <p style={{fontSize: '0.95rem'}}>
                      <strong>Reason:</strong> {selectedOrder.shopRejectionReason || "Machine breakdown or queue overload."}
                    </p>
                    <p style={{fontSize: '0.95rem', marginTop: '0.5rem', fontStyle: 'italic'}}>
                      Your payment has been automatically initiated for refund via Razorpay.
                    </p>
                  </div>
                ) : (
                  /* Stepper list */
                  <div style={styles.stepperContainer}>
                    {/* Step 1: Placed */}
                    <div style={styles.stepItem}>
                      <div style={styles.stepConnectorLine}></div>
                      <div style={{
                        ...styles.stepIndicator,
                        ...styles[`step_${getStepStatus(selectedOrder.status, 1)}`]
                      }}>
                        {getStepStatus(selectedOrder.status, 1) === 'completed' ? '✓' : '1'}
                      </div>
                      <div style={styles.stepText}>
                        <h4 style={styles.stepTitle}>Placed & Paid</h4>
                        <p style={styles.stepDesc}>Order successfully paid via Razorpay and sent to shop.</p>
                      </div>
                    </div>

                    {/* Step 2: Accepted / Printing */}
                    <div style={styles.stepItem}>
                      <div style={styles.stepConnectorLine}></div>
                      <div style={{
                        ...styles.stepIndicator,
                        ...styles[`step_${getStepStatus(selectedOrder.status, 2)}`]
                      }}>
                        {getStepStatus(selectedOrder.status, 2) === 'completed' ? '✓' : '2'}
                      </div>
                      <div style={styles.stepText}>
                        <h4 style={styles.stepTitle}>Processing</h4>
                        <p style={styles.stepDesc}>
                          {selectedOrder.status === 'PRINTING' ? 'Bhaiya is currently printing...' : 'Awaiting shopkeeper acceptance.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Ready */}
                    <div style={styles.stepItem}>
                      <div style={styles.stepConnectorLine}></div>
                      <div style={{
                        ...styles.stepIndicator,
                        ...styles[`step_${getStepStatus(selectedOrder.status, 3)}`]
                      }}>
                        {getStepStatus(selectedOrder.status, 3) === 'completed' ? '✓' : '3'}
                      </div>
                      <div style={styles.stepText}>
                        <h4 style={styles.stepTitle}>Ready for Collection</h4>
                        <p style={styles.stepDesc}>Print complete. Collect it at your convenience from shop premises.</p>
                      </div>
                    </div>

                    {/* Step 4: Collected */}
                    <div style={styles.stepItem}>
                      <div style={{
                        ...styles.stepIndicator,
                        ...styles[`step_${getStepStatus(selectedOrder.status, 4)}`]
                      }}>
                        {getStepStatus(selectedOrder.status, 4) === 'completed' ? '✓' : '4'}
                      </div>
                      <div style={styles.stepText}>
                        <h4 style={styles.stepTitle}>Collected</h4>
                        <p style={styles.stepDesc}>Order handed over to student.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div style={styles.divider}></div>
                
                {/* Specs breakdown inside details pane */}
                <h4 style={{marginBottom: '0.75rem'}}>Order Specs</h4>
                <table style={styles.specsTable}>
                  <tbody>
                    <tr>
                      <td style={styles.tdLabel}>Shop:</td>
                      <td style={styles.tdValue}>{selectedOrder.shopName}</td>
                    </tr>
                    <tr>
                      <td style={styles.tdLabel}>File:</td>
                      <td style={styles.tdValue} title={selectedOrder.fileName}>{selectedOrder.fileName}</td>
                    </tr>
                    <tr>
                      <td style={styles.tdLabel}>Print Type:</td>
                      <td style={styles.tdValue} style={{textTransform: 'uppercase'}}>{selectedOrder.printType}</td>
                    </tr>
                    <tr>
                      <td style={styles.tdLabel}>Pages / Copies:</td>
                      <td style={styles.tdValue}>{selectedOrder.pageCount} pgs × {selectedOrder.copies} copies</td>
                    </tr>
                    <tr>
                      <td style={styles.tdLabel}>Layout:</td>
                      <td style={styles.tdValue}>{selectedOrder.doubleSided ? 'Double-Sided' : 'Single-Sided'}</td>
                    </tr>
                    <tr>
                      <td style={styles.tdLabel}>Binding:</td>
                      <td style={styles.tdValue}>{selectedOrder.bindingOption}</td>
                    </tr>
                    {selectedOrder.studentComment && (
                      <tr>
                        <td style={styles.tdLabel}>Comment:</td>
                        <td style={styles.tdValue} style={{fontStyle: 'italic', fontSize: '0.9rem'}}>{selectedOrder.studentComment}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={styles.tdLabel}>Price Paid:</td>
                      <td style={styles.tdValue} style={{fontWeight: 'bold'}}>₹{selectedOrder.calculatedPrice.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={styles.noSelectedCard}>
                <span style={{fontSize: '2rem'}}>👉</span>
                <p>Select any order from the list to track its live printing status and view print specifications.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    borderBottom: '1px solid #EEE',
    paddingBottom: '1.5rem',
  },
  newOrderBtn: {
    padding: '0.65rem 1.5rem',
  },
  sectionTitleBlock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshBtn: {
    padding: '0.35rem 0.75rem',
    fontSize: '0.9rem',
    boxShadow: '2px 2px 0px #191A23',
  },
  emptyCard: {
    textAlign: 'center',
    padding: '4rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  orderCard: {
    cursor: 'pointer',
  },
  orderCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  orderNumber: {
    fontSize: '0.85rem',
    color: '#555',
    fontWeight: '500',
  },
  shopName: {
    fontSize: '1.35rem',
  },
  orderCardDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
    fontSize: '1rem',
  },
  fileDetail: {
    color: '#444',
  },
  orderPrice: {
    color: 'var(--dark-slate)',
  },
  sidebarColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  noSelectedCard: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
    color: '#666',
  },
  trackingCard: {
    position: 'sticky',
    top: '100px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#DDD',
    margin: '1.5rem 0',
  },
  rejectionBox: {
    backgroundColor: '#FFF0F0',
    border: '1px solid #FF3333',
    borderRadius: 'var(--border-radius-md)',
    padding: '1rem',
    marginBottom: '1rem',
  },
  stepperContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    position: 'relative',
    paddingLeft: '0.5rem',
  },
  stepItem: {
    display: 'flex',
    gap: '1.25rem',
    position: 'relative',
  },
  stepConnectorLine: {
    position: 'absolute',
    left: '16px',
    top: '32px',
    width: '2px',
    height: 'calc(100% + 0.5rem)',
    backgroundColor: '#191A23',
    zIndex: 1,
  },
  stepIndicator: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    border: '2px solid var(--dark-slate)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.95rem',
    zIndex: 2,
  },
  step_completed: {
    backgroundColor: 'var(--neon-green)',
    color: 'var(--dark-slate)',
  },
  step_current: {
    backgroundColor: 'var(--dark-slate)',
    color: 'var(--white)',
  },
  step_upcoming: {
    backgroundColor: 'var(--white)',
    color: '#AAA',
    borderColor: '#CCC',
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: '0.85rem',
    color: '#555',
    marginBottom: 0,
  },
  specsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.95rem',
  },
  tdLabel: {
    color: '#666',
    padding: '0.35rem 0',
    verticalAlign: 'top',
    width: '35%',
  },
  tdValue: {
    fontWeight: '500',
    padding: '0.35rem 0',
    textAlign: 'right',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
};
