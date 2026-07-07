import { useState, useEffect, useRef } from 'react';
import { 
  Search, Upload, FileText, Check, Layers, Sparkles, ShoppingBag, 
  ChevronRight, ShieldCheck, Clock, MessageSquare, AlertCircle, File, Smartphone,
  Megaphone, HelpCircle, Send, Paperclip, RefreshCw, X, Download, Trash2
} from 'lucide-react';
import { shopService, orderService, paymentService, adminService } from '../services/api';

const getMockPaymentId = () => 'pay_mock_' + Math.random().toString(36).substring(7);

export default function StudentDashboard({ currentUser }) {
  
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
  const [files, setFiles] = useState([]); // Array of { file, name, pageCount, from, to, previewUrl }
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copiesCount, setCopiesCount] = useState(1);
  const [colorMode, setColorMode] = useState('BW'); // 'BW' | 'COLOR'
  const [doubleSided, setDoubleSided] = useState(false);
  const [selectedBinding, setSelectedBinding] = useState('None');
  const [studentComment, setStudentComment] = useState('');
  
  // Dynamic page count computed from files ranges
  const pageCount = files.reduce((sum, f) => sum + (f.to - f.from + 1), 0) || 1;
  
  // Checkout/Payment Simulation States
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [createdOrderRef, setCreatedOrderRef] = useState(null);

  // Clickable History Modal & Receipt states
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // SLA Timeout Transfer State
  const [transferOrderId, setTransferOrderId] = useState(null);

  // Broadcast & Support States
  const [notices, setNotices] = useState([]);
  const [supportCategory, setSupportCategory] = useState('PAYMENT_FAILED');
  const [supportEmail, setSupportEmail] = useState(currentUser?.email || '');
  const [supportPhone, setSupportPhone] = useState(currentUser?.phone_number || '');
  const [supportDetails, setSupportDetails] = useState('');
  const [supportAttachment, setSupportAttachment] = useState(null);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [linkedOrderId, setLinkedOrderId] = useState('');

  const fileInputRef = useRef(null);

  async function loadData() {
    try {
      const [shopsRes, ordersRes, noticesRes] = await Promise.all([
        shopService.getPublicList(),
        orderService.getStudentOrders(),
        adminService.getNoticeFeed()
      ]);
      setShops(shopsRes.data.results || shopsRes.data);
      setOrders(ordersRes.data.results || ordersRes.data);
      setNotices(noticesRes.data.results || noticesRes.data);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  }

  const loadPdfJs = () => {
    return new Promise((resolve) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      document.head.appendChild(script);
    });
  };

  const getPdfPageCount = async (fileObj) => {
    try {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await fileObj.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      return pdf.numPages;
    } catch (err) {
      console.error("PDF page count parsing failed", err);
      return 1;
    }
  };

  const parsePageCount = async (fileObj) => {
    if (fileObj.name.toLowerCase().endsWith('.pdf')) {
      setPdfLoading(true);
      const count = await getPdfPageCount(fileObj);
      setPdfLoading(false);
      return count;
    }
    return 1;
  };

  const addStagedFiles = async (fileList) => {
    const newFiles = Array.from(fileList);
    const validFiles = newFiles.filter(f => {
      const sizeMB = f.size / 1048576;
      if (sizeMB > 10) {
        alert(`File ${f.name} exceeds the 10MB size limit.`);
        return false;
      }
      return true;
    });

    if (files.length + validFiles.length > 10) {
      alert("You can upload a maximum of 10 documents per order.");
      return;
    }

    const processed = [];
    for (let f of validFiles) {
      const pgCount = await parsePageCount(f);
      processed.push({
        file: f,
        name: f.name,
        pageCount: pgCount,
        from: 1,
        to: pgCount,
        previewUrl: URL.createObjectURL(f)
      });
    }

    setFiles(prev => [...prev, ...processed]);
  };

  const updateFileRange = (index, key, val) => {
    setFiles(prev => {
      const copy = [...prev];
      copy[index][key] = val;
      return copy;
    });
  };

  const removeFile = (index) => {
    setFiles(prev => {
      const fileToRemove = prev[index];
      if (fileToRemove.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePayNow = async (order) => {
    setPaymentProcessing(true);
    try {
      const rzpRes = await paymentService.createRazorpayOrder(order.id);
      
      await paymentService.verifyPayment({
         razorpay_order_id: rzpRes.data.razorpay_order_id,
         razorpay_payment_id: getMockPaymentId(),
         razorpay_signature: 'mock_signature'
      });

      setPaymentProcessing(false);
      alert("Payment successful! Your order has been sent to the shopkeeper for printing.");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Payment failed: " + JSON.stringify(err.response?.data || err.message));
      setPaymentProcessing(false);
    }
  };

  const handleShopSwapSetup = async (order) => {
    setPaymentProcessing(true);
    try {
      const recoveredFiles = [];
      if (order.files && order.files.length > 0) {
        for (let f of order.files) {
          const fileUrl = f.file || f.file_url;
          if (fileUrl) {
            const res = await fetch(fileUrl);
            const blob = await res.blob();
            const fileObj = new File([blob], f.original_filename, { type: blob.type });
            recoveredFiles.push({
              file: fileObj,
              name: f.original_filename,
              pageCount: order.page_count || 1,
              from: 1,
              to: order.page_count || 1,
              previewUrl: URL.createObjectURL(fileObj)
            });
          }
        }
      }

      setFiles(recoveredFiles);
      setCopiesCount(order.copies || 1);
      setColorMode(order.color_mode || 'BW');
      setDoubleSided(order.double_sided || false);
      setSelectedBinding(order.binding_option || 'None');
      setStudentComment(order.student_comment || '');
      
      await orderService.handleOrderTimeout(order.id, 'cancel');
      
      setSelectedShop(null);
      setActiveTab('NEW_PRINT');
      setPaymentProcessing(false);
      alert("Please select a new shop to complete your print booking.");
    } catch (err) {
      console.error("Failed to swap shop", err);
      alert("Failed to transition shop selection: " + err.message);
      setPaymentProcessing(false);
    }
  };

  const fetchReceipt = async (orderId) => {
    setReceiptLoading(true);
    try {
      const res = await orderService.getReceipt(orderId);
      setReceiptData(res.data);
    } catch (err) {
      console.error("Failed to fetch receipt", err);
      setReceiptData(null);
    } finally {
      setReceiptLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHistoryOrder) {
      if (selectedHistoryOrder.status === 'COLLECTED') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchReceipt(selectedHistoryOrder.id);
      } else {
        setReceiptData(null);
      }
    }
  }, [selectedHistoryOrder]);

  const handleDownloadReceipt = () => {
    if (!receiptData) return;
    
    const content = `
=============================================
           PRINTSKARDOBHAIYA RECEIPT
=============================================
Receipt Number:   ${receiptData.receipt_number}
Order Number:     ${receiptData.order_number}
Date Generated:   ${new Date(receiptData.timestamp).toLocaleString()}
Transaction Ref:  ${receiptData.transaction_reference || 'N/A'}

Student Name:     ${receiptData.student_name}
Student Email:    ${receiptData.student_email}

---------------------------------------------
SHOP DETAILS:
Shop Name:        ${receiptData.shop_name}
Pickup Address:   ${receiptData.shop_address}

---------------------------------------------
PRINT SPECIFICATIONS:
Color Mode:       ${receiptData.color_mode}
Pages count:      ${receiptData.page_count}
Copies:           ${receiptData.copies}
Double-Sided:     ${receiptData.double_sided ? 'Yes (Duplex)' : 'No (Simplex)'}
Binding Option:   ${receiptData.binding_option}

---------------------------------------------
BILLING SUMMARY:
Base Pages Cost:  ₹${Number(receiptData.price_breakdown?.base_cost || 0).toFixed(2)}
Binding Cost:     ₹${Number(receiptData.price_breakdown?.binding_cost || 0).toFixed(2)}
Discount Applied: -₹${Number(receiptData.price_breakdown?.discount_applied || 0).toFixed(2)}
Total Paid:       ₹${Number(receiptData.total_amount || 0).toFixed(2)}

=============================================
    Thank you for printing with PrintKarDoBhaiya!
=============================================
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${receiptData.order_number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSlaAction = async (orderId, action, newShopId = null) => {
    try {
      const res = await orderService.handleOrderTimeout(orderId, action, newShopId);
      alert(res.data.message || "Action completed.");
      setTransferOrderId(null);
      loadData();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Action failed";
      alert(errMsg);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);



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
    if (doubleSided && pl.double_sided_supported) {
       if (pl.double_sided_rate_per_page) {
          pageRate = pl.double_sided_rate_per_page;
       } else {
          pageRate = pageRate * 0.85;
       }
    }
    
    const baseCost = pageCount * copiesCount * (pageRate || 0);
    
    let bindingCost = 0;
    if (selectedBinding && selectedBinding !== 'None') {
      const option = selectedShop.binding_options?.find(b => b.id === selectedBinding || b.name === selectedBinding);
      if (option) bindingCost = parseFloat(option.price || 0) * copiesCount;
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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      addStagedFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      addStagedFiles(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const selectShop = (shop) => {
    if (shop.status !== 'OPEN') return;
    setSelectedShop(shop);
    setFiles([]);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedShop) return;
    if (files.length === 0) {
      alert("Please upload at least one document.");
      return;
    }

    setPaymentProcessing(true);
    
    try {
      // 1. Create order (Pending Acceptance)
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
      files.forEach(f => {
         formData.append('files', f.file);
      });

      const orderRes = await orderService.create(formData);
      const createdOrder = orderRes.data;
      
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      setCreatedOrderRef(createdOrder);
      
      // Reload orders
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to submit order request: " + JSON.stringify(err.response?.data || err.message));
      setPaymentProcessing(false);
    }
  };

  const closeCheckoutFlow = () => {
    setShowCheckout(false);
    setPaymentSuccess(false);
    setCreatedOrderRef(null);
    // Reset inputs
    setFiles([]);
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
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold mb-1">Welcome back, <span style={{textDecoration: 'underline decoration-2 decoration-[#B9FF66]'}}>{currentUser?.name}</span></h2>
            <p style={{color: '#666', marginTop: '0.25rem'}}>Manage your print requests and track collection queues.</p>
          </div>
          <button
            onClick={() => {
              loadData();
            }}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh State
          </button>
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
            <button 
              onClick={() => setActiveTab('SUPPORT')} 
              className={`pb-3 px-2 font-bold transition-all flex items-center gap-2 ${activeTab === 'SUPPORT' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Raise support Ticket
            </button>
          </div>

        {/* Notices Banner Spooler */}
        {notices.length > 0 && (
          <div className="mb-8 space-y-3">
            {notices.map(notice => (
              <div key={notice.id} className="glass-panel p-5 rounded-3xl bg-indigo-50/70 border border-indigo-100/80 text-slate-700 shadow-sm flex gap-4 items-start">
                <Megaphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-sm">{notice.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{notice.message}</p>
                  <span className="block text-[9px] font-mono text-slate-400">{new Date(notice.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

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
                          className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer flex flex-col justify-between h-56 transition-all duration-300 relative overflow-hidden ${
                            isOpen 
                              ? 'hover:shadow-md hover:-translate-y-1 hover:border-indigo-200' 
                              : 'opacity-70 grayscale cursor-not-allowed bg-slate-50'
                          }`}
                        >
                          {shop.is_discount_active && (
                            <div className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider py-1 px-3.5 rounded-bl-xl shadow-xs z-10 animate-pulse">
                              🔥 {parseFloat(shop.discount_percentage)}% OFF
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400">
                                {shop.area} • {shop.city}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                isOpen ? 'bg-emerald-50 text-emerald-600' : isHoliday ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                              } ${shop.is_discount_active ? 'mr-12' : ''}`}>
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

                  {/* Multi-File Upload Box */}
                  {files.length < 10 && (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={triggerFileSelect}
                      className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                        dragActive 
                          ? 'border-indigo-600 bg-indigo-50/20 scale-99' 
                          : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50 bg-white/40 shadow-xs'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="bg-indigo-50 p-4 rounded-2xl mb-4 text-indigo-600">
                        <Upload className="w-6 h-6 animate-bounce" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Upload documents to print</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG accepted (Up to 10 files, Max 10MB each)</p>
                      <span className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">
                        Browse Files
                      </span>
                    </div>
                  )}

                  {/* Staged Files List */}
                  {files.length > 0 && (
                    <div className="space-y-3.5 mt-4">
                      <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex justify-between">
                        <span>Staged Documents ({files.length}/10)</span>
                        {pdfLoading && <span className="text-[10px] text-indigo-600 animate-pulse font-bold">Parsing PDF page count...</span>}
                      </h5>
                      <div className="space-y-2">
                        {files.map((fileObj, idx) => (
                          <div key={idx} className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                            <div className="flex items-center gap-3">
                              {/* Pre-upload Interactive Preview */}
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                {fileObj.file.type.startsWith('image/') ? (
                                  <img src={fileObj.previewUrl} className="w-full h-full object-cover" alt="preview" />
                                ) : (
                                  <FileText className="w-6 h-6 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-850 text-xs truncate max-w-[200px]">{fileObj.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{(fileObj.file.size / 1048576).toFixed(2)} MB • {fileObj.pageCount} pages detected</p>
                              </div>
                            </div>

                            {/* Interactive Page Range Selector */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Range:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  max={fileObj.pageCount}
                                  value={fileObj.from}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    updateFileRange(idx, 'from', val);
                                  }}
                                  className="w-12 text-center bg-slate-50 border border-slate-200 rounded-lg py-1 text-xs font-bold text-slate-700 focus:outline-indigo-500"
                                />
                                <span className="text-slate-400 text-xs">to</span>
                                <input
                                  type="number"
                                  min={fileObj.from}
                                  max={fileObj.pageCount}
                                  value={fileObj.to}
                                  onChange={(e) => {
                                    const val = Math.min(fileObj.pageCount, Math.max(fileObj.from, parseInt(e.target.value) || fileObj.pageCount));
                                    updateFileRange(idx, 'to', val);
                                  }}
                                  className="w-12 text-center bg-slate-50 border border-slate-200 rounded-lg py-1 text-xs font-bold text-slate-700 focus:outline-indigo-500"
                                />
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => removeFile(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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
                          <span className="text-[10px] text-slate-400 font-mono">Auto-calculated</span>
                        </div>
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 font-extrabold">
                          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                        </div>
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
                        ></textarea>
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
                      disabled={files.length === 0}
                      onClick={() => setShowCheckout(true)}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                        files.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-none'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      {files.length === 0 ? 'Upload Document to Pay' : 'Pay via UPI'}
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
                      <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
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
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Price</span>
                            <span className="text-lg font-bold text-slate-800">{formatRupees(order.total_amount)}</span>
                            <button
                              onClick={() => setSelectedHistoryOrder(order)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                            >
                              View Billing Info
                            </button>
                          </div>
                        </div>

                        {order.status !== 'PENDING_PAYMENT' && (
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
                        )}

                        {order.status !== 'PENDING_PAYMENT' && (
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
                        )}

                        {order.student_comment || order.studentComment ? (
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed text-slate-600">
                              <strong className="text-slate-800">Your Instructions:</strong> {"\""}{order.student_comment || order.studentComment}{"\""}
                            </div>
                          </div>
                        ) : null}

                        {order.status === 'PENDING_PAYMENT' && (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <span className="text-xs font-bold text-amber-800 block">Order Accepted - Payment Required</span>
                              <p className="text-[10px] text-amber-600">The shopkeeper has verified and accepted your order request. Please complete the payment to initiate printing.</p>
                            </div>
                            <button
                              onClick={() => handlePayNow(order)}
                              disabled={paymentProcessing}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:scale-102 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              {paymentProcessing ? 'Processing...' : 'Pay Now'}
                            </button>
                          </div>
                        )}

                        {order.status === 'READY_FOR_COLLECTION' && (
                          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <span className="text-xs font-bold text-emerald-800 block font-bold">Print sheets are ready!</span>
                              <p className="text-[10px] text-emerald-600">Visit the shop to collect your prints. Show Order Number: {order.order_number}</p>
                            </div>
                          </div>
                        )}
                        {order.status === 'REJECTED' && (
                          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col gap-2">
                            <span className="text-xs font-bold text-rose-800 block">Order Rejected</span>
                            <p className="text-[10px] text-rose-600">Reason: {order.shop_rejection_reason || order.shopRejectionReason || "Machine breakdown or queue overload."}</p>
                            <p className="text-[10px] text-rose-600 font-bold">Your payment has been automatically initiated for refund.</p>
                          </div>
                        )}

                        {/* SLA Timeout Warning Banner */}
                        {order.sla_timeout && order.status === 'PLACED' && (
                          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4.5 space-y-3">
                            <div className="flex items-start gap-3">
                              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">Unconfirmed SLA Timeout (12 Mins Exceeded)</h5>
                                <p className="text-amber-700 text-xs mt-1">
                                  This shop has not accepted your print order yet. You can cancel it immediately or switch to an alternate print shop without re-uploading documents.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end">
                              <button
                                onClick={() => handleSlaAction(order.id, 'cancel')}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                Cancel Order
                              </button>
                              <button
                                onClick={() => handleShopSwapSetup(order)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                Change Shop
                              </button>
                            </div>
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
                    <div
                      key={order.id}
                      onClick={() => setSelectedHistoryOrder(order)}
                      className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                    >
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

        {/* HELP & SUPPORT TAB */}
        {activeTab === 'SUPPORT' && (
          <div className="glass-panel p-8 rounded-3xl border border-white/60 bg-white/40 shadow-sm max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Raise a Support Ticket
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Need help with payments or quality issues? Send a ticket directly to the administrators.</p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!supportDetails || !supportEmail || !supportPhone) {
                  alert("Please enter email, phone and ticket details.");
                  return;
                }
                
                const formData = new FormData();
                formData.append('category', supportCategory);
                formData.append('email', supportEmail);
                formData.append('phone_number', supportPhone);
                formData.append('details', supportDetails);
                if (supportAttachment) {
                  formData.append('attachment', supportAttachment);
                }

                try {
                  setSupportSubmitting(true);
                  if (linkedOrderId) {
                    formData.append('order_id', linkedOrderId);
                  }
                  await adminService.createSupportTicket(formData);
                  alert("Support ticket raised successfully! The admin support mailbox has been notified.");
                  setSupportDetails('');
                  setSupportAttachment(null);
                  setLinkedOrderId('');
                } catch (err) {
                  console.error("Support ticket submission failed", err);
                  alert("Failed to submit support request");
                } finally {
                  setSupportSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Issue Category</label>
                <select
                  value={supportCategory}
                  onChange={(e) => setSupportCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                >
                  <option value="PAYMENT_FAILED">Payment Failed</option>
                  <option value="PRINT_QUALITY">Print Quality Issue</option>
                  <option value="BEHAVIOR">Shopkeeper Behavior</option>
                  <option value="DELAY">Delay</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Your Email Address</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Your Phone Number</label>
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Description of Issue</label>
                <textarea
                  rows={4}
                  placeholder="Explain your problem clearly. If it's a payment issue, please include the Razorpay Payment ID or transaction timestamp."
                  value={supportDetails}
                  onChange={(e) => setSupportDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-indigo-500"
                  required
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Multimedia Attachment (Screenshot/PDF)</label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 border border-dashed border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 text-slate-700">
                    <Paperclip className="w-3.5 h-3.5" />
                    {supportAttachment ? 'Change File' : 'Upload Receipt / Proof'}
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSupportAttachment(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {supportAttachment && (
                    <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md max-w-xs truncate">
                      {supportAttachment.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/60 flex justify-end">
                <button
                  type="submit"
                  disabled={supportSubmitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {supportSubmitting ? 'Raising Ticket...' : 'Submit Support Request'}
                </button>
              </div>
            </form>
          </div>
        )}

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
                  <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-indigo-400">Order Booking</span>
                  <h4 className="font-extrabold text-sm tracking-tight text-white">Confirm Print Booking</h4>
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
                    <span className="text-[10px] text-indigo-600 block font-mono">Accept-First, Pay-Later</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Estimated Total</span>
                    <span className="text-lg font-black text-indigo-700">{formatRupees(currentPriceBreakdown.total)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Order Details</span>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center gap-3 text-center">
                    <Clock className="w-8 h-8 text-indigo-600 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">No Upfront Payment Required</h4>
                      <p className="text-[10px] text-slate-500 mt-1">You will pay only after the shopkeeper verifies and accepts your print request.</p>
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
                      Submitting Booking Request...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Place Booking (Pay Later)
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-800">Booking Placed Successfully!</h4>
                  <p className="text-slate-500 text-xs mt-1 leading-normal">
                    Your order request has been submitted to {selectedShop.name}. You will pay after they accept it.
                  </p>
                </div>
                {createdOrderRef && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-left text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Number:</span>
                      <span className="font-bold text-slate-800">{createdOrderRef.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Merchant Shop:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">{createdOrderRef.shop_name}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                      <span className="text-slate-500">Estimated Amount:</span>
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

      {/* Clickable Print Details & Receipt Modal */}
      {selectedHistoryOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm">
                  {selectedHistoryOrder.order_number}
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm mt-1.5">Print Order Details</h4>
              </div>
              <button
                onClick={() => setSelectedHistoryOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-650">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">Shop Name</span>
                  <span className="font-bold text-slate-800">{selectedHistoryOrder.shop_name}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="font-semibold text-slate-400">Specifications</span>
                  <span className="font-bold text-slate-800">
                    {selectedHistoryOrder.color_mode} • {selectedHistoryOrder.page_count} pgs • {selectedHistoryOrder.copies} copies
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="font-semibold text-slate-400">Double-Sided</span>
                  <span className="font-bold text-slate-800">{selectedHistoryOrder.double_sided ? 'Yes (Duplex)' : 'No (Simplex)'}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="font-semibold text-slate-400">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    selectedHistoryOrder.status === 'COLLECTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {selectedHistoryOrder.status}
                  </span>
                </div>
                {selectedHistoryOrder.status === 'REJECTED' && (
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    <span className="font-semibold text-slate-400">Rejection Reason</span>
                    <p className="text-rose-600 font-medium leading-relaxed bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                      Reason: {selectedHistoryOrder.shop_rejection_reason || selectedHistoryOrder.shopRejectionReason || "Machine breakdown or queue overload."}
                    </p>
                  </div>
                )}
              </div>

              {/* Itemized Bill */}
              <div className="space-y-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Itemized Billing</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>Base Print Cost</span>
                    <span>{formatRupees(selectedHistoryOrder.price_breakdown?.base_cost || selectedHistoryOrder.total_amount)}</span>
                  </div>
                  {selectedHistoryOrder.price_breakdown?.binding_cost > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Binding Surcharge</span>
                      <span>{formatRupees(selectedHistoryOrder.price_breakdown.binding_cost)}</span>
                    </div>
                  )}
                  {selectedHistoryOrder.price_breakdown?.discount_applied > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Campaign Discount</span>
                      <span>-{formatRupees(selectedHistoryOrder.price_breakdown.discount_applied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-extrabold text-slate-900 text-sm">
                    <span>Net Amount Paid</span>
                    <span>{formatRupees(selectedHistoryOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Download Action (Only for COMPLETED / COLLECTED status) */}
            {selectedHistoryOrder.status === 'COLLECTED' && (
              <div className="pt-2">
                {receiptLoading ? (
                  <button disabled className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    Loading Receipt...
                  </button>
                ) : receiptData ? (
                  <button
                    onClick={handleDownloadReceipt}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold shadow-md hover:scale-102 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download Digital Receipt
                  </button>
                ) : (
                  <button disabled className="w-full py-2.5 bg-slate-150 text-slate-450 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    Receipt Unavailable
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SLA Transfer Shop Selection Modal */}
      {transferOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Transfer Print Order</h4>
              <p className="text-slate-500 text-xs mt-1">
                Select another open print shop on campus to receive this document. Any active discount will be recalculated.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5">
              {shops.filter(s => s.status === 'OPEN' && s.is_approved).map(sh => (
                <div
                  key={sh.id}
                  onClick={() => handleSlaAction(transferOrderId, 'change_shop', sh.id)}
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200/60 hover:border-indigo-300 rounded-2xl cursor-pointer flex justify-between items-center transition-all"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">{sh.name}</span>
                    <span className="text-[10px] text-slate-500 block">{sh.area}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-700 block">B&W: {formatRupees(sh.price_list?.bw_rate_per_page)}</span>
                    <span className="text-[9px] text-slate-400">Color: {formatRupees(sh.price_list?.color_rate_per_page)}</span>
                  </div>
                </div>
              ))}
              {shops.filter(s => s.status === 'OPEN' && s.is_approved).length === 0 && (
                <p className="text-xs text-center text-slate-400 py-6">No other open shops available right now.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTransferOrderId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
