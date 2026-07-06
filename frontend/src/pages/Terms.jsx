import React from 'react';
import { ShieldCheck, Receipt, AlertCircle, FileText, FileWarning, KeyRound, Scale } from 'lucide-react';

export default function Terms() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-12 lg:px-20 py-16 pb-24">
      <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/60 shadow-sm bg-white/40">
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <FileText className="h-7 w-7 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900">Terms & Conditions</h1>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-1">Last updated: July 2026</p>
          </div>
        </div>

        <div className="space-y-10 text-slate-600 leading-relaxed font-medium">
          
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              1. General Usage
            </h3>
            <p>
              Welcome to PrintKarDoBhaiya. By accessing our platform, you agree to be bound by these terms. 
              Our service connects students with local campus print shops to facilitate remote document queuing and printing. 
              You are responsible for ensuring the documents you upload do not violate any copyright or institutional policies.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-500" />
              2. Payments & Razorpay Integration
            </h3>
            <p>
              All payments on PrintKarDoBhaiya are processed securely via our payment partner, <strong>Razorpay</strong>. 
              We do not store your credit card details, UPI pins, or bank passwords on our servers. 
            </p>
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
              <p><strong>Payment Verification:</strong> Any issues, disputes, or discrepancies related to payments, deductions, or failed transactions will be strictly verified against the official transaction history provided by the Razorpay merchant dashboard. The records maintained by Razorpay will be considered final and binding.</p>
            </div>
          </section>

          <section className="space-y-4" id="refund">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              3. No Refund Policy & Shop Disputes
            </h3>
            <p>
              Due to the physical nature of our service, <strong>we operate on a strict NO REFUND policy</strong>.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Once a document is transmitted to a shopkeeper and the printing process is initiated, physical resources (paper, ink, electricity) are immediately consumed. Therefore, it is impossible to reverse the process or issue a refund via the platform.</li>
              <li>It is the user's sole responsibility to verify the document layout, page count, color selection, and chosen shop before authorizing the payment via Razorpay.</li>
              <li>If a transaction fails but money is deducted from your bank account, Razorpay's standard auto-refund cycle (usually 3-5 business days) will apply, as the print order will not be successfully placed on our system.</li>
              <li><strong>Shopkeeper Errors:</strong> In the event of a printing mistake caused entirely by the partner shop (e.g., wrong paper size, ink smudges, color errors), the student must resolve the dispute directly with the shopkeeper at the pickup counter <strong>BEFORE</strong> leaving the premises. PrintKarDoBhaiya acts strictly as a technological facilitator and will not mediate quality disputes, nor process refunds, once the printed document leaves the shop.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">4. Document Privacy & Retention</h3>
            <p>
              We respect your privacy. Documents uploaded to the PrintKarDoBhaiya cloud spooler are stored temporarily solely for the purpose of printing.
              In accordance with our platform rules, files are <strong>automatically and permanently deleted from our servers 30 minutes after they are processed</strong>. 
              Shopkeepers only have access to your files during this 30-minute printing window.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-amber-500" />
              5. Prohibited Content & Academic Integrity
            </h3>
            <p>
              Users are 100% legally liable for the content they upload to the platform. You are explicitly prohibited from uploading any documents that violate intellectual property or copyright laws, university academic integrity policies (such as exam leaks, unauthorized test banks, or cheating materials), or contain explicit, illegal, or defamatory content.
            </p>
            <p>
              Because our system utilizes an automated 30-minute cloud deletion cycle to protect user privacy, PrintKarDoBhaiya does not manually pre-screen documents. The responsibility for the legality and academic integrity of the printed material falls entirely on the user uploading it.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-500" />
              6. User Accounts & Security
            </h3>
            <p>
              You are entirely responsible for maintaining the confidentiality and security of your account login credentials. Any print order, payment, or transaction placed through your account will be deemed authorized by you. PrintKarDoBhaiya shall not be held liable for any unauthorized access, orders, or data breaches resulting from user negligence in securing their account details.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Scale className="h-5 w-5 text-slate-700" />
              7. Limitation of Liability
            </h3>
            <p>
              PrintKarDoBhaiya provides a convenience layer between students and print shops. We are not liable for any indirect, incidental, punitive, or consequential academic or financial losses. This includes, but is not limited to, a student missing an exam deadline, failing an assignment, or losing marks due to application downtime, shop printer jams, or unexpectedly long physical queues. 
            </p>
            <p>
              In any event where PrintKarDoBhaiya is found liable, our maximum financial liability is strictly capped at the exact amount paid by the user for that specific failed order.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">8. Service Availability</h3>
            <p>
              While we strive to provide 99.9% uptime, PrintKarDoBhaiya relies on the operational status of individual partner print shops. 
              We are not liable for delays caused by shop closures, hardware malfunctions at the shop, internet outages, or acts of God.
            </p>
          </section>

          {/* Slogan added to the bottom as requested */}
          <div className="pt-8 mt-12 border-t border-slate-200/60 text-center">
            <p className="text-lg font-display font-bold text-indigo-600">Skip the queue. Print smart.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
