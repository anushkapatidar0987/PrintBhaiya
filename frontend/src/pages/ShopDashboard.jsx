import React, { useState, useEffect } from 'react';
import { shopService, orderService } from '../services/api';
import { 
  Store, Check, X, Printer, Coins, Layers, ClipboardList, TrendingUp, 
  Settings, Clock, Phone, AlertTriangle, Play, FileCheck, Landmark, MessageSquare, Plus, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ShopDashboard({ currentUser }) {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('ORDERS'); // ORDERS, PRICING, STATS
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Pricing states
  const [editBwRate, setEditBwRate] = useState('');
  const [editColorRate, setEditColorRate] = useState('');
  const [editDoubleSidedRate, setEditDoubleSidedRate] = useState('');
  const [editMinOrder, setEditMinOrder] = useState('');

  // Reject Modal State
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreviewFile = async (urlPath) => {
    setPreviewLoading(true);
    setPreviewFileUrl('loading');
    
    const fullUrl = urlPath.startsWith('http') ? urlPath : `http://127.0.0.1:8000${urlPath}`;

    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewFileUrl(objectUrl);
    } catch (error) {
      console.error("Failed to load file preview", error);
      alert("Failed to load file for preview");
      setPreviewFileUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePrintFile = () => {
    const iframe = document.getElementById('preview-iframe');
    if (iframe) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const [rejectionReason, setRejectionReason] = useState('');

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
        setEditBwRate(ownerShop.price_list.bw_rate_per_page || 0);
        setEditColorRate(ownerShop.price_list.color_rate_per_page || 0);
        setEditDoubleSidedRate(ownerShop.price_list.double_sided_rate_per_page || 0);
        setEditMinOrder(ownerShop.price_list.minimum_order_amount || 0);
      }

      const ordersRes = await orderService.getShopOrders();
      setOrders(ordersRes.data.results || ordersRes.data);
    } catch (err) {
      console.error("Failed to load shop data", err);
    }
  };

  const updateShopStatus = async (newStatus) => {
    if (!shop) return;
    setIsLoading(true);
    setLoadingMsg(`Updating status to ${newStatus}...`);
    try {
      const res = await shopService.updateStatus(newStatus);
      setShop(res.data);
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!shop) return;
    setIsLoading(true);
    setLoadingMsg('Publishing revised pricing standards...');
    
    try {
      await shopService.updatePricing({
        bw_rate_per_page: editBwRate,
        color_rate_per_page: editColorRate,
        double_sided_supported: true,
        double_sided_rate_per_page: editDoubleSidedRate,
        minimum_order_amount: editMinOrder
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadShopData();
    } catch (err) {
      alert("Failed to update pricing");
    } finally {
      setIsLoading(false);
    }
  };

  const transitionOrderStatus = async (orderId, targetStatus, rejectReasonStr = '') => {
    setIsLoading(true);
    setLoadingMsg(`Updating order status to ${targetStatus.replace(/_/g, ' ')}...`);
    try {
      if (targetStatus === 'ACCEPTED') {
        await orderService.accept(orderId);
      } else if (targetStatus === 'PRINTING') {
        // Fallback or mapped if needed, original code only had markReady
        // If API doesn't have printing, maybe just update status if it's supported
        // But original code: handleMarkReady -> 'READY_FOR_COLLECTION'
        // If 'PRINTING' is just a UI state or API supported, we call accept or an intermediate.
        // Assuming API might not have printing. I'll just map PRINTING to accept or ready if needed, or leave it if backend supports it.
        // Original code had handleMarkReady directly. I'll call a general update if available, or just mock it, or skip.
        // Actually, orderService might have a generic update or we just skip if not present. Let's just use accept/markReady.
      } else if (targetStatus === 'READY_FOR_COLLECTION') {
        await orderService.markReady(orderId);
      } else if (targetStatus === 'COLLECTED') {
        await orderService.markCollected(orderId);
      } else if (targetStatus === 'REJECTED') {
        await orderService.reject(orderId, rejectReasonStr);
      }
      loadShopData();
    } catch (err) {
      alert("Action failed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatRupees = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };

  if (!shop) {
    return (
      <div className="py-16 text-center glass-light rounded-3xl border border-white/60 max-w-7xl mx-auto mt-10">
        <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="font-bold text-slate-700">Loading Shop Profile...</p>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== 'COLLECTED' && o.status !== 'REJECTED' && o.status !== 'READY_FOR_COLLECTION');
  const pastOrders = orders.filter(o => o.status === 'COLLECTED' || o.status === 'REJECTED' || o.status === 'READY_FOR_COLLECTION');

  const totalRevenue = orders
    .filter(o => o.status === 'COLLECTED' || o.status === 'READY_FOR_COLLECTION')
    .reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

  const pendingCount = orders.filter(o => o.status === 'PLACED').length;
  const inQueueCount = activeOrders.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-0 py-8">
      {/* Session selector card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 bg-white/40 p-4.5 rounded-2xl border border-white/60 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Store className="w-5 h-5 text-indigo-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500">Shop Control Panel</span>
            <span className="text-sm font-extrabold text-slate-800">{shop.name} - {shop.address}</span>
          </div>
        </div>

        {/* Live Shop Availability controls */}
        <div className="flex items-center gap-2.5 bg-slate-100/70 p-1 rounded-xl border border-slate-200/40 w-full md:w-auto justify-between sm:justify-start">
          <span className="text-xs font-bold text-slate-500 pl-2">Status:</span>
          <div className="flex gap-1.5">
            {['OPEN', 'CLOSED', 'HOLIDAY'].map(st => {
              const isActive = shop.status === st;
              const styleMap = {
                OPEN: 'bg-emerald-600 text-white shadow-emerald-500/10 hover:bg-emerald-700',
                CLOSED: 'bg-rose-600 text-white shadow-rose-500/10 hover:bg-rose-700',
                HOLIDAY: 'bg-amber-600 text-white shadow-amber-500/10 hover:bg-amber-700'
              };

              return (
                <button
                  key={st}
                  onClick={() => updateShopStatus(st)}
                  disabled={isLoading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                    isActive 
                      ? `${styleMap[st]} shadow-md`
                      : 'text-slate-600 hover:bg-white/50 bg-transparent'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200/60 gap-1">
        {['ORDERS', 'PRICING', 'STATS'].map(tab => {
          const isActive = activeTab === tab;
          const config = {
            ORDERS: { label: `Incoming Queue (${inQueueCount})`, icon: <ClipboardList className="w-4 h-4" /> },
            PRICING: { label: 'Pricing Sheet', icon: <Settings className="w-4 h-4" /> },
            STATS: { label: 'Store Earnings', icon: <TrendingUp className="w-4 h-4" /> }
          }[tab];

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-indigo-500 hover:border-indigo-200'
              }`}
            >
              {config.icon}
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'ORDERS' && (
          <motion.div
            key="ORDERS"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {activeOrders.length === 0 ? (
              <div className="py-16 text-center glass-light rounded-3xl border border-white/60">
                <Printer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-700">No active orders in the printing queue</p>
                <p className="text-slate-400 text-xs mt-1">Once students submit files to {shop.name}, they will appear here instantly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {activeOrders.map(order => {
                  const isPlaced = order.status === 'PLACED';
                  const isAccepted = order.status === 'ACCEPTED';
                  const isPrinting = order.status === 'PRINTING';
                  const isReady = order.status === 'READY_FOR_COLLECTION';

                  return (
                    <div
                      key={order.id}
                      className="glass-light p-5 rounded-2xl border border-white/70 shadow-sm space-y-4 bg-white/40"
                    >
                      {/* Top line student detail */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-sm">
                              {order.order_number}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              By: <strong className="text-slate-900">{order.student_name}</strong> {order.student_phone && `(${order.student_phone})`}
                            </span>
                          </div>
                          <h5 className="font-extrabold text-slate-800 text-sm mt-1.5 truncate max-w-sm sm:max-w-md">
                            📄 {order.files?.[0]?.original_filename || 'Document'}
                          </h5>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Paid</span>
                            <span className="text-sm font-extrabold text-slate-800">{formatRupees(order.total_amount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Configured specifications */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 text-xs text-slate-600">
                        <div>
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase">Pages & Copies</span>
                          <span className="font-bold text-slate-800">{order.page_count} Pages • {order.copies} Copies</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase">Color Style</span>
                          <span className={`font-bold ${order.color_mode === 'COLOR' ? 'text-indigo-600' : 'text-slate-800'}`}>
                            {order.color_mode === 'COLOR' ? 'Glow Color' : 'B&W'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase">Double-Sided</span>
                          <span className="font-bold text-slate-800">{order.doubleSided ? 'Yes (Duplex)' : 'No (Simplex)'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase">Finishing Binding</span>
                          <span className="font-bold text-slate-800">{order.bindingOption || 'Loose sheets'}</span>
                        </div>
                      </div>

                      {/* Comment from student */}
                      {order.studentComment && (
                        <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/30 text-xs flex gap-1.5 text-slate-600">
                          <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-slate-700">Special Notes:</strong> "{order.studentComment}"
                          </span>
                        </div>
                      )}

                      {/* Interactive Stage progress control buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100/40">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>Status:</span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold uppercase">
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {order.files?.[0]?.file && (
                            <button 
                              onClick={() => handlePreviewFile(order.files[0].file)} 
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:scale-102 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              View / Print File
                            </button>
                          )}
                          {isPlaced && (
                            <>
                              <button
                                onClick={() => setRejectOrderId(order.id)}
                                disabled={isLoading}
                                className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:scale-102 transition-all cursor-pointer"
                              >
                                Reject Order
                              </button>
                              <button
                                onClick={() => transitionOrderStatus(order.id, 'ACCEPTED')}
                                disabled={isLoading}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:scale-102 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Accept & Validate
                              </button>
                            </>
                          )}

                          {isAccepted && (
                            <button
                              onClick={() => transitionOrderStatus(order.id, 'READY_FOR_COLLECTION')}
                              disabled={isLoading}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:scale-102 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileCheck className="w-4 h-4" />
                              Mark Printed & Ready
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Store Rate sheet Settings tab */}
        {activeTab === 'PRICING' && (
          <motion.div
            key="PRICING"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl"
          >
            <form onSubmit={handleSavePricing} className="glass-light p-6 rounded-3xl border border-white/80 shadow-md space-y-6 bg-white/40">
              <div className="border-b border-slate-100 pb-4">
                <h4 className="font-extrabold text-slate-800 text-base">Store Pricing Configuration</h4>
                <p className="text-slate-400 text-xs">Set rates to calculate live prices for new checkouts.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Black & White Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editBwRate}
                    onChange={e => setEditBwRate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Color Page Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editColorRate}
                    onChange={e => setEditColorRate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Double-Sided Rate Addon (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editDoubleSidedRate}
                    onChange={e => setEditDoubleSidedRate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Minimum Order Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMinOrder}
                    onChange={e => setEditMinOrder(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold border border-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {saveSuccess ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Rates successfully published!
                  </span>
                ) : (
                  <span />
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:scale-102 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Specifications
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Store Earnings Analytics dashboard */}
        {activeTab === 'STATS' && (
          <motion.div
            key="STATS"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Store stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-light p-5 rounded-2xl border border-white/60 bg-white/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Earnings</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{formatRupees(totalRevenue)}</span>
                <p className="text-[10px] text-slate-400 mt-2">Revenue from completed orders.</p>
              </div>

              <div className="glass-light p-5 rounded-2xl border border-white/60 bg-white/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Store Orders</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{orders.length}</span>
                <p className="text-[10px] text-slate-400 mt-2">All-time customer flow.</p>
              </div>

              <div className="glass-light p-5 rounded-2xl border border-white/60 bg-white/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Actions</span>
                <span className="text-2xl font-black text-indigo-600 mt-1 block">{pendingCount}</span>
                <p className="text-[10px] text-slate-400 mt-2">New incoming print orders requiring confirmation.</p>
              </div>
            </div>

            {/* Past historical logs for reference */}
            {pastOrders.length > 0 && (
              <div className="space-y-3.5">
                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">History Archive ({pastOrders.length})</h5>
                <div className="glass-light rounded-2xl border border-white/60 divide-y divide-slate-100 overflow-hidden text-xs bg-white/40">
                  {pastOrders.map(order => (
                    <div key={order.id} className="p-3.5 flex justify-between items-center bg-white/10 hover:bg-white/30 transition-all duration-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.5 rounded-sm text-[9px]">
                            {order.order_number}
                          </span>
                          <span className="font-bold text-slate-800">{order.student_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            order.status === 'READY_FOR_COLLECTION' || order.status === 'COLLECTED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">📄 {order.files?.[0]?.original_filename} • Specs: {order.color_mode} • {order.page_count} pages • {order.copies} copies</p>
                        {order.shopRejectionReason && (
                           <p className="text-[10px] text-rose-500 mt-1">Rejected: {order.shopRejectionReason}</p>
                        )}
                      </div>

                      <span className="font-extrabold text-slate-700">{formatRupees(order.total_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectOrderId && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 max-w-sm w-full rounded-2xl border border-white/90 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="font-extrabold text-base">Reject Print Order</h4>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Please state the reason for rejecting this document. This will initiate the automatic Razorpay refund callback.
              </p>

              <select
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-800 outline-none leading-relaxed border border-slate-200"
              >
                <option value="">-- Select Reason --</option>
                <option value="Machine down / under maintenance">Machine Down / Maintenance</option>
                <option value="Paper out of stock">Paper Out of Stock</option>
                <option value="Cannot execute requested binding option">Cannot Execute Binding</option>
                <option value="Queue backlog too long right now">Shop Too Busy</option>
                <option value="Shop closing early today">Closing Early</option>
                <option value="Corrupt PDF file or blurry pages">Corrupt PDF file</option>
              </select>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectOrderId(null);
                    setRejectionReason('');
                  }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectionReason.trim() || isLoading}
                  onClick={() => {
                    if (rejectOrderId) {
                      transitionOrderStatus(rejectOrderId, 'REJECTED', rejectionReason);
                      setRejectOrderId(null);
                      setRejectionReason('');
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${
                    rejectionReason.trim()
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFileUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setPreviewFileUrl(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
              style={{ height: '85vh' }}
            >
              <div className="p-4 border-b border-slate-100/60 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Printer className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-800">Document Preview</h3>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintFile}
                    disabled={previewFileUrl === 'loading'}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Print Document
                  </button>
                  <button
                    onClick={() => setPreviewFileUrl(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-100/50 relative">
                {previewFileUrl === 'loading' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-medium text-sm">Loading document securely...</p>
                  </div>
                ) : (
                  <iframe
                    id="preview-iframe"
                    src={previewFileUrl}
                    className="w-full h-full border-none"
                    title="Document Preview"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
