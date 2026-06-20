import React, { useState, useEffect } from 'react';
import { mockDb } from '../services/mockDb';

export default function SuperAdmin() {
  const [stats, setStats] = useState({});
  const [pendingShops, setPendingShops] = useState([]);
  const [allShops, setAllShops] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, approvals, orders
  
  // Filters
  const [shopFilter, setShopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = () => {
    setStats(mockDb.getStats());
    
    // Fetch all shops (both approved and pending)
    const shopsList = mockDb.getShops(false);
    setAllShops(shopsList);
    setPendingShops(shopsList.filter(s => !s.isApproved));
    
    // Fetch all orders
    setAllOrders(mockDb.getOrders());
  };

  const handleApproveShop = (shopId) => {
    mockDb.approveShop(shopId);
    loadAdminData();
  };

  const filteredOrders = () => {
    let list = [...allOrders];
    if (shopFilter) {
      list = list.filter(o => o.shopId === shopFilter);
    }
    if (statusFilter) {
      list = list.filter(o => o.status === statusFilter);
    }
    return list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="badge badge-warning">Pending Payment</span>;
      case 'PLACED':
        return <span className="badge badge-info">Placed</span>;
      case 'ACCEPTED':
        return <span className="badge badge-info">Accepted</span>;
      case 'PRINTING':
        return <span className="badge badge-warning">Printing</span>;
      case 'READY':
        return <span className="badge badge-success">Ready</span>;
      case 'COLLECTED':
        return <span className="badge badge-gray">Collected</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="section" style={{flexGrow: 1}}>
      <div className="container">
        
        {/* Admin Header */}
        <div style={styles.headerRow}>
          <div>
            <h2>Super Admin Dashboard</h2>
            <p style={{color: '#666'}}>Oversee platform shops, verify new sellers, and track platform-wide order activities.</p>
          </div>
          <button onClick={loadAdminData} className="btn btn-secondary">
            🔄 Sync Data
          </button>
        </div>

        {/* Tab Controls */}
        <div style={styles.tabsContainer}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={styles.tabBtn}
          >
            📊 Analytics Summary
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`btn ${activeTab === 'approvals' ? 'btn-primary' : 'btn-secondary'}`}
            style={styles.tabBtn}
          >
            🔔 Shop Approvals ({pendingShops.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={styles.tabBtn}
          >
            🖨️ Platform Orders ({allOrders.length})
          </button>
        </div>

        {/* Tab 1: Dashboard Stats */}
        {activeTab === 'dashboard' && stats && (
          <div>
            {/* 2x3 Grid of stats cards */}
            <div className="grid-3" style={{marginBottom: '3rem'}}>
              {/* GMV */}
              <div className="card-green" style={styles.statsCard}>
                <span style={styles.statsLabel}>Gross Merchandise Value (GMV)</span>
                <span style={styles.statsValue}>₹{(stats.totalGmv || 0).toFixed(2)}</span>
                <p style={{fontSize: '0.85rem', color: '#333', marginTop: '0.5rem'}}>Total volume processed online</p>
              </div>

              {/* Orders */}
              <div className="card" style={styles.statsCard}>
                <span style={styles.statsLabel}>Total Print Orders</span>
                <span style={styles.statsValue}>{stats.totalOrdersCount || 0}</span>
                <p style={{fontSize: '0.85rem', color: '#666', marginTop: '0.5rem'}}>
                  {stats.paidOrdersCount || 0} Paid &middot; {stats.completedOrdersCount || 0} Collected
                </p>
              </div>

              {/* Shops */}
              <div className="card" style={styles.statsCard}>
                <span style={styles.statsLabel}>Registered Print Shops</span>
                <span style={styles.statsValue}>{stats.shopsCount || 0}</span>
                <p style={{fontSize: '0.85rem', color: '#666', marginTop: '0.5rem'}}>
                  {stats.pendingShopsCount || 0} Pending verification
                </p>
              </div>
            </div>

            {/* Quick Actions / Activity logs */}
            <div className="card">
              <h3>System Overview</h3>
              <p style={{margin: '0.5rem 0 1.5rem 0', color: '#666'}}>Core database and system health logs.</p>
              <div style={styles.dbInfoBlock}>
                <div style={styles.infoRow}>
                  <span>Database engine:</span>
                  <strong>PostgreSQL (Local Mocked State)</strong>
                </div>
                <div style={styles.infoRow}>
                  <span>Registered students:</span>
                  <strong>{stats.studentsCount || 0}</strong>
                </div>
                <div style={styles.infoRow}>
                  <span>Platform fee:</span>
                  <strong>0.00% (Launch Phase)</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Approvals Queue */}
        {activeTab === 'approvals' && (
          <div>
            <h3>Pending Shopkeeper Onboardings</h3>
            <p style={{color: '#666', marginBottom: '2rem'}}>Verify and approve partner profiles to list them on the public marketplace.</p>

            <div style={styles.approvalsList}>
              {pendingShops.length === 0 ? (
                <div className="card" style={{textAlign: 'center', padding: '3rem'}}>
                  <span style={{fontSize: '2rem'}}>✓</span>
                  <h4 style={{marginTop: '1rem'}}>All shop signups verified. Approvals queue is clear!</h4>
                </div>
              ) : (
                pendingShops.map(shop => (
                  <div key={shop.id} className="card grid-2" style={styles.approvalCard}>
                    <div>
                      <span className="badge badge-warning" style={{marginBottom: '0.5rem'}}>Awaiting Verification</span>
                      <h4 style={{fontSize: '1.4rem'}}>{shop.name}</h4>
                      <p style={{fontSize: '0.95rem', color: '#444', marginTop: '0.25rem'}}>📍 Address: {shop.address}, {shop.area}</p>
                      
                      <div style={styles.shopOwnerDetails}>
                        <span>📞 Phone: {shop.phone}</span>
                      </div>
                    </div>

                    <div style={styles.approvalActionsCol}>
                      <div style={{textAlign: 'right', marginBottom: '1.25rem'}}>
                        <span style={{fontSize: '0.9rem', color: '#666', display: 'block'}}>Configured Rates:</span>
                        <strong>B&W: ₹{shop.pricePerBw}/pg &bull; Color: ₹{shop.pricePerColor}/pg</strong>
                      </div>
                      <button
                        onClick={() => handleApproveShop(shop.id)}
                        className="btn btn-primary"
                        style={{width: '100%', maxWidth: '240px'}}
                      >
                        Approve & Enable Shop
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Platform Orders Logger */}
        {activeTab === 'orders' && (
          <div>
            <div style={styles.ordersHeaderRow}>
              <h3>Platform Transactions Log</h3>
              
              {/* Filters Box */}
              <div style={styles.filtersBox}>
                <select
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  style={styles.filterDropdown}
                >
                  <option value="">All Shops</option>
                  {allShops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={styles.filterDropdown}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING_PAYMENT">Pending Payment</option>
                  <option value="PLACED">Placed</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PRINTING">Printing</option>
                  <option value="READY">Ready</option>
                  <option value="COLLECTED">Collected</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {/* Platform wide transactions logger */}
            <div className="card" style={{padding: 0, overflowX: 'auto'}}>
              <table style={styles.adminTable}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>Order ID</th>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Shop</th>
                    <th style={styles.th}>Print specs</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders().length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{padding: '3rem', textAlign: 'center', color: '#666'}}>
                        No transactions match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders().map(order => (
                      <tr key={order.id} style={styles.tableRow}>
                        <td style={styles.td}><strong>{order.orderNumber}</strong></td>
                        <td style={styles.td}>{order.studentName}</td>
                        <td style={styles.td}>{order.shopName}</td>
                        <td style={styles.td}>
                          <span style={{fontSize: '0.85rem'}}>
                            {order.fileName.slice(0, 15)}... &bull;{' '}
                            {order.printType.toUpperCase()} &bull;{' '}
                            {order.pageCount} pgs × {order.copies}
                          </span>
                        </td>
                        <td style={styles.td}><strong>₹{order.calculatedPrice.toFixed(2)}</strong></td>
                        <td style={styles.td}>{getStatusBadge(order.status)}</td>
                        <td style={styles.td}>
                          <span style={{fontSize: '0.85rem'}}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    borderBottom: '1px solid #EEE',
    paddingBottom: '1.5rem',
    marginBottom: '2rem',
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
  statsCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '1.75rem 2rem',
    minHeight: '140px',
  },
  statsLabel: {
    fontSize: '0.9rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statsValue: {
    fontSize: '2.25rem',
    fontWeight: '700',
    marginTop: '0.25rem',
  },
  dbInfoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    backgroundColor: 'var(--light-gray)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-md)',
    padding: '1.25rem 1.5rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1rem',
  },
  approvalsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  approvalCard: {
    alignItems: 'center',
    transition: 'none',
  },
  shopOwnerDetails: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '0.9rem',
    color: '#555',
    marginTop: '0.5rem',
  },
  approvalActionsCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  ordersHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  filtersBox: {
    display: 'flex',
    gap: '0.75rem',
  },
  filterDropdown: {
    padding: '0.5rem 1rem',
    border: '2px solid var(--border-color)',
    borderRadius: 'var(--border-radius-md)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-sans)',
    backgroundColor: 'var(--white)',
  },
  adminTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeadRow: {
    borderBottom: '2px solid var(--border-color)',
    backgroundColor: 'var(--light-gray)',
  },
  th: {
    padding: '1rem 1.25rem',
    fontWeight: '700',
    fontSize: '0.95rem',
  },
  tableRow: {
    borderBottom: '1px solid #EEE',
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.95rem',
  }
};
