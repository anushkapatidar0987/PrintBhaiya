import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Upload, FileText, Check, Layers, Sparkles, ShoppingBag, 
  ChevronRight, ShieldCheck, Clock, MessageSquare, AlertCircle, File, Smartphone
} from 'lucide-react';
import { shopService, orderService, paymentService } from '../services/api';

export default function StudentDashboard({ currentUser }) {
  const navigate = useNavigate();
  
  // Tabs: 'NEW_PRINT' | 'MY_PRINTS'
  const [activeTab, setActiveTab] = useState('NEW_PRINT');

  // Data State
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);

  // Navigation & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Selection States
  const [selectedShop, setSelectedShop] = useState(null);
  
  // Form Upload & Specification States
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [copiesCount, setCopiesCount] = useState(1);
  const [colorMode, setColorMode] = useState('BW'); // 'BW' | 'COLOR'
  const [doubleSided, setDoubleSided] = useState(false);
  const [selectedBinding, setSelectedBinding] = useState('None');
  const [studentComment, setStudentComment] = useState('');
  
  // Checkout/Payment Simulation States
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [createdOrderRef, setCreatedOrderRef] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [shopsRes, ordersRes] = await Promise.all([
        shopService.getPublicList(),
        orderService.getStudentOrders()
      ]);
      setShops(shopsRes.data.results || shopsRes.data);
      setOrders(ordersRes.data.results || ordersRes.data);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  // List of unique cities for filter dropdown
  const cities = ['All', ...Array.from(new Set(shops.map(s => s.city).filter(Boolean)))];

  // Filtered shops
  const filteredShops = shops.filter(shop => {
    // Only approved and active (or we just rely on status)
    const matchesQuery = 
      (shop.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.area || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.address || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCity = selectedCity === 'All' || shop.city === selectedCity;
    const matchesStatus = statusFilter === 'ALL' || shop.status === 'OPEN';

    return matchesQuery && matchesCity && matchesStatus;
  });

  // Calculate live pricing preview
  const calculatePrice = () => {
    if (!selectedShop || !selectedShop.price_list) return { basePagesCost: 0, bindingCost: 0, platformFee: 0, total: 0 };
    
    const pl = selectedShop.price_list;
    let pageRate = colorMode === 'COLOR' ? pl.color_rate_per_page : pl.bw_rate_per_page;
    if (doubleSided && pl.double_sided_supported && pl.double_sided_rate_per_page) {
       pageRate = pl.double_sided_rate_per_page;
    }
    
    const baseCost = pageCount * copiesCount * (pageRate || 0);
    
    let bindingCost = 0;
    if (selectedBinding && selectedBinding !== 'None') {
      const option = selectedShop.binding_options?.find(b => b.id === selectedBinding || b.name === selectedBinding);
      if (option) bindingCost = parseFloat(option.price || 0);
    }
    
    let total = baseCost + bindingCost;
    if (total < pl.minimum_order_amount) total = parseFloat(pl.minimum_order_amount);
    
    return {
      basePagesCost: baseCost,
      bindingCost,
      platformFee: 0,
      total
    };
  };

  const currentPriceBreakdown = calculatePrice();

  // File Upload Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setCustomFileName(selectedFile.name);
    // Simulate auto-detecting pages
    const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
    const detectedPages = isPdf ? Math.floor(Math.random() * 15) + 3 : 1;
    setPageCount(detectedPages);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const selectShop = (shop) => {
    if (shop.status !== 'OPEN') return;
    setSelectedShop(shop);
    setFile(null);
    setCustomFileName('');
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedShop) return;

    setPaymentProcessing(true);
    
    try {
      // 1. Create order
      const formData = new FormData();
      formData.append('shop_id', selectedShop.id);
      formData.append('color_mode', colorMode);
      formData.append('page_count', pageCount);
      formData.append('copies', copiesCount);
      formData.append('double_sided', doubleSided ? 'True' : 'False');
      if (selectedBinding !== 'None') {
         formData.append('binding_option', selectedBinding);
      }
      if (studentComment) {
         formData.append('student_comment', studentComment);
      }
      if (file) {
         formData.append('files', file);
      }

      const orderRes = await orderService.create(formData);
      const createdOrder = orderRes.data;
      
      // 2. Create razorpay order
      const rzpRes = await paymentService.createRazorpayOrder(createdOrder.id);
      
      // 3. Verify Payment
      await paymentService.verifyPayment({
         razorpay_order_id: rzpRes.data.razorpay_order_id,
         razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
         razorpay_signature: 'mock_signature'
      });

      setPaymentProcessing(false);
      setPaymentSuccess(true);
      setCreatedOrderRef(createdOrder);
      
      // Reload orders
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to process payment: " + JSON.stringify(err.response?.data || err.message));
      setPaymentProcessing(false);
    }
  };

  const closeCheckoutFlow = () => {
    setShowCheckout(false);
    setPaymentSuccess(false);
    setCreatedOrderRef(null);
    // Reset inputs
    setFile(null);
    setCustomFileName('');
    setSelectedShop(null);
    setStudentComment('');
    setActiveTab('MY_PRINTS');
  };

  // Stepper UI Configuration
  const orderStages = [
    { status: 'PLACED', label: 'Placed', desc: 'Awaiting shop acceptance' },
    { status: 'ACCEPTED', label: 'Accepted', desc: 'Shop verified the documents' },
    { status: 'PRINTING', label: 'Printing', desc: 'Document is inside the printer slot' },
    { status: 'READY_FOR_COLLECTION', label: 'Ready', desc: 'Come pick up your prints!' },
    { status: 'COLLECTED', label: 'Collected', desc: 'Transaction successfully completed' }
  ];

  const getStageIndex = (status) => {
    const map = {
      'PENDING_PAYMENT': -1,
      'PLACED': 0,
      'ACCEPTED': 1,
      'PRINTING': 2,
      'READY_FOR_COLLECTION': 3,
      'COLLECTED': 4,
      'REJECTED': -2
    };
    return map[status] ?? 0;
  };

  const formatRupees = (val) => {
    return `₹${Number(val || 0).toFixed(2)}`;
  };

  const activeOrders = orders.filter(o => o.status !== 'COLLECTED' && o.status !== 'REJECTED');
  const archivedOrders = orders.filter(o => o.status === 'COLLECTED' || o.status === 'REJECTED');

  return (
    <div className="section" style={{flexGrow: 1}}>
      <div className="container max-w-7xl mx-auto px-4 md:px-0">
        
        {/* Header Block & Tabs */}
        <div className="mb-8">
          <div>
            <h2 className="text-2xl font-extrabold mb-1">Welcome back, <span style={{textDecoration: 'underline decoration-2 decoration-[#B9FF66]'}}>{currentUser?.name}</span></h2>
            <p style={{color: '#666', marginTop: '0.25rem'}}>Manage your print requests and track collection queues.</p>
          </div>
          
          <div className="flex gap-6 mt-6 border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('NEW_PRINT')} 
              className={`pb-3 px-2 font-bold transition-all ${activeTab === 'NEW_PRINT' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              New Print
            </button>
            <button 
              onClick={() => setActiveTab('MY_PRINTS')} 
              className={`pb-3 px-2 font-bold transition-all flex items-center gap-2 ${activeTab === 'MY_PRINTS' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              My Prints 
              {activeOrders.length > 0 && (
                <span className="bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs">{activeOrders.length}</span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'NEW_PRINT' ? (
          <div className="space-y-8">
            {!selectedShop ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/40 p-4 rounded-2xl border border-white/60 shadow-sm">
                  <div className="w-full md:w-auto flex-1 max-w-md relative">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search print shops by name, landmarks..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">City:</span>
                      <select
                        value={selectedCity}
                        onChange={e => setSelectedCity(e.target.value)}
                        className="text-xs font-semibold bg-white/70 border border-slate-200/60 rounded-xl px-2.5 py-2 text-slate-700 outline-none"
                      >
                        {cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
                      <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                          statusFilter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        All Shops
                      </button>
                      <button
                        onClick={() => setStatusFilter('OPEN')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                          statusFilter === 'OPEN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Open Now
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredShops.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white/50 rounded-2xl border border-slate-200">
                      <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="font-bold text-slate-700">No active print shops matched your criteria</p>
                    </div>
                  ) : (
                    filteredShops.map(shop => {
                      const isOpen = shop.status === 'OPEN';
                      const isHoliday = shop.status === 'HOLIDAY';

                      return (
                        <div
                          key={shop.id}
                          onClick={() => selectShop(shop)}
                          className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer flex flex-col justify-between h-56 transition-all duration-300 relative ${
                            isOpen 
                              ? 'hover:shadow-md hover:-translate-y-1 hover:border-indigo-200' 
                              : 'opacity-70 grayscale cursor-not-allowed bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400">
                                {shop.area} • {shop.city}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                isOpen ? 'bg-emerald-50 text-emerald-600' : isHoliday ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {shop.status}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-slate-800 text-base mb-1">{shop.name}</h4>
                            <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-4">{shop.address}</p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">B&W Rate</span>
                                <span className="text-xs font-bold text-slate-700">{formatRupees(shop.price_list?.bw_rate_per_page)} <span className="text-[10px] font-medium text-slate-400">/pg</span></span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Color Rate</span>
                                <span className="text-xs font-bold text-slate-700">{formatRupees(shop.price_list?.color_rate_per_page)} <span className="text-[10px] font-medium text-slate-400">/pg</span></span>
                              </div>
                            </div>
                            {isOpen ? (
                              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">Closed</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100/60">
                    <div>
                      <button
                        onClick={() => setSelectedShop(null)}
                        className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1 mb-1"
                      >
                        ← Back to print shops
                      </button>
                      <h3 className="font-extrabold text-slate-800 text-lg">{selectedShop.name}</h3>
                      <p className="text-slate-500 text-xs">{selectedShop.address}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 hidden sm:block">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>

                  {!file ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={triggerFileSelect}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                        dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                        <Upload className="w-6 h-6 animate-bounce" />
                      </div>
                      <h5 className="font-bold text-slate-700 text-sm mb-1">Drag and drop your document here</h5>
                      <p className="text-slate-400 text-xs max-w-sm">Supports PDF, DOCX, and high-resolution images. Max size 25MB.</p>
                      <span className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">
                        Browse Files
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm truncate max-w-xs sm:max-w-md">{customFileName}</h5>
                          <p className="text-slate-400 text-xs font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB • Auto-detected: {pageCount} pages</p>
                        </div>
                      </div>
                      <button onClick={() => setFile(null)} className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors font-bold">
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <div>
                        <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-2">Color Mode</label>
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setColorMode('BW')}
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${colorMode === 'BW' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Black & White (B&W)
                          </button>
                          <button
                            type="button"
                            onClick={() => setColorMode('COLOR')}
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${colorMode === 'COLOR' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Multicolor
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-2">Number of Copies</label>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setCopiesCount(Math.max(1, copiesCount - 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-50">-</button>
                          <input type="number" value={copiesCount} onChange={e => setCopiesCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 h-10 rounded-xl bg-white border border-slate-200 text-center text-sm font-bold text-slate-800" />
                          <button type="button" onClick={() => setCopiesCount(copiesCount + 1)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-50">+</button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">Total Pages to Print</label>
                          <span className="text-[10px] text-slate-400 font-mono">Verify document count</span>
                        </div>
                        <input type="number" value={pageCount} min={1} onChange={e => setPageCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium outline-none focus:border-indigo-500" />
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-2">Double-Sided Printing</label>
                        {selectedShop.price_list?.double_sided_supported ? (
                          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-xs font-semibold text-slate-700 block">Print on both sides</span>
                              <span className="text-[10px] text-emerald-600 font-medium">Discounts apply: {formatRupees(selectedShop.price_list?.double_sided_rate_per_page)} / sheet</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDoubleSided(!doubleSided)}
                              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${doubleSided ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${doubleSided ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-bold text-amber-800 block">Not supported</span>
                              <p className="text-[10px] text-amber-700 leading-normal">This shop does not support duplex auto-printing. Prints will be single-sided sheets.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-2">Binding & Finishing</label>
                        <select
                          value={selectedBinding}
                          onChange={e => setSelectedBinding(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
                        >
                          <option value="None">No Binding (Loose pages)</option>
                          {selectedShop.binding_options?.map(opt => (
                            <option key={opt.id} value={opt.name}>
                              {opt.name} {opt.price > 0 ? `(+${formatRupees(opt.price)})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-2">Special Notes / Comments</label>
                        <textarea
                          placeholder="e.g. Please staple experiments separately..."
                          value={studentComment}
                          onChange={e => setStudentComment(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 leading-relaxed placeholder-slate-400 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-5">
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">
                      Order Invoice Summary
                    </h4>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Base Pages ({pageCount} pgs × {copiesCount} {copiesCount === 1 ? 'copy' : 'copies'})</span>
                        <span className="font-semibold text-slate-800">{formatRupees(currentPriceBreakdown.basePagesCost)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Binding Fee ({selectedBinding})</span>
                        <span className="font-semibold text-slate-800">{formatRupees(currentPriceBreakdown.bindingCost)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Platform Service Fee</span>
                        <span className="font-semibold text-emerald-600">FREE</span>
                      </div>

                      {currentPriceBreakdown.total === selectedShop.price_list?.minimum_order_amount && (
                        <div className="bg-indigo-50 p-2 rounded-xl text-[10px] text-indigo-700 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5 animate-bounce" />
                          <span>Minimum order value of {formatRupees(selectedShop.price_list?.minimum_order_amount)} applied</span>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-sm font-extrabold text-slate-800">Total Amount</span>
                        <span className="text-xl font-extrabold bg-gradient-to-tr from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                          {formatRupees(currentPriceBreakdown.total)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!file}
                      onClick={() => setShowCheckout(true)}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                        file ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-none'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      {!file ? 'Upload Document to Pay' : 'Pay via UPI'}
                    </button>

                    <p className="text-[10px] text-slate-400 text-center leading-normal">
                      Payments are securely managed via the Razorpay API gateway. Your document is processed server-side.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* MY PRINTS TAB */}
            {activeOrders.length === 0 && archivedOrders.length === 0 && (
              <div className="py-16 text-center bg-white/50 rounded-2xl border border-slate-200">
                <span style={{fontSize: '3rem'}}>🖨️</span>
                <h3 className="text-xl font-bold mt-4 text-slate-800">No Orders Placed Yet</h3>
                <p className="max-w-xs mx-auto text-sm text-slate-500 mt-2 mb-6">
                  You haven't ordered any prints yet. Save time next time you need photocopies or prints.
                </p>
                <button onClick={() => setActiveTab('NEW_PRINT')} className="btn btn-primary px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">
                  Place Your First Order
                </button>
              </div>
            )}

            {activeOrders.length > 0 && (
              <div className="space-y-5">
                <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Active Print Orders ({activeOrders.length})
                </h4>

                <div className="space-y-6">
                  {activeOrders.map(order => {
                    const activeIndex = getStageIndex(order.status);
                    return (
                      <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold uppercase">
                              {order.order_number}
                            </span>
                            <h5 className="font-extrabold text-slate-800 text-sm mt-1.5 flex items-center gap-2">
                              <File className="w-4 h-4 text-slate-400" />
                              {order.files?.[0]?.original_filename || 'Document'}
                            </h5>
                            <span className="text-xs text-slate-500 block">
                              Shop: <strong className="text-slate-700">{order.shop_name}</strong> • Selected specifications: {order.color_mode} • {order.copies} Copies
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Price Paid</span>
                            <span className="text-lg font-bold text-slate-800">{formatRupees(order.total_amount)}</span>
                          </div>
                        </div>

                        <div className="hidden md:grid grid-cols-5 gap-3 pt-2 relative">
                          <div className="absolute top-[15px] left-[10%] right-[10%] h-1 bg-slate-100 -z-10" />
                          <div className="absolute top-[15px] left-[10%] h-1 bg-indigo-500 -z-10 transition-all duration-500" style={{ width: `${(activeIndex / 4) * 80}%` }} />
                          {orderStages.map((stage, idx) => {
                            const isCompleted = activeIndex >= idx;
                            const isActive = activeIndex === idx;
                            return (
                              <div key={stage.status} className="text-center flex flex-col items-center z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                                  isCompleted ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'
                                } ${isActive ? 'ring-4 ring-indigo-50 scale-105' : ''}`}>
                                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className={`text-xs font-bold mt-2 block ${isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>{stage.label}</span>
                                <span className="text-[10px] text-slate-400 leading-tight max-w-[120px] mx-auto mt-0.5 block">{stage.desc}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="md:hidden space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-indigo-600 uppercase">{order.status.replace(/_/g, ' ')}</span>
                              <p className="text-[10px] text-slate-500">{orderStages[Math.max(0, activeIndex)]?.desc}</p>
                            </div>
                          </div>
                        </div>

                        {order.studentComment && (
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed text-slate-600">
                              <strong className="text-slate-800">Your Instructions:</strong> "{order.studentComment}"
                            </div>
                          </div>
                        )}

                        {order.status === 'READY_FOR_COLLECTION' && (
                          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <span className="text-xs font-bold text-emerald-800 block">Print sheets are ready!</span>
                              <p className="text-[10px] text-emerald-600">Visit the shop to collect your prints. Show Order Number: {order.order_number}</p>
                            </div>
                          </div>
                        )}
                        {order.status === 'REJECTED' && (
                          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col gap-2">
                            <span className="text-xs font-bold text-rose-800 block">Order Rejected</span>
                            <p className="text-[10px] text-rose-600">Reason: {order.shopRejectionReason || "Machine breakdown or queue overload."}</p>
                            <p className="text-[10px] text-rose-600 font-bold">Your payment has been automatically initiated for refund.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {archivedOrders.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-500 text-xs uppercase tracking-wider">
                  Collected & History Archive ({archivedOrders.length})
                </h4>
                <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {archivedOrders.map(order => (
                    <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors duration-200">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm">
                            {order.order_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            order.status === 'COLLECTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{order.files?.[0]?.original_filename || 'Document'}</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Shop: {order.shop_name} • Completed: {new Date(order.updated_at || order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Paid</span>
                        <span className="text-xs font-extrabold text-slate-700">{formatRupees(order.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Razorpay UPI Checkout Modal */}
      {showCheckout && selectedShop && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-5 bg-gradient-to-tr from-indigo-900 to-slate-900 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/15">
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-indigo-400">Razorpay Secure</span>
                  <h4 className="font-extrabold text-sm tracking-tight text-white">Merchant checkout portal</h4>
                </div>
              </div>
              <button onClick={closeCheckoutFlow} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            {!paymentSuccess ? (
              <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-6 text-slate-800">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-500 block">{selectedShop.name}</span>
                    <span className="text-[10px] text-indigo-600 block font-mono">Invoice reference: PKB_UPI_TXN</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Payable</span>
                    <span className="text-lg font-black text-indigo-700">{formatRupees(currentPriceBreakdown.total)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pay via UPI</span>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center gap-3 text-center">
                    <Smartphone className="w-8 h-8 text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">UPI Payments Only</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Google Pay, PhonePe, Paytm, BHIM</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={paymentProcessing}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {paymentProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing Request...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Pay {formatRupees(currentPriceBreakdown.total)}
                    </>
                  )}
                </button>

                <div className="flex justify-center items-center gap-1.5 text-[9px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Securely Encrypted UPI Transaction
                </div>
              </form>
            ) : (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-800">Payment Authorized!</h4>
                  <p className="text-slate-500 text-xs mt-1 leading-normal">
                    Your UPI payment was verified. The order record has been pushed to the print shop.
                  </p>
                </div>
                {createdOrderRef && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-left text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Number:</span>
                      <span className="font-bold text-slate-800">{createdOrderRef.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Document Name:</span>
                      <span className="font-bold text-indigo-600 truncate max-w-[150px]">{createdOrderRef.files?.[0]?.original_filename || 'File'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Merchant Shop:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">{createdOrderRef.shop_name}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                      <span className="text-slate-500">Total Charged:</span>
                      <span className="font-bold text-emerald-600">{formatRupees(createdOrderRef.total_amount)}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={closeCheckoutFlow}
                  className="w-full py-3 bg-slate-100 text-indigo-950 hover:bg-slate-200 rounded-xl font-extrabold text-xs transition-colors"
                >
                  Track Progress on Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
