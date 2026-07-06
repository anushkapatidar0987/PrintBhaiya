import React, { useState } from 'react';
import { Shop, Order } from '../types';
import { calculatePrintCost } from '../mockData';
import {
  Printer, ArrowRight, UploadCloud, Coins, Sparkles,
  Search, ShieldCheck, MapPin, Clock,
  HelpCircle, CheckCircle2, AlertCircle, Star
} from 'lucide-react';

interface LandingPageProps {
  shops: Shop[];
  orders: Order[];
  onEnterPortal: (role: 'student' | 'shopkeeper' | 'admin') => void;
}

export default function LandingPage({ shops, orders, onEnterPortal }: LandingPageProps) {
  // Calculator States
  const [calcPages, setCalcPages] = useState(10);
  const [calcCopies, setCalcCopies] = useState(1);
  const [calcType, setCalcType] = useState<'bw' | 'color'>('bw');
  const [calcSides, setCalcSides] = useState<'single' | 'double'>('single');
  const [calcShopId, setCalcShopId] = useState(shops[0]?.id || '');

  // Tracker state
  const [searchOrderId, setSearchOrderId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState(false);

  // Calculate prices
  const activeCalcShop = shops.find(s => s.id === calcShopId) || shops[0];
  const calcPrice = activeCalcShop ? calculatePrintCost(calcPages, calcCopies, calcType, calcSides, activeCalcShop) : 0;

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(false);
    setTrackedOrder(null);

    const normalizedId = searchOrderId.trim().toUpperCase();
    const found = orders.find(o => o.id.toUpperCase() === normalizedId || `#${o.id.toUpperCase()}` === normalizedId);

    if (found) {
      setTrackedOrder(found);
    } else {
      setTrackError(true);
    }
  };

  return (
    <div className="space-y-24 pb-16" id="landing-page">

      {/* 1. HERO SECTION */}
      <section className="relative pt-8 sm:pt-16 pb-12 text-center overflow-hidden" id="hero">
        {/* Subtle, premium pastel blur blobs behind hero */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-brand-100 to-amber-50 rounded-full blur-3xl opacity-50 -z-10 animate-float-1" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-violet-50 rounded-full blur-3xl opacity-40 -z-10 animate-float-2" />

        <div className="max-w-4xl mx-auto px-4 space-y-6" id="hero-headings">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 border border-slate-200/50 rounded-full shadow-sm text-xs text-indigo-600 font-semibold" id="hero-pill">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Futuristic Campus Printing Cloud</span>
          </div>

          <h1 className="font-display font-extrabold text-5xl sm:text-6xl md:text-7xl text-slate-900 tracking-tight leading-[1.08] max-w-3xl mx-auto">
            Print Kar Do <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">Bhaiya.</span>
          </h1>

          <p className="text-slate-500 font-sans text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Zero queues. High fidelity sheets. Send your PDFs, slides, and manuals directly to any local campus print shop and collect instantly when spooled.
          </p>

          {/* Core Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4" id="hero-ctas">
            <button
              onClick={() => onEnterPortal('student')}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-2xl shadow-lg shadow-indigo-100/80 hover:shadow-indigo-200/90 transition-all flex items-center justify-center gap-2 group text-sm"
            >
              <span>Instant Upload & Print</span>
              <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onEnterPortal('shopkeeper')}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-2xl border border-slate-200 shadow-sm transition-all text-sm"
            >
              Partner Store Login
            </button>
          </div>

          {/* Quick numbers indicator */}
          <div className="pt-10 flex flex-wrap justify-center gap-12 text-slate-400 text-xs font-mono font-medium" id="hero-metrics">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              <span>₹1.50/page lowest B&W</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-indigo-500" />
              <span>~8m Average Spool Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-purple-500" />
              <span>Secure UPI Sandbox Payments</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS SECTION */}
      <section className="max-w-6xl mx-auto px-4 text-center" id="how-it-works">
        <div className="space-y-2 mb-12">
          <h2 className="font-display font-extrabold text-3xl text-slate-900 tracking-tight">How It Works</h2>
          <p className="text-slate-400 text-xs">Four lightning fast steps to printed papers</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="glass-panel rounded-3xl p-6 text-left border border-white/60 space-y-4 hover:translate-y-[-4px] transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600 font-display">
              1
            </div>
            <h4 className="text-base font-display font-bold text-slate-800">Transmit Document</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Drag slide decks, lab booklets, or project reports directly into the secure cloud terminal.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel rounded-3xl p-6 text-left border border-white/60 space-y-4 hover:translate-y-[-4px] transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl font-bold text-emerald-600 font-display">
              2
            </div>
            <h4 className="text-base font-display font-bold text-slate-800">Customize Layout</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Configure copies, select duplex layout to conserve paper, or request special spiral bindings.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel rounded-3xl p-6 text-left border border-white/60 space-y-4 hover:translate-y-[-4px] transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-xl font-bold text-amber-600 font-display">
              3
            </div>
            <h4 className="text-base font-display font-bold text-slate-800">UPI Instant Settlement</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authorize securely with dynamic UPI QR generation. Shopkeeper instantly receives credit.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-panel rounded-3xl p-6 text-left border border-white/60 space-y-4 hover:translate-y-[-4px] transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-xl font-bold text-purple-600 font-display">
              4
            </div>
            <h4 className="text-base font-display font-bold text-slate-800">Instant Store pickup</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Skip the long queues. Just walk in, grab your prepared packet, and head straight to class.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CALCULATOR & TRACKER BENTO GRID */}
      <section className="max-w-6xl mx-auto px-4" id="pricing-bento">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Bento Block 1: The Print Cost Calculator (3 cols wide) */}
          <div className="lg:col-span-3 glass-panel rounded-3xl p-6 border border-white/60 shadow-xl shadow-slate-100/50 flex flex-col justify-between space-y-6" id="bento-calculator">
            <div>
              <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                <Coins className="h-5 w-5 text-indigo-600" />
                <span>Instant Cost Estimator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Simulate combinations across available local campus shops</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {/* Pages count input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Document Page Spread</label>
                <input
                  type="number"
                  min="1"
                  value={calcPages}
                  onChange={(e) => setCalcPages(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              {/* Copies input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Quantity (Copies)</label>
                <input
                  type="number"
                  min="1"
                  value={calcCopies}
                  onChange={(e) => setCalcCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              {/* Ink Mode Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Ink Selection</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setCalcType('bw')}
                    className={`py-2 text-xs rounded-lg font-semibold border transition-colors ${calcType === 'bw' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-slate-200 text-slate-500'
                      }`}
                  >
                    B&W
                  </button>
                  <button
                    onClick={() => setCalcType('color')}
                    className={`py-2 text-xs rounded-lg font-semibold border transition-colors ${calcType === 'color' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-slate-200 text-slate-500'
                      }`}
                  >
                    Premium Color
                  </button>
                </div>
              </div>

              {/* Sides Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Sheet Layout</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setCalcSides('single')}
                    className={`py-2 text-xs rounded-lg font-semibold border transition-colors ${calcSides === 'single' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-slate-200 text-slate-500'
                      }`}
                  >
                    Single Sided
                  </button>
                  <button
                    onClick={() => setCalcSides('double')}
                    className={`py-2 text-xs rounded-lg font-semibold border transition-colors ${calcSides === 'double' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-slate-200 text-slate-500'
                      }`}
                  >
                    Duplex layout
                  </button>
                </div>
              </div>

              {/* Shop pricing selection */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Estimate Rates From Shop</label>
                <select
                  value={calcShopId}
                  onChange={(e) => setCalcShopId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs appearance-none"
                >
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (B&W: ₹{s.pricing.blackAndWhite}/pg • Color: ₹{s.pricing.color}/pg)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculated cost bar */}
            <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/30 flex items-center justify-between text-left mt-4">
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Estimated Cost</span>
                <span className="text-xl font-display font-extrabold text-indigo-600">₹{calcPrice.toFixed(2)}</span>
              </div>
              <button
                onClick={() => onEnterPortal('student')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <span>Upload Now</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Bento Block 2: Live status tracker query (2 cols wide) */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-white/60 shadow-xl shadow-slate-100/50 flex flex-col justify-between space-y-6" id="bento-tracker">
            <div>
              <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-600" />
                <span>Quick Status Tracker</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Enter your Print ID to monitor ongoing print cycles without logging in</p>
            </div>

            <form onSubmit={handleTrackOrder} className="space-y-3 text-left">
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. ord-101 or ord-102"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none rounded-xl text-slate-800 text-xs placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              {trackError && (
                <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>No matching Print ID found in active queue.</span>
                </p>
              )}

              {/* Result display */}
              {trackedOrder && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200/50 shadow-inner space-y-3 text-left text-xs">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="font-mono font-bold text-indigo-600">{trackedOrder.id}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(trackedOrder.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800 truncate">{trackedOrder.fileName}</p>
                    <p className="text-slate-400 text-[10px]">Shop: <b>{trackedOrder.shopName}</b></p>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Current status:</span>
                    {trackedOrder.status === 'pending' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">Queued</span>
                    )}
                    {trackedOrder.status === 'processing' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 animate-pulse">Printing</span>
                    )}
                    {trackedOrder.status === 'ready' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 animate-bounce">Ready for Collection</span>
                    )}
                    {trackedOrder.status === 'completed' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-50 text-slate-400">Completed</span>
                    )}
                    {trackedOrder.status === 'cancelled' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700">Cancelled</span>
                    )}
                  </div>
                </div>
              )}
            </form>

            <div className="text-[10px] text-slate-400 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
              💡 <b>Tip:</b> Try searching <code>ord-101</code> or <code>ord-102</code> to inspect existing test records.
            </div>
          </div>
        </div>
      </section>

      {/* 4. ACTIVE CAMPUS DIRECTORY SECTION */}
      <section className="max-w-6xl mx-auto px-4 text-center" id="active-shops">
        <div className="space-y-2 mb-12">
          <h2 className="font-display font-extrabold text-3xl text-slate-900 tracking-tight">Active Partners</h2>
          <p className="text-slate-400 text-xs">Live statuses of printing booths near your campus departments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className={`glass-panel rounded-3xl p-6 border border-white/60 shadow-md flex flex-col justify-between space-y-4 hover:shadow-lg transition-all ${shop.status === 'online' ? '' : 'opacity-65'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <span className="text-3xl bg-slate-100 p-2 rounded-2xl block">{shop.logo}</span>
                  <div>
                    <h4 className="font-display font-bold text-slate-800 text-base">{shop.name}</h4>
                    <span className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5">
                      <MapPin className="h-3 w-3" /> {shop.location}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${shop.status === 'online'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                  {shop.status === 'online' ? 'Active' : 'Closed'}
                </span>
              </div>

              {/* Mini detail stats */}
              {shop.status === 'online' && (
                <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Black & White rate</span>
                    <span className="font-mono font-bold text-slate-700">₹{shop.pricing.blackAndWhite}/pg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Queue wait estimate</span>
                    <span className="font-mono font-bold text-indigo-600 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> ~{shop.avgTimeMins} mins
                    </span>
                  </div>
                </div>
              )}

              {/* Rating */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4.5 w-4.5 fill-amber-500" />
                  <span className="font-bold text-slate-700">{shop.rating}</span>
                  <span className="text-slate-400 text-[10px]">({shop.reviewsCount})</span>
                </div>
                <button
                  onClick={() => onEnterPortal('student')}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Send Print Packet
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FAQS & HELP SUPPORT SECTION */}
      <section className="max-w-4xl mx-auto px-4 text-center" id="faqs">
        <div className="space-y-2 mb-12">
          <h2 className="font-display font-extrabold text-3xl text-slate-900 tracking-tight">Got Questions?</h2>
          <p className="text-slate-400 text-xs">Everything you need to know about campus cloud printing</p>
        </div>

        <div className="space-y-4 text-left">
          {/* FAQ 1 */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm space-y-1.5">
            <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>How do I pay? Do you accept cash?</span>
            </h4>
            <p className="text-xs text-slate-500 pl-6.5 leading-relaxed">
              We highly recommend our UPI dynamic sandboxed checkout which takes 3 seconds and settles directly with the shop operator. However, you can also opt to select "Pay Cash at Counter" in the wizard and pay when you collect your papers.
            </p>
          </div>

          {/* FAQ 2 */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm space-y-1.5">
            <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>What document types can I transmit?</span>
            </h4>
            <p className="text-xs text-slate-500 pl-6.5 leading-relaxed">
              Our cloud servers can securely compile PDF, Microsoft Word (DOCX), PowerPoint presentation slides (PPTX), and high resolution images (PNG, JPG).
            </p>
          </div>

          {/* FAQ 3 */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm space-y-1.5">
            <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>Is my document data private?</span>
            </h4>
            <p className="text-xs text-slate-500 pl-6.5 leading-relaxed">
              Yes, absolutely. All transmitted PDFs are automatically sandboxed, encrypted in transit, and spooled directly to local print queues. Once completed or cancelled by the operator, they are permanently cleared from cache storage.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
