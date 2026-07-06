import React from 'react';
import { Lock, EyeOff, Server, Clock, Cookie, Scale, Users, Mail } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-12 lg:px-20 py-16 pb-24">
      <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/60 shadow-sm bg-white/40">
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center">
            <Lock className="h-7 w-7 text-teal-600" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900">Privacy Policy</h1>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-1">Last updated: July 2026</p>
          </div>
        </div>

        <div className="space-y-10 text-slate-600 leading-relaxed font-medium">
          
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-teal-500" />
              1. Information We Collect
            </h3>
            <p>
              When you use PrintKarDoBhaiya, we collect basic information required to facilitate your print orders. This includes account data (such as names and email addresses provided during registration or via Google Auth), and transaction meta-data (such as order status, shop selection, and print specifications). 
            </p>
            <p>
              We explicitly state that we <strong>DO NOT</strong> read, analyze, collect, or view the actual textual or visual content inside the documents you upload for printing.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-500" />
              2. Document Handling & Ephemeral Storage
            </h3>
            <p>
              We take the privacy of your assignments, research papers, and personal documents very seriously. <strong>All uploaded files are treated as ephemeral data.</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Data Security:</strong> All data transmitted between your device and our servers is strictly encrypted in transit using industry-standard SSL/TLS protocols.</li>
              <li>When you upload a document, it is sent securely to our cloud spooler.</li>
              <li>The file is made available exclusively to the specific shopkeeper you select for printing.</li>
              <li><strong>Auto-Deletion:</strong> Exactly 30 minutes after the file is uploaded and processed, our systems automatically and permanently purge the document from our servers. We do not keep backups or archives of your printed files.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Server className="h-5 w-5 text-teal-500" />
              3. Payment Information
            </h3>
            <p>
              PrintKarDoBhaiya uses <strong>Razorpay</strong> as our secure payment gateway. We do not collect, process, or store your financial data (such as credit card numbers, CVVs, or UPI PINs) on our own infrastructure. All payment transactions are directly handled by Razorpay's PCI-DSS compliant servers. We only receive an encrypted token confirming whether your payment was successful or failed.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Cookie className="h-5 w-5 text-amber-500" />
              4. Cookies and Tracking
            </h3>
            <p>
              PrintKarDoBhaiya relies on essential cookies and local storage tokens strictly necessary to keep users logged in securely, maintain active sessions, and facilitate the Razorpay payment integration. We do not use intrusive tracking cookies, nor do we harvest your browsing data for targeted advertising.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Scale className="h-5 w-5 text-slate-700" />
              5. Legal Disclosures
            </h3>
            <p>
              While files are permanently and automatically deleted after 30 minutes, we may disclose available account details (such as your registered email address or basic transaction logs) if strictly required by law, court order, or formal requests by government authorities.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-500" />
              6. Third-Party Sharing
            </h3>
            <p>
              We do not sell, rent, or trade your personal information to third parties. Your data is only shared with the partner print shop solely for the purpose of fulfilling your specific print order.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-teal-500" />
              7. Contacting Us
            </h3>
            <p>
              If you have any questions regarding this Privacy Policy or how your data is handled, please reach out to our privacy officer at <a href="mailto:support@printkardobhaiya.com" className="text-teal-600 hover:underline">support@printkardobhaiya.com</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
