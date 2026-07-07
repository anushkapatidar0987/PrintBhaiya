import React, { useState, useEffect } from 'react';
import { shopService, orderService } from '../services/api';
import { 
  Store, Check, X, Printer, Coins, Layers, ClipboardList, TrendingUp, 
  Settings, Clock, Phone, AlertTriangle, Play, FileCheck, Landmark, MessageSquare, Plus, Save,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { adminService } from '../services/api';

export default function ShopDashboard({ currentUser }) {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('ORDERS'); // ORDERS, PRICING, STATS
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Notices Feed
  const [notices, setNotices] = useState([]);
  
  // Pricing states
  const [editBwRate, setEditBwRate] = useState('');
  const [editColorRate, setEditColorRate] = useState('');
  const [editDoubleSidedRate, setEditDoubleSidedRate] = useState('');
  const [editMinOrder, setEditMinOrder] = useState('');

  // Settings edit states
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');

  // Reject Modal State
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // New Custom States
  const [selectedPreviewOrder, setSelectedPreviewOrder] = useState(null);
  const [confirmCollectedOrderId, setConfirmCollectedOrderId] = useState(null);
  const [enteredHandoverCode, setEnteredHandoverCode] = useState('');
  const [editSpiralPrice, setEditSpiralPrice] = useState(0);
  const [editStaplePrice, setEditStaplePrice] = useState(0);
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);
  const [editDiscountHours, setEditDiscountHours] = useState(0);

  const handlePreviewFile = async (urlPath) => {
    if (!urlPath) return;
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

  const loadShopData = async () => {
    try {
      const shopRes = await shopService.getMyShop();
      const ownerShop = shopRes.data;
      setShop(ownerShop);
      setEditName(ownerShop.name || '');
      setEditAddress(ownerShop.address || '');
      setEditPhone(ownerShop.contact_phone || '');
      setEditWhatsapp(ownerShop.whatsapp_number || '');
      setEditOwnerName(ownerShop.owner_name || '');
      setEditDiscountPercent(ownerShop.discount_percentage || 0);

      const spiralOpt = ownerShop.binding_options?.find(o => o.name === 'Spiral Binding');
      const stapleOpt = ownerShop.binding_options?.find(o => o.name === 'Stapled');
      if (spiralOpt) setEditSpiralPrice(spiralOpt.price || 0);
      if (stapleOpt) setEditStaplePrice(stapleOpt.price || 0);

      if (ownerShop.price_list) {
        setEditBwRate(ownerShop.price_list.bw_rate_per_page || 0);
        setEditColorRate(ownerShop.price_list.color_rate_per_page || 0);
        setEditDoubleSidedRate(ownerShop.price_list.double_sided_rate_per_page || 0);
        setEditMinOrder(ownerShop.price_list.minimum_order_amount || 0);
      }

      const [ordersRes, noticesRes] = await Promise.all([
        orderService.getShopOrders(),
        adminService.getNoticeFeed()
      ]);
      setOrders(ordersRes.data.results || ordersRes.data);
      setNotices(noticesRes.data.results || noticesRes.data);
    } catch (err) {
      console.error("Failed to load shop data", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadShopData();
      
      const interval = setInterval(async () => {
        try {
          const ordersRes = await orderService.getShopOrders();
          setOrders(ordersRes.data.results || ordersRes.data);
        } catch (err) {
          console.error("Silent orders poll failed", err);
        }
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const updateShopStatus = async (newStatus) => {
    if (!shop) return;
    if (!shop.is_active && newStatus === 'OPEN') {
      alert("Your shop is unlisted by the Super Admin. You cannot open it.");
      return;
    }
    setIsLoading(true);
    setLoadingMsg(`Updating status to ${newStatus}...`);
    try {
      const res = await shopService.updateStatus(newStatus);
      setShop(res.data);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.response?.data?.[0] || "Failed to update status";
      alert(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const transitionOrderStatus = async (orderId, targetStatus, rejectReasonStr = '', verificationCode = '') => {
    // Optimistic state updates
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: targetStatus, shop_rejection_reason: rejectReasonStr } : o));
    
    try {
      if (targetStatus === 'ACCEPTED') {
        await orderService.accept(orderId);
      } else if (targetStatus === 'READY_FOR_COLLECTION') {
        await orderService.markReady(orderId);
      } else if (targetStatus === 'COLLECTED') {
        await orderService.markCollected(orderId, verificationCode);
      } else if (targetStatus === 'REJECTED') {
        await orderService.reject(orderId, rejectReasonStr);
      }
      
      // Refresh list silently
      const ordersRes = await orderService.getShopOrders();
      setOrders(ordersRes.data.results || ordersRes.data);
    } catch (err) {
      console.error("Status transition failed", err);
      const errMsg = err.response?.data?.error || "Action failed";
      alert(errMsg);
      loadShopData(); // Revert to source-of-truth on failure
    }
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!shop) return;
    setIsLoading(true);
    setLoadingMsg('Publishing revised pricing standards...');
    
    try {
      const binding_options = [];
      const spiralOpt = shop.binding_options?.find(o => o.name === 'Spiral Binding');
      const stapleOpt = shop.binding_options?.find(o => o.name === 'Stapled');
      if (spiralOpt) {
        binding_options.push({ id: spiralOpt.id, name: 'Spiral Binding', price: editSpiralPrice, is_active: true });
      }
      if (stapleOpt) {
        binding_options.push({ id: stapleOpt.id, name: 'Stapled', price: editStaplePrice, is_active: true });
      }

      await shopService.updatePricing({
        bw_rate_per_page: editBwRate,
        color_rate_per_page: editColorRate,
        double_sided_supported: true,
        double_sided_rate_per_page: editDoubleSidedRate,
        minimum_order_amount: editMinOrder,
        binding_options: binding_options,
        discount_percentage: editDiscountPercent,
        discount_hours: editDiscountHours
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadShopData();
    } catch (err) {
      console.error(err);
      alert("Failed to update pricing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!shop) return;
    setIsLoading(true);
    setLoadingMsg('Updating store profile details...');

    // Validations
    if (editOwnerName && !/^[a-zA-Z\s]+$/.test(editOwnerName)) {
      alert("Owner name can only contain letters and spaces.");
      setIsLoading(false);
      return;
    }
    if (editOwnerName && editOwnerName.strip ? editOwnerName.strip().length < 3 : editOwnerName.trim().length < 3) {
      alert("Owner name must be at least 3 characters long.");
      setIsLoading(false);
      return;
    }
    if (editPhone && !/^\d{10}$/.test(editPhone)) {
      alert("Contact Phone Number must be exactly 10 digits.");
      setIsLoading(false);
      return;
    }
    if (editWhatsapp && !/^\d{10}$/.test(editWhatsapp)) {
      alert("WhatsApp Notification Number must be exactly 10 digits.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await shopService.updateMyShop({
        name: editName,
        address: editAddress,
        contact_phone: editPhone,
        whatsapp_number: editWhatsapp,
        owner_name: editOwnerName
      });
      setShop(prev => ({ ...prev, ...res.data }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadShopData();
    } catch (err) {
      console.error("Failed to save settings", err);
      const errors = err.response?.data;
      const errMsg = errors 
        ? Object.values(errors).flat().join(" ") 
        : "Failed to update store profile";
      alert(errMsg);
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



      {/* Administrative Override Lock Banner */}
      {!shop.is_active && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4.5 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-rose-900 text-sm">Administrative Hold / Unlisted</h4>
            <p className="text-rose-700 text-xs mt-1">
              Your store has been unlisted or hidden by the platform administration. You cannot receive new student orders, and your status is forced to Closed. Please contact the administrator.
            </p>
          </div>
        </div>
      )}

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
            {['OPEN', 'CLOSED', 'HOLIDAY', 'MAINTENANCE'].map(st => {
              const effectiveStatus = shop.is_active ? shop.status : 'CLOSED';
              const isActive = effectiveStatus === st;
              const styleMap = {
                OPEN: 'bg-emerald-600 text-white shadow-emerald-500/10 hover:bg-emerald-700',
                CLOSED: 'bg-rose-600 text-white shadow-rose-500/10 hover:bg-rose-700',
                HOLIDAY: 'bg-amber-600 text-white shadow-amber-500/10 hover:bg-amber-700',
                MAINTENANCE: 'bg-slate-600 text-white shadow-slate-500/10 hover:bg-slate-700'
              };

              const isDisabled = isLoading || (!shop.is_active && st === 'OPEN');

              return (
                <button
                  key={st}
                  onClick={() => updateShopStatus(st)}
                  disabled={isDisabled}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                    isActive 
                      ? `${styleMap[st]} shadow-md`
                      : 'text-slate-600 hover:bg-white/50 bg-transparent'
                  } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {st === 'MAINTENANCE' ? 'Maintenance' : st}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200/60 gap-1">
        {['ORDERS', 'PRICING', 'STATS', 'SETTINGS'].map(tab => {
          const isActive = activeTab === tab;
          const config = {
            ORDERS: { label: `Incoming Queue (${inQueueCount})`, icon: <ClipboardList className="w-4 h-4" /> },
            PRICING: { label: 'Pricing Sheet', icon: <Coins className="w-4 h-4" /> },
            STATS: { label: 'Store Earnings', icon: <TrendingUp className="w-4 h-4" /> },
            SETTINGS: { label: 'Store Profile', icon: <Settings className="w-4 h-4" /> }
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
                      onClick={() => {
                        setSelectedPreviewOrder(order);
                        handlePreviewFile(order.files?.[0]?.file);
                      }}
                      className="glass-light p-5 rounded-2xl border border-white/70 shadow-sm space-y-4 bg-white/40 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all duration-300"
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
                          <span className="font-bold text-slate-800">{(order.double_sided ?? order.doubleSided) ? 'Yes (Duplex)' : 'No (Simplex)'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase">Finishing Binding</span>
                          <span className="font-bold text-slate-800">{order.binding_option_name || order.bindingOption || 'Loose sheets'}</span>
                        </div>
                      </div>

                      {/* Comment from student */}
                      {(order.student_comment || order.studentComment) && (
                        <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/30 text-xs flex gap-1.5 text-slate-600">
                          <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-slate-700">Special Notes:</strong> {"\""}{order.student_comment || order.studentComment}{"\""}
                          </span>
                        </div>
                      )}

                      {/* Interactive Stage progress control buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100/40" onClick={e => e.stopPropagation()}>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPreviewOrder(order);
                                handlePreviewFile(order.files[0].file);
                              }} 
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:scale-102 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              View / Print File
                            </button>
                          )}
                          {isPlaced && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRejectOrderId(order.id);
                                }}
                                disabled={isLoading}
                                className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:scale-102 transition-all cursor-pointer"
                              >
                                Reject Order
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  transitionOrderStatus(order.id, 'ACCEPTED');
                                }}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                transitionOrderStatus(order.id, 'READY_FOR_COLLECTION');
                              }}
                              disabled={isLoading}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:scale-102 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileCheck className="w-4 h-4" />
                              Mark Printed & Ready
                            </button>
                          )}

                          {isReady && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmCollectedOrderId(order.id);
                              }}
                              disabled={isLoading}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:scale-102 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              Mark Collected
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

              {/* Add-on Customizations & Binding Options */}
              <div className="border-t border-slate-200/50 pt-5 space-y-4">
                <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Add-on Customizations & Binding Options</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Spiral Binding Price Addon (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editSpiralPrice}
                      onChange={e => setEditSpiralPrice(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Stapling Price Addon (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editStaplePrice}
                      onChange={e => setEditStaplePrice(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold border border-slate-200"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Time-bound Promotion Discount campaign */}
              <div className="border-t border-slate-200/50 pt-5 space-y-4">
                <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Time-Bound Promotional Discount Campaign</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Discount Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editDiscountPercent}
                      onChange={e => setEditDiscountPercent(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold border border-slate-200"
                      placeholder="e.g. 15 (0 to deactivate)"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Campaign Duration (Hours)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editDiscountHours}
                      onChange={e => setEditDiscountHours(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold border border-slate-200"
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
                {shop.is_discount_active && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs flex items-center justify-between text-rose-800 font-medium">
                    <span>🔥 Active Promo: {parseFloat(shop.discount_percentage)}% OFF</span>
                    <span className="font-mono text-[10px]">Ends: {new Date(shop.discount_ends_at).toLocaleString()}</span>
                  </div>
                )}
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
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedPreviewOrder(order);
                        handlePreviewFile(order.files?.[0]?.file);
                      }}
                      className="p-3.5 flex justify-between items-center bg-white/10 hover:bg-white/30 cursor-pointer transition-all duration-200 border-l-2 border-transparent hover:border-indigo-500"
                    >
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

        {/* Store Profile Settings Tab */}
        {activeTab === 'SETTINGS' && (
          <motion.div
            key="SETTINGS"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl"
          >
            <form onSubmit={handleSaveSettings} className="glass-light p-6 rounded-3xl border border-white/80 shadow-md space-y-6 bg-white/40">
              <div className="border-b border-slate-100 pb-4">
                <h4 className="font-extrabold text-slate-800 text-base">Store Profile Settings</h4>
                <p className="text-slate-400 text-xs">Edit your public shop name, pickup address, and owner contact phone numbers.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Owner Name (Shopkeeper)</label>
                  <input
                    type="text"
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-indigo-500"
                    placeholder="e.g. Ayush Patel"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Shop Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Pickup Address</label>
                  <textarea
                    rows={3}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-indigo-500"
                    required
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Contact Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">WhatsApp Notification Number</label>
                    <input
                      type="text"
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Profile saved successfully!
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:scale-102 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? 'Saving Changes...' : 'Save Profile Settings'}
                </button>
              </div>
            </form>
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

      {/* Unified Preview & Details Modal */}
      <AnimatePresence>
        {selectedPreviewOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => {
                setSelectedPreviewOrder(null);
                setPreviewFileUrl(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row z-10"
              style={{ height: '80vh' }}
            >
              {/* Left Column: Iframe preview with diagonal watermark overlay */}
              <div className="flex-1 bg-slate-150 relative border-r border-slate-100 flex flex-col h-1/2 md:h-full">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <span className="text-xs font-bold text-slate-700">Document Preview</span>
                  {selectedPreviewOrder.files?.[0]?.original_filename && (
                    <span className="text-xs text-slate-500 truncate max-w-xs">{selectedPreviewOrder.files[0].original_filename}</span>
                  )}
                </div>
                <div className="flex-1 relative bg-slate-100 overflow-hidden">
                  {previewFileUrl === 'loading' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="mt-4 text-slate-500 font-medium text-sm">Loading document securely...</p>
                    </div>
                  ) : (
                    <>
                      <iframe
                        id="preview-iframe"
                        src={previewFileUrl}
                        className="w-full h-full border-none"
                        title="Document Preview"
                      />
                      {/* Secure Watermark Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden opacity-10">
                        <div className="text-slate-800 text-3xl font-black rotate-[-30deg] whitespace-nowrap uppercase tracking-widest">
                          PrintKarDoBhaiya Secure Preview • PrintKarDoBhaiya Secure Preview
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Metadata details, comments & actions */}
              <div className="w-full md:w-[380px] bg-slate-50/50 p-6 flex flex-col justify-between overflow-y-auto h-1/2 md:h-full shrink-0">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md uppercase">
                        {selectedPreviewOrder.order_number}
                      </span>
                      <h4 className="font-extrabold text-slate-800 text-base mt-2">
                        {selectedPreviewOrder.student_name}
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{selectedPreviewOrder.student_phone}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPreviewOrder(null);
                        setPreviewFileUrl(null);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Specifications Grid */}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Copies & Pages</span>
                      <span className="font-bold text-slate-800">{selectedPreviewOrder.page_count} Pages • {selectedPreviewOrder.copies} Copies</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Color Standard</span>
                      <span className={`font-bold ${selectedPreviewOrder.color_mode === 'COLOR' ? 'text-indigo-600' : 'text-slate-800'}`}>
                        {selectedPreviewOrder.color_mode === 'COLOR' ? 'Glow Color' : 'B&W'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Double-Sided</span>
                      <span className="font-bold text-slate-800">{(selectedPreviewOrder.double_sided ?? selectedPreviewOrder.doubleSided) ? 'Yes (Duplex)' : 'No (Simplex)'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Binding Option</span>
                      <span className="font-bold text-slate-800">{selectedPreviewOrder.binding_option_name || selectedPreviewOrder.bindingOption || 'Loose sheets'}</span>
                    </div>
                  </div>

                  {/* Comments Display Box */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Student Instructions</span>
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl text-xs text-slate-700 leading-relaxed min-h-[60px]">
                      {selectedPreviewOrder.student_comment || selectedPreviewOrder.studentComment ? (
                        <p className="font-medium">{"\""}{selectedPreviewOrder.student_comment || selectedPreviewOrder.studentComment}{"\""}</p>
                      ) : (
                        <p className="text-slate-400 italic">No custom notes specified by student.</p>
                      )}
                    </div>
                  </div>

                  {/* Rejection Reason display if rejected */}
                  {selectedPreviewOrder.status === 'REJECTED' && selectedPreviewOrder.shop_rejection_reason && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Your Rejection Reason</span>
                      <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl text-xs text-rose-700 leading-relaxed">
                        <p className="font-semibold">{"\""}{selectedPreviewOrder.shop_rejection_reason}{"\""}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions & Print Gate */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3">
                  <div className="flex gap-2">
                    {/* Accept Order Gate */}
                    {selectedPreviewOrder.status === 'PLACED' && (
                      <>
                        <button
                          onClick={() => {
                            transitionOrderStatus(selectedPreviewOrder.id, 'ACCEPTED');
                            setSelectedPreviewOrder(prev => ({ ...prev, status: 'ACCEPTED' }));
                          }}
                          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:scale-102 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Accept
                        </button>
                        <button
                          onClick={() => {
                            setRejectOrderId(selectedPreviewOrder.id);
                            setSelectedPreviewOrder(null);
                          }}
                          className="px-3.5 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {selectedPreviewOrder.status === 'ACCEPTED' && (
                      <button
                        onClick={() => {
                          transitionOrderStatus(selectedPreviewOrder.id, 'READY_FOR_COLLECTION');
                          setSelectedPreviewOrder(prev => ({ ...prev, status: 'READY_FOR_COLLECTION' }));
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:scale-102 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Mark Printed & Ready
                      </button>
                    )}

                    {selectedPreviewOrder.status === 'READY_FOR_COLLECTION' && (
                      <button
                        onClick={() => {
                          setConfirmCollectedOrderId(selectedPreviewOrder.id);
                          setSelectedPreviewOrder(null);
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:scale-102 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Mark as Collected
                      </button>
                    )}
                  </div>

                  {/* Print Document Button (Disabled until ACCEPTED) */}
                  <div>
                    <button
                      onClick={handlePrintFile}
                      disabled={selectedPreviewOrder.status === 'PLACED' || previewFileUrl === 'loading'}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Printer className="w-4 h-4" /> Print Document
                    </button>
                    {selectedPreviewOrder.status === 'PLACED' && (
                      <p className="text-[10px] text-slate-400 font-bold text-center mt-1.5">
                        ⚠️ Accept order first to unlock printing gate.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Secure Handover Verification Code Confirmation Modal */}
      <AnimatePresence>
        {confirmCollectedOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4"
            >
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Secure Handover Verification</h4>
                <p className="text-slate-500 text-xs mt-1">
                  Ask the student for the last 4 digits of their Order ID. Enter it below to release the print order.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={4}
                  value={enteredHandoverCode}
                  onChange={e => setEnteredHandoverCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.5em] text-xl font-black bg-slate-50 border border-slate-200 rounded-xl py-3 text-slate-800 focus:outline-indigo-500"
                  placeholder="0000"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setConfirmCollectedOrderId(null);
                    setEnteredHandoverCode('');
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={enteredHandoverCode.length < 4 || isLoading}
                  onClick={() => {
                    transitionOrderStatus(confirmCollectedOrderId, 'COLLECTED', '', enteredHandoverCode);
                    setConfirmCollectedOrderId(null);
                    setEnteredHandoverCode('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Handover'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
