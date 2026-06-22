import React, { useState, useEffect } from 'react';
import { adminService, shopService } from '../services/api';

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

  const loadAdminData = async () => {
    try {
      const statsRes = await adminService.getAnalytics();
      setStats({
        totalGmv: statsRes.data.orders.total_revenue,
        totalOrdersCount: statsRes.data.orders.total_orders,
        shopsCount: statsRes.data.users.approved_shops,
        pendingShopsCount: statsRes.data.users.pending_shop_approvals,
        studentsCount: statsRes.data.users.total_students,
      });
      
      const pendingRes = await adminService.getPendingShops();
      setPendingShops(pendingRes.data.results || pendingRes.data);
      
      const shopsRes = await shopService.getPublicList();
      setAllShops(shopsRes.data.results || shopsRes.data);
      
      const ordersRes = await adminService.getAllOrders();
      setAllOrders(ordersRes.data.results || ordersRes.data);
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  const handleApproveShop = async (shopId) => {
    try {
      await adminService.approveShop(shopId);
      loadAdminData();
    } catch (err) {
      alert("Failed to approve shop");
    }
  };

  const filteredOrders = () => {
    let list = [...allOrders];
    if (shopFilter) {
      list = list.filter(o => o.shop_name === shopFilter || o.shop_id === shopFilter);
    }
    if (statusFilter) {
      list = list.filter(o => o.status === statusFilter);
    }
    return list; // already sorted by backend
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
      case 'READY_FOR_COLLECTION':
        return <span className="badge badge-success">Ready</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const downloadCSV = () => {
    const ordersToExport = filteredOrders();
    if (ordersToExport.length === 0) {
      alert("No orders to download with the current filters.");
      return;
    }

    // Define CSV headers
    const headers = [
      "Order ID", "Student", "Shop", "Color Mode", 
      "Page Count", "Copies", "Amount (INR)", "Status", "Date"
    ];

    // Map orders to CSV rows
    const rows = ordersToExport.map(order => [
      order.order_number,
      `"${order.student_name}"`,
      `"${order.shop_name}"`,
      order.color_mode,
      order.page_count,
      order.copies,
      Number(order.total_amount || 0).toFixed(2),
      order.status,
      new Date(order.created_at).toLocaleString()
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `platform_orders_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            🔔 Shop Approvals ({pendingShops ? pendingShops.length : 0})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={styles.tabBtn}
          >
            🖨️ Platform Orders ({allOrders ? allOrders.length : 0})
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
                <span style={styles.statsValue}>₹{Number(stats.totalGmv || 0).toFixed(2)}</span>
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
              {pendingShops && pendingShops.length === 0 ? (
                <div className="card" style={{textAlign: 'center', padding: '3rem'}}>
                  <span style={{fontSize: '2rem'}}>✓</span>
                  <h4 style={{marginTop: '1rem'}}>All shop signups verified. Approvals queue is clear!</h4>
                </div>
              ) : (
                pendingShops && pendingShops.map(shop => (
                  <div key={shop.id} className="card grid-2" style={styles.approvalCard}>
                    <div>
                      <span className="badge badge-warning" style={{marginBottom: '0.5rem'}}>Awaiting Verification</span>
                      <h4 style={{fontSize: '1.4rem'}}>{shop.name}</h4>
                      <p style={{fontSize: '0.95rem', color: '#444', marginTop: '0.25rem'}}>📍 Address: {shop.address}, {shop.area}</p>
                      
                      <div style={styles.shopOwnerDetails}>
                        <span>📞 Phone: {shop.phone || shop.contact_phone}</span>
                      </div>
                    </div>

                    <div style={styles.approvalActionsCol}>
                      <div style={{textAlign: 'right', marginBottom: '1.25rem'}}>
                        <span style={{fontSize: '0.9rem', color: '#666', display: 'block'}}>Configured Rates:</span>
                        <strong>B&W: ₹{shop.price_list?.bw_rate_per_page}/pg &bull; Color: ₹{shop.price_list?.color_rate_per_page}/pg</strong>
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
                  {allShops && allShops.map(s => (
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
                  <option value="READY_FOR_COLLECTION">Ready</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                
                <button onClick={downloadCSV} className="btn btn-secondary" style={{marginLeft: '0.5rem'}}>
                  📥 Download CSV
                </button>
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
                  {filteredOrders() && filteredOrders().length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{padding: '3rem', textAlign: 'center', color: '#666'}}>
                        No transactions match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders() && filteredOrders().map(order => (
                      <tr key={order.id} style={styles.tableRow}>
                        <td style={styles.td}><strong>{order.order_number}</strong></td>
                        <td style={styles.td}>{order.student_name}</td>
                        <td style={styles.td}>{order.shop_name}</td>
                        <td style={styles.td}>
                          <span style={{fontSize: '0.85rem'}}>
                            {order.files?.[0]?.original_filename?.slice(0, 15) || 'Document'}... &bull;{' '}
                            {order.color_mode?.toUpperCase()} &bull;{' '}
                            {order.page_count} pgs × {order.copies}
                          </span>
                        </td>
                        <td style={styles.td}><strong>₹{Number(order.total_amount || 0).toFixed(2)}</strong></td>
                        <td style={styles.td}>{getStatusBadge(order.status)}</td>
                        <td style={styles.td}>
                          <span style={{fontSize: '0.85rem'}}>
                            {new Date(order.created_at).toLocaleDateString()}
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
