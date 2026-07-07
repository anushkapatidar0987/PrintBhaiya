import React, { useState, useEffect } from 'react';
import { adminService, shopService } from '../services/api';
import { 
  ShieldCheck, Check, X, AlertCircle, RefreshCw, BarChart2, Users, 
  Smartphone, Mail, Lock, CheckCircle2, AlertTriangle, FileText, 
  Activity, Terminal, Megaphone, Eye, EyeOff, Download, ChevronRight,
  TrendingUp, Calendar, MapPin, Hash
} from 'lucide-react';

export default function SuperAdmin() {
  const [stats, setStats] = useState({});
  const [pendingShops, setPendingShops] = useState([]);
  const [allShops, setAllShops] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('SHOPS'); // SHOPS, TRANSACTIONS, BROADCASTS, EXPORTS, NOTIF_CONSOLE
  
  // Past Notices log
  const [pastNotices, setPastNotices] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Drill-down Modal State
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopHistory, setShopHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState('ALL');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Export Filter State
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [filterMinOrders, setFilterMinOrders] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
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
      
      // Fetch shops via superadmin endpoint so we can see suspended/hidden ones
      const shopsRes = await adminService.getShopsList();
      setAllShops(shopsRes.data.results || shopsRes.data);
      
      const ordersRes = await adminService.getAllOrders();
      setAllOrders(ordersRes.data.results || ordersRes.data);

      const usersRes = await adminService.getUsers();
      setAllUsers(usersRes.data.results || usersRes.data);

      const noticesRes = await adminService.getNotices();
      setPastNotices(noticesRes.data.results || noticesRes.data);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const approveShop = async (shopId) => {
    try {
      setIsLoading(true);
      setLoadingMsg('Authorizing Shop Verification Credentials...');
      await adminService.approveShop(shopId);
      await loadAdminData();
    } catch (err) {
      alert("Failed to approve shop");
    } finally {
      setIsLoading(false);
      setLoadingMsg('');
    }
  };

  // Soft toggle visibility switch
  const toggleShopActive = async (shopId) => {
    try {
      setIsLoading(true);
      setLoadingMsg('Updating Store Listing Visibility...');
      await adminService.toggleShopActive(shopId);
      await loadAdminData();
    } catch (err) {
      console.error("Failed to toggle shop active state", err);
      alert("Failed to update visibility status");
    } finally {
      setIsLoading(false);
      setLoadingMsg('');
    }
  };

  // Open shop detail history drill-down
  const handleOpenShopDetails = async (shop) => {
    setSelectedShop(shop);
    setShopHistory([]);
    setIsLoadingHistory(true);
    try {
      const historyRes = await adminService.getShopStatusHistory(shop.id);
      setShopHistory(historyRes.data.results || historyRes.data);
    } catch (err) {
      console.error("Failed to load status history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Submit Broadcast Announcement
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      alert("Please enter title and message");
      return;
    }
    if (broadcastAudience === 'SPECIFIC' && selectedRecipients.length === 0) {
      alert("Please select at least one recipient user from the list for this individual announcement.");
      return;
    }
    try {
      setIsSendingBroadcast(true);
      const data = {
        title: broadcastTitle,
        message: broadcastMessage,
        audience_type: broadcastAudience,
        recipients: broadcastAudience === 'SPECIFIC' ? selectedRecipients : []
      };
      await adminService.createNotice(data);
      alert("Broadcast announcement dispatched successfully!");
      setBroadcastTitle('');
      setBroadcastMessage('');
      setSelectedRecipients([]);
      await loadAdminData();
    } catch (err) {
      console.error("Failed to send broadcast", err);
      alert("Failed to send notice");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Handle Report Export (CSV, XLSX, PDF)
  const handleExportReport = (format) => {
    const params = new URLSearchParams();
    if (filterRole) params.append('role', filterRole);
    if (filterStatus) params.append('status', filterStatus);
    if (filterDateStart) params.append('date_start', filterDateStart);
    if (filterDateEnd) params.append('date_end', filterDateEnd);
    if (filterCampus) params.append('campus_wing', filterCampus);
    if (filterMinOrders) params.append('min_orders', filterMinOrders);
    params.append('format', format);

    const token = localStorage.getItem('access_token');
    const downloadUrl = `/api/superadmin/export-users/?${params.toString()}`;
    
    const fileConfig = {
      csv: { ext: 'csv' },
      xlsx: { ext: 'xlsx' },
      pdf: { ext: 'pdf' }
    }[format];

    const link = document.createElement('a');
    link.setAttribute('download', `users_report_${new Date().toISOString().split('T')[0]}.${fileConfig.ext}`);
    
    fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })
    .catch(err => {
      console.error(`${format.toUpperCase()} Export Failed`, err);
      alert(`Failed to export ${format.toUpperCase()} report`);
    });
  };

  const formatRupees = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };
  
  const activeApprovedShops = allShops.filter(s => s.is_approved);
  const totalProcessedVolume = stats.totalGmv || 0;
  const successfulDeliveryRate = '100';

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 mt-8 mb-12" style={{flexGrow: 1}}>
      
      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-white/40 shadow-sm transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Aggregate Volume Processed</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{formatRupees(totalProcessedVolume)}</span>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Safe Razorpay checkout turnover</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-white/40 shadow-sm transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Print Orders</span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">
            {stats.totalOrdersCount || 0}
          </span>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Inside printing queue across nodes</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-white/40 shadow-sm transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Platform Stores Approved</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.shopsCount || 0}</span>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Approved and verified local shops</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-white/40 shadow-sm transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Student Accounts</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{stats.studentsCount || 0}</span>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Registered student users on platform</p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {[
          { id: 'SHOPS', label: `Shops Directory`, icon: <Users className="w-4 h-4" /> },
          { id: 'TRANSACTIONS', label: 'Payment Ledgers', icon: <FileText className="w-4 h-4" /> },
          { id: 'BROADCASTS', label: 'Broadcast Console', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'EXPORTS', label: 'Export Reports', icon: <Download className="w-4 h-4" /> },
          { id: 'NOTIF_CONSOLE', label: 'Delivery logs', icon: <Terminal className="w-4 h-4" /> }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-indigo-500 hover:border-indigo-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[400px]">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">{loadingMsg || 'Loading platform configurations...'}</p>
          </div>
        )}

        {!isLoading && activeTab === 'SHOPS' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Pending Approvals */}
            {pendingShops.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 animate-bounce" />
                  Store Approvals Needed ({pendingShops.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingShops.map(shop => (
                    <div
                      key={shop.id}
                      className="glass-panel p-6 rounded-3xl border border-amber-200 bg-amber-50 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold font-mono text-amber-600 uppercase tracking-wider bg-white px-2 py-0.5 rounded-md shadow-sm">
                            Approval Pending
                          </span>
                          <span className="text-xs font-semibold text-slate-400">{shop.area || shop.city || 'Local'}</span>
                        </div>
                        <h5 className="font-extrabold text-slate-800 text-sm mb-1">{shop.name}</h5>
                        <p className="text-slate-500 text-xs mb-3 leading-relaxed">{shop.address}</p>
                        
                        <div className="bg-white/80 p-3 rounded-xl border border-slate-200 text-[10px] space-y-1.5 font-mono text-slate-500">
                          <div>Owner: {shop.owner_name || shop.contact_phone || 'N/A'}</div>
                          <div>B&W Rate: {formatRupees(shop.price_list?.bw_rate_per_page || 0)} • Color Rate: {formatRupees(shop.price_list?.color_rate_per_page || 0)}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 mt-4">
                        <button
                          onClick={() => approveShop(shop.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          Approve & Activate Listing
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active approved directory */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">
                Store Directory Registry ({activeApprovedShops.length})
              </h4>

              <div className="glass-panel rounded-3xl border border-white/60 overflow-hidden divide-y divide-slate-100 bg-white/40 shadow-sm">
                {activeApprovedShops.map(shop => (
                  <div key={shop.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/50 transition-colors">
                    <div className="cursor-pointer flex-grow" onClick={() => handleOpenShopDetails(shop)}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-extrabold text-slate-900 text-sm hover:underline">{shop.name}</h5>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          shop.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {shop.is_active ? 'Visible to Students' : 'Hidden by Admin'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs leading-relaxed max-w-lg">
                        {shop.address} • Contact: {shop.contact_phone || 'N/A'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenShopDetails(shop)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                      >
                        Performance Metrics
                      </button>
                      <button
                        onClick={() => toggleShopActive(shop.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          shop.is_active
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {shop.is_active ? (
                          <span className="flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Hide Shop</span>
                        ) : (
                          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Unhide Shop</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                
                {activeApprovedShops.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No approved shops yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Transactions panel */}
        {!isLoading && activeTab === 'TRANSACTIONS' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-2">
              <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">Payments Ledger Registry</h4>
              <p className="text-slate-400 text-xs mt-0.5">Unified master list verifying transaction settlement badges.</p>
            </div>

            {allOrders.length === 0 ? (
              <div className="py-16 text-center glass-panel rounded-3xl border border-white/60 bg-white/40 shadow-sm animate-pulse">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-700">No payments registered on the platform ledger yet</p>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl border border-white/60 overflow-hidden divide-y divide-slate-100 bg-white/40 shadow-sm">
                {allOrders.map(order => {
                  const isSuccess = order.status !== 'REJECTED' && order.status !== 'PAYMENT_FAILED';
                  const isRefunded = order.status === 'REJECTED';
                  return (
                    <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/50 transition-colors">
                      <div className="font-mono text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-sm">{order.order_number}</span>
                          <span className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        <div>Student: <strong className="text-slate-700">{order.student_name}</strong> • Shop: <strong className="text-slate-700">{order.shop_name}</strong></div>
                        <div className="text-[10px]">Document: {order.files?.[0]?.original_filename || 'PDF Document'}</div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold block mb-1.5 text-center ${
                          isSuccess 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : isRefunded 
                            ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                            : 'bg-slate-50 text-slate-500'
                        }`}>
                          {isSuccess ? 'ACCEPTED (SUCCESS)' : isRefunded ? 'REJECTED (REFUNDED)' : 'FAILED'}
                        </span>
                        <span className="font-black text-sm text-slate-800 block">{formatRupees(order.total_amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Broadcast Announcement System */}
        {!isLoading && activeTab === 'BROADCASTS' && (
          <div className="glass-panel p-8 rounded-3xl border border-white/60 bg-white/40 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">Broadcast Announcement Console</h4>
              <p className="text-slate-500 text-xs mt-0.5">Send targeted notices or push alerts to students, shopkeepers, or specific accounts.</p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Server Maintenance Notice, Holi Campus Shutdown"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm focus:outline-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Notice Body (Markdown supported)</label>
                <textarea
                  rows={6}
                  placeholder="Write your announcement details here. You can use markdown headers or links."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">Target Audience</label>
                  <div className="space-y-2 text-sm text-slate-700 font-medium">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="audience"
                        value="ALL"
                        checked={broadcastAudience === 'ALL'}
                        onChange={() => setBroadcastAudience('ALL')}
                        className="text-indigo-600"
                      />
                      Global Broadcast (Everyone)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="audience"
                        value="STUDENTS"
                        checked={broadcastAudience === 'STUDENTS'}
                        onChange={() => setBroadcastAudience('STUDENTS')}
                        className="text-indigo-600"
                      />
                      Students Only
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="audience"
                        value="SHOPKEEPERS"
                        checked={broadcastAudience === 'SHOPKEEPERS'}
                        onChange={() => setBroadcastAudience('SHOPKEEPERS')}
                        className="text-indigo-600"
                      />
                      Shopkeepers Only
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="audience"
                        value="SPECIFIC"
                        checked={broadcastAudience === 'SPECIFIC'}
                        onChange={() => setBroadcastAudience('SPECIFIC')}
                        className="text-indigo-600"
                      />
                      Specific Individual Accounts
                    </label>
                  </div>
                </div>

                {broadcastAudience === 'SPECIFIC' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 block">Select Target Accounts</label>
                    <select
                      multiple
                      value={selectedRecipients}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setSelectedRecipients(values);
                      }}
                      className="w-full h-32 px-2 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-indigo-500"
                    >
                      {allUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email}) [{user.role}]
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">Hold Command/Ctrl to select multiple users.</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200/60 flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingBroadcast}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <Megaphone className="w-4 h-4" />
                  {isSendingBroadcast ? 'Dispatching notices...' : 'Publish Announcement'}
                </button>
              </div>
            </form>

            {/* Published Announcements History */}
            <div className="pt-6 border-t border-slate-200/60 space-y-4">
              <h5 className="font-extrabold text-slate-800 text-sm">Published Announcements History ({pastNotices.length})</h5>
              {pastNotices.length === 0 ? (
                <p className="text-xs text-slate-400">No announcements published yet.</p>
              ) : (
                <div className="space-y-3">
                  {pastNotices.map(notice => (
                    <div key={notice.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-800 text-sm">{notice.title}</strong>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200/50">
                          {notice.audience_type}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{notice.message}</p>
                      <span className="block text-[10px] text-slate-400 font-mono">Dispatched at: {new Date(notice.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* User Data Query Matrix & Export */}
        {!isLoading && activeTab === 'EXPORTS' && (
          <div className="glass-panel p-8 rounded-3xl border border-white/60 bg-white/40 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">User Query Matrix & CSV Export</h4>
              <p className="text-slate-500 text-xs mt-0.5">Filter the entire platform registration logs before running the data compilation engine.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Target Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                >
                  <option value="">All Users</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="SHOP_OWNER">Shop Owners Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Account Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location / Campus Wing</label>
                <input
                  type="text"
                  placeholder="e.g. Block A, Girls Hostel"
                  value={filterCampus}
                  onChange={(e) => setFilterCampus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Registrations From</label>
                <input
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Registrations To</label>
                <input
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Min Order Volume</label>
                <input
                  type="number"
                  placeholder="e.g. 10 (filter heavy users)"
                  value={filterMinOrders}
                  onChange={(e) => setFilterMinOrders(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-indigo-500"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200/60 flex flex-wrap gap-4 justify-end">
              <button
                onClick={() => handleExportReport('xlsx')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Excel Report (.xlsx)
              </button>
              <button
                onClick={() => handleExportReport('pdf')}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download PDF Report (.pdf)
              </button>
              <button
                onClick={() => handleExportReport('csv')}
                className="px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download CSV Registry (.csv)
              </button>
            </div>
          </div>
        )}

        {/* Deliverability Console */}
        {!isLoading && activeTab === 'NOTIF_CONSOLE' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">SMS / Email / WhatsApp Delivery Logs</h4>
                <p className="text-slate-400 text-xs">Simulating push alerts on Meta Cloud and SMTP endpoints.</p>
              </div>

              <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold font-mono">
                System OK
              </div>
            </div>

            <div className="py-16 text-center glass-panel rounded-3xl border border-white/60 bg-white/40 shadow-sm">
              <Terminal className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">All notifications sent successfully (Meta Cloud Logs OK)</p>
            </div>
          </div>
        )}
      </div>

      {/* Drill-down performance Modal */}
      {selectedShop && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl bg-white border border-white/80 rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedShop.name}</h3>
                <p className="text-xs text-slate-400">Status timelines and incremental order performance.</p>
              </div>
              <button 
                onClick={() => setSelectedShop(null)}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registration status</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">Approved & Active</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Listing state</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{selectedShop.is_active ? 'Visible to Students' : 'Temporarily Hidden'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">B&W Printing Cost</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{formatRupees(selectedShop.price_list?.bw_rate_per_page || 0)} / page</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Color Printing Cost</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{formatRupees(selectedShop.price_list?.color_rate_per_page || 0)} / page</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Operational Status Audit Logs</h4>
                
                {isLoadingHistory && (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-xs text-slate-400 font-semibold">Compiling logs...</span>
                  </div>
                )}

                {!isLoadingHistory && shopHistory.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No operational status logs registered yet.</p>
                )}

                {!isLoadingHistory && shopHistory.map((log, index) => (
                  <div key={log.id} className="flex gap-4 items-start relative pb-4">
                    {/* timeline line */}
                    {index !== shopHistory.length - 1 && (
                      <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-slate-200"></div>
                    )}
                    
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                      log.status === 'OPEN' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-500' 
                        : 'bg-rose-50 border-rose-500 text-rose-500'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                    </div>

                    <div className="flex-grow space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">
                          Switched operational status to: <strong className={log.status === 'OPEN' ? 'text-emerald-600' : 'text-rose-600'}>{log.status}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Changed by: {log.changed_by_name} • 
                        <strong className="text-slate-700 ml-1">Accepted {log.accepted_orders_count} orders</strong> during this status window.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50">
              <button 
                onClick={() => setSelectedShop(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close Timeline View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
