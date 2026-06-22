import React, { useState, useEffect } from 'react';
import { shopService, orderService } from '../services/api';

export default function ShopDashboard({ currentUser }) {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // queue, pricing
  const [queueFilter, setQueueFilter] = useState('placed'); // placed, active, ready, completed
  
  // Pricing states
  const [priceBw, setPriceBw] = useState('');
  const [priceColor, setPriceColor] = useState('');
  const [spiralPrice, setSpiralPrice] = useState('');
  const [staplePrice, setStaplePrice] = useState('');
  const [pricingSuccess, setPricingSuccess] = useState(false);

  // Reject Modal State
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadShopData();
    }
  }, [currentUser]);

  const loadShopData = async () => {
    try {
      const shopRes = await shopService.getMyShop();
      const ownerShop = shopRes.data;
      setShop(ownerShop);
      
      if (ownerShop.price_list) {
         setPriceBw(ownerShop.price_list.bw_rate_per_page);
         setPriceColor(ownerShop.price_list.color_rate_per_page);
      }
      
      if (ownerShop.binding_options) {
         const spiral = ownerShop.binding_options.find(b => b.name === 'Spiral Binding');
         const staple = ownerShop.binding_options.find(b => b.name === 'Stapled');
         setSpiralPrice(spiral ? spiral.price : 30);
         setStaplePrice(staple ? staple.price : 5);
      }

      const ordersRes = await orderService.getShopOrders();
      setOrders(ordersRes.data.results || ordersRes.data);
    } catch (err) {
      console.error("Failed to load shop data", err);
    }
  };

  const handleStatusToggle = async (newStatus) => {
    if (shop) {
      try {
        const res = await shopService.updateStatus(newStatus);
        setShop(res.data);
      } catch(err) {
        alert("Failed to update status");
      }
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await orderService.accept(orderId);
      loadShopData();
    } catch (err) { alert("Action failed"); }
  };

  const handleRejectClick = (orderId) => {
    setRejectOrderId(orderId);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (rejectOrderId && rejectReason) {
      try {
        await orderService.reject(rejectOrderId, rejectReason);
        setRejectOrderId(null);
        setRejectReason('');
        loadShopData();
      } catch (err) { alert("Reject failed"); }
    }
  };

  const handleMarkReady = async (orderId) => {
    try {
      await orderService.markReady(orderId);
      loadShopData();
    } catch (err) { alert("Action failed"); }
  };

  const handleMarkCollected = async (orderId) => {
    try {
      await orderService.markCollected(orderId);
      loadShopData();
    } catch (err) { alert("Action failed"); }
  };

  const handlePricingSave = async (e) => {
    e.preventDefault();
    if (shop) {
      try {
        await shopService.updatePricing({
          bw_rate_per_page: priceBw,
          color_rate_per_page: priceColor,
          double_sided_supported: true,
          double_sided_rate_per_page: (parseFloat(priceBw) * 0.8).toFixed(2),
          minimum_order_amount: '10.00'
        });
        
        setPricingSuccess(true);
        setTimeout(() => setPricingSuccess(false), 2000);
        loadShopData();
      } catch(err) {
        alert("Failed to update pricing");
      }
    }
  };

  const filteredOrders = () => {
    switch (queueFilter) {
      case 'placed':
        return orders.filter(o => o.status === 'PLACED');
      case 'active':
        return orders.filter(o => o.status === 'ACCEPTED');
      case 'ready':
        return orders.filter(o => o.status === 'READY');
      case 'completed':
        return orders.filter(o => o.status === 'READY_FOR_COLLECTION' || o.status === 'REJECTED');
      default:
        return orders;
    }
  };

  if (!shop) {
    return (
      <div className="section">
        <div className="container" style={{textAlign: 'center'}}>
          <h2>Shop Profile Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="section" style={{flexGrow: 1}}>
      <div className="container">
        
        {/* Shop Name & Status Header */}
        <div className="card-green" style={styles.shopHeaderCard}>
          <div>
            <span style={{fontSize: '0.9rem', color: 'var(--dark-slate)', fontWeight: '500'}}>SHOP CONTROL PANEL</span>
            <h2 style={{marginTop: '0.25rem'}}>{shop.name}</h2>
            <p style={{fontSize: '1rem', marginTop: '0.25rem'}}>📍 {shop.address}</p>
          </div>
          
          {/* Shop Status Controllers */}
          <div style={styles.statusToggleContainer}>
            <span style={{fontWeight: '700', fontSize: '1rem'}}>SHOP STATUS:</span>
            <div style={styles.toggleGroup}>
              <button
                onClick={() => handleStatusToggle('OPEN')}
                className="btn"
                style={{
                  ...styles.statusBtn,
                  backgroundColor: shop.status === 'OPEN' ? '#008800' : 'var(--white)',
                  color: shop.status === 'OPEN' ? 'var(--white)' : 'var(--dark-slate)',
                  borderColor: 'var(--dark-slate)'
                }}
              >
                🟢 Open
              </button>
              <button
                onClick={() => handleStatusToggle('CLOSED')}
                className="btn"
                style={{
                  ...styles.statusBtn,
                  backgroundColor: shop.status === 'CLOSED' ? '#CC0000' : 'var(--white)',
                  color: shop.status === 'CLOSED' ? 'var(--white)' : 'var(--dark-slate)',
                  borderColor: 'var(--dark-slate)'
                }}
              >
                🔴 Closed
              </button>
              <button
                onClick={() => handleStatusToggle('HOLIDAY')}
                className="btn"
                style={{
                  ...styles.statusBtn,
                  backgroundColor: shop.status === 'HOLIDAY' ? '#FF8800' : 'var(--white)',
                  color: shop.status === 'HOLIDAY' ? 'var(--white)' : 'var(--dark-slate)',
                  borderColor: 'var(--dark-slate)'
                }}
              >
                🟡 Holiday
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={styles.tabsContainer}>
          <button
            onClick={() => setActiveTab('queue')}
            className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
            style={styles.tabBtn}
          >
            📋 Order Queue ({orders.filter(o => o.status !== 'READY_FOR_COLLECTION' && o.status !== 'REJECTED').length})
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`btn ${activeTab === 'pricing' ? 'btn-primary' : 'btn-secondary'}`}
            style={styles.tabBtn}
          >
            💰 Manage Pricing & Services
          </button>
        </div>

        {/* Tab 1: Order Queue */}
        {activeTab === 'queue' && (
          <div>
            {/* Queue Filter Bar */}
            <div style={styles.filterBar}>
              <button
                onClick={() => setQueueFilter('placed')}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: queueFilter === 'placed' ? 'var(--neon-green)' : 'transparent',
                  fontWeight: queueFilter === 'placed' ? '700' : '500'
                }}
              >
                New Incoming ({orders.filter(o => o.status === 'PLACED').length})
              </button>
              <button
                onClick={() => setQueueFilter('active')}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: queueFilter === 'active' ? 'var(--neon-green)' : 'transparent',
                  fontWeight: queueFilter === 'active' ? '700' : '500'
                }}
              >
                In-Progress ({orders.filter(o => o.status === 'ACCEPTED').length})
              </button>
              <button
                onClick={() => setQueueFilter('completed')}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: queueFilter === 'completed' ? 'var(--neon-green)' : 'transparent',
                  fontWeight: queueFilter === 'completed' ? '700' : '500'
                }}
              >
                History ({orders.filter(o => o.status === 'READY_FOR_COLLECTION' || o.status === 'REJECTED').length})
              </button>
            </div>

            {/* List of Orders */}
            <div style={styles.ordersListContainer}>
              {filteredOrders().length === 0 ? (
                <div className="card" style={{textAlign: 'center', padding: '3rem 1.5rem'}}>
                  <span style={{fontSize: '2rem'}}>📭</span>
                  <h4 style={{marginTop: '1rem'}}>No orders in this queue.</h4>
                </div>
              ) : (
                filteredOrders().map(order => (
                  <div key={order.id} className="card" style={styles.queueOrderCard}>
                    <div style={styles.orderHeader}>
                      <div>
                        <span style={styles.orderNumber}>{order.order_number}</span>
                        <h4 style={{fontSize: '1.25rem', marginTop: '0.15rem'}}>Student: {order.student_name}</h4>
                      </div>
                      <span style={styles.orderTime}>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>

                    <div style={styles.orderBodyGrid}>
                      <div style={styles.fileDetailBlock}>
                        <strong>📄 File:</strong> {order.files?.[0]?.original_filename} ({order.fileSize})
                      </div>
                      <div style={styles.specsBlock}>
                        <strong>Specs:</strong>{' '}
                        <span style={{textTransform: 'uppercase'}}>{order.color_mode}</span> |{' '}
                        {order.page_count} pgs | {order.copies} copies |{' '}
                        {order.doubleSided ? 'Double-Sided' : 'Single-Sided'} |{' '}
                        Binding: {order.bindingOption}
                      </div>
                      
                      {order.studentComment && (
                        <div style={styles.commentBlock}>
                          <strong>Instruction:</strong> "{order.studentComment}"
                        </div>
                      )}
                      {order.status === 'REJECTED' && (
                        <div style={styles.rejectBlock}>
                          <strong>Rejection Reason:</strong> "{order.shopRejectionReason}"
                        </div>
                      )}
                    </div>

                    <div style={styles.orderFooter}>
                      <span style={styles.footerPrice}>
                        Total Calculated: <strong>₹{Number(order.total_amount || 0).toFixed(2)}</strong>
                      </span>
                      
                      <div style={styles.actionsBlock}>
                        {order.status === 'PLACED' && (
                          <>
                            <button
                              onClick={() => handleRejectClick(order.id)}
                              className="btn btn-secondary"
                              style={{padding: '0.4rem 1rem', fontSize: '0.95rem', borderColor: '#CC0000', color: '#CC0000'}}
                            >
                              Reject Order
                            </button>
                            <button
                              onClick={() => handleAcceptOrder(order.id)}
                              className="btn btn-primary"
                              style={{padding: '0.4rem 1.25rem', fontSize: '0.95rem'}}
                            >
                              Accept Order
                            </button>
                          </>
                        )}
                        {order.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleMarkReady(order.id)}
                            className="btn btn-accent"
                            style={{padding: '0.5rem 1.5rem', fontSize: '1rem', fontWeight: 'bold'}}
                          >
                            🖨️ Mark Ready for Collection
                          </button>
                        )}
                        {order.status === 'READY_FOR_COLLECTION' && (
                          <span style={{color: '#008800', fontWeight: 'bold'}}>✓ Completed / Ready</span>
                        )}
                        {order.status === 'REJECTED' && (
                          <span style={{color: '#CC0000', fontWeight: 'bold'}}>✗ Rejected & Refunded</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Pricing Configuration */}
        {activeTab === 'pricing' && (
          <div className="card" style={{maxWidth: '600px', margin: '0 auto'}}>
            <h2>Configure Rates & Services</h2>
            <p style={{color: '#666', marginBottom: '2rem'}}>
              These prices are live. New print requests placed by students will calculate costs server-side based on these rates.
            </p>

            {pricingSuccess && (
              <div style={styles.successAlert}>
                ✅ Rates updated successfully!
              </div>
            )}

            <form onSubmit={handlePricingSave} className="bw-form">
              <div className="form-group">
                <label>Black & White Price per page (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={priceBw}
                  onChange={(e) => setPriceBw(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Color Price per page (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={priceColor}
                  onChange={(e) => setPriceColor(e.target.value)}
                  required
                />
              </div>

              <h3 style={{marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem'}}>Binding Charges</h3>

              <div className="form-group">
                <label>Spiral Binding Flat Charge (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={spiralPrice}
                  onChange={(e) => setSpiralPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Stapling Service Flat Charge (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={staplePrice}
                  onChange={(e) => setStaplePrice(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1.5rem'}}>
                Save Configuration
              </button>
            </form>
          </div>
        )}

      </div>

      {/* REJECT COMMENT MODAL OVERLAY */}
      {rejectOrderId && (
        <div style={styles.modalOverlay}>
          <div className="bw-container" style={{maxWidth: '400px', margin: 0, padding: '2rem'}}>
            <h3 style={{marginBottom: '1rem'}}>Reason for Rejection</h3>
            <p style={{fontSize: '0.875rem', color: '#666', marginBottom: '1.25rem'}}>
              This message will be shown to the student, and they will be refunded via Razorpay.
            </p>
            
            <div className="form-group">
              <label>Rejection Reason</label>
              <select
                className="form-input"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              >
                <option value="">-- Select Reason --</option>
                <option value="Machine down / under maintenance">Machine Down / Maintenance</option>
                <option value="Paper out of stock">Paper Out of Stock</option>
                <option value="Cannot execute requested binding option">Cannot Execute Binding</option>
                <option value="Queue backlog too long right now">Shop Too Busy</option>
                <option value="Shop closing early today">Closing Early</option>
              </select>
            </div>

            <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
              <button
                onClick={() => setRejectOrderId(null)}
                className="btn btn-secondary"
                style={{flex: 1}}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="btn btn-primary"
                disabled={!rejectReason}
                style={{flex: 1, backgroundColor: '#CC0000', borderColor: '#CC0000', color: '#FFF'}}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  shopHeaderCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '2rem',
    marginBottom: '2rem',
  },
  statusToggleContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    backgroundColor: 'var(--white)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-md)',
    padding: '1rem 1.25rem',
    boxShadow: 'var(--shadow-sm)',
  },
  toggleGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  statusBtn: {
    padding: '0.4rem 1rem',
    fontSize: '0.95rem',
    boxShadow: 'none',
  },
  tabsContainer: {
    display: 'flex',
    gap: '1.25rem',
    marginBottom: '2.5rem',
    borderBottom: '1px solid #DDD',
    paddingBottom: '1rem',
  },
  tabBtn: {
    padding: '0.65rem 1.5rem',
  },
  filterBar: {
    display: 'flex',
    gap: '0.25rem',
    border: '2px solid var(--border-color)',
    borderRadius: 'var(--border-radius-md)',
    overflow: 'hidden',
    marginBottom: '2rem',
    backgroundColor: 'var(--white)',
  },
  filterBtn: {
    flex: 1,
    padding: '0.75rem 0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-sans)',
    textAlign: 'center',
    borderRight: '1px solid #CCC',
    backgroundColor: 'transparent',
    transition: 'background-color 0.2s',
  },
  ordersListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  queueOrderCard: {
    transition: 'none',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #EEE',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
  },
  orderNumber: {
    fontSize: '0.85rem',
    color: '#666',
    fontWeight: '500',
  },
  orderTime: {
    fontSize: '0.9rem',
    color: '#666',
  },
  orderBodyGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    fontSize: '1.05rem',
    marginBottom: '1.25rem',
  },
  fileDetailBlock: {
    color: 'var(--dark-slate)',
  },
  specsBlock: {
    color: '#444',
  },
  commentBlock: {
    backgroundColor: '#F7F6F8',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    borderLeft: '3px solid var(--dark-slate)',
    fontSize: '0.95rem',
    fontStyle: 'italic',
  },
  rejectBlock: {
    backgroundColor: '#FFF0F0',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    borderLeft: '3px solid #CC0000',
    fontSize: '0.95rem',
    color: '#CC0000',
  },
  orderFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    borderTop: '1px solid #EEE',
    paddingTop: '1rem',
  },
  footerPrice: {
    fontSize: '1rem',
  },
  actionsBlock: {
    display: 'flex',
    gap: '0.75rem',
  },
  successAlert: {
    backgroundColor: '#F0FFF0',
    border: '1px solid #33CC33',
    color: '#008800',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--border-radius-md)',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }
};
