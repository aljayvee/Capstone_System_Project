import React from "react";
import { Link } from "react-router";
import { ArrowLeft, Scale, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500/30 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold text-sm">
              SE
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-white leading-tight">
                SUGO EXPRESS
              </h1>
              <p className="text-xs text-slate-400">Tacurong City Logistics</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 py-10 sm:py-14 flex-1 w-full space-y-10">
        {/* Document Header */}
        <div className="space-y-3 border-b border-slate-800/80 pb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            <Scale className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Terms of Service
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
            Effective Date: October 5, 2026. Please read these terms carefully before accessing or using the Sugo Express logistics and on-demand delivery platform.
          </p>
        </div>

        {/* Section 1: Acceptance */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">1</span>
            Acceptance of Terms
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            By registering an account, submitting an errand, or accessing any service provided by Sugo Express, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use our services.
          </p>
        </section>

        {/* Section 2: Platform Description */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">2</span>
            Nature of the Platform
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Sugo Express is a digital dispatch and logistics coordination platform serving Tacurong City and neighboring areas. We connect customers with independent freelance delivery riders to fulfill pabili errands, store shopping, parcel pickup, and document transport.
          </p>
        </section>

        {/* Section 3: Account Security & Phone Number Verification */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">3</span>
            Account Registration & Phone Verification
          </h3>
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-3 text-sm text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 text-white font-semibold">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>Accurate Information & Ownership Verification</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You agree to provide true, current, and complete registration details, including your personal Philippine mobile phone number. All phone numbers are subjected to one-time password (OTP) verification. You may not register phone numbers that you do not legally own or hold authorization to access.
            </p>
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>Account Confidentiality</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are responsible for safeguarding your login credentials. You agree to notify Sugo Express immediately if you suspect unauthorized access or breach of your account.
            </p>
          </div>
        </section>

        {/* Section 4: Ordering, Pricing & Payments */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">4</span>
            Errands, Pricing & Settlement
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            When ordering a pabili errand:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-2">
            <li><strong>Item Pricing:</strong> Estimated item prices shown in catalogs or user-entered lists are approximate. The final amount due is based on the actual merchant cash register receipt obtained by the rider.</li>
            <li><strong>Delivery Fees:</strong> Delivery fees are computed based on distance, number of store stops, and operational route conditions.</li>
            <li><strong>Payment Modes:</strong> Customers must settle errand payments upon delivery via Cash on Delivery (COD) or verified electronic transfer (e.g., GCash / Maya) supported by legible payment receipts.</li>
          </ul>
        </section>

        {/* Section 5: Prohibited Items */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">5</span>
            Prohibited Items & Illegal Activities
          </h3>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-2 text-sm text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>Strictly Banned Cargo</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You must not use Sugo Express to purchase, transport, or deliver illegal narcotics, firearms, ammunition, hazardous chemicals, stolen goods, or any items prohibited by the laws of the Republic of the Philippines. Any violation will result in immediate account termination and referral to law enforcement agencies.
            </p>
          </div>
        </section>

        {/* Section 6: Limitation of Liability */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">6</span>
            Limitation of Liability
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Sugo Express strives for prompt, reliable delivery, but shall not be held liable for delays caused by adverse weather conditions, traffic incidents, store stock unavailability, or unforeseen force majeure events beyond our reasonable operational control.
          </p>
        </section>

        {/* Section 7: Governing Law */}
        <section className="space-y-4 border-t border-slate-800/80 pt-8">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">7</span>
            Governing Law & Dispute Resolution
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising under these terms shall be resolved amicably through good-faith negotiation or brought before the competent courts of Tacurong City, Sultan Kudarat.
          </p>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-sm space-y-1.5 mt-4">
            <p className="font-semibold text-white">Questions Regarding Terms</p>
            <p className="text-slate-400">Email: <a href="mailto:aljayveversola@gmail.com" className="text-red-400 hover:underline">aljayveversola@gmail.com</a></p>
            <p className="text-slate-400">Location: Tacurong City, Sultan Kudarat, Philippines 9800</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 Sugo Express. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-300 text-slate-400 font-medium transition-colors">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-slate-300 text-slate-400 font-medium transition-colors">
              Terms of Service
            </Link>
            <span>&bull;</span>
            <Link to="/" className="hover:text-slate-300 text-slate-400 font-medium transition-colors">
              Portal Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default TermsOfServicePage;
