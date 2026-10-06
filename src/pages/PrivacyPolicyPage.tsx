import React from "react";
import { Link } from "react-router";
import { ArrowLeft, ShieldCheck, Phone, MapPin, Lock, FileText } from "lucide-react";

export const PrivacyPolicyPage: React.FC = () => {
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Legal Policy</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Privacy Policy
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
            Effective Date: October 5, 2026. This policy explains how Sugo Express collects, uses, protects, and handles your personal information across our mobile apps and web platforms in compliance with Republic Act No. 10173 (Philippine Data Privacy Act of 2012).
          </p>
        </div>

        {/* Section 1: Overview */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">1</span>
            Introduction & Scope
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Sugo Express operates on-demand logistics, delivery, and pabili errand services in Tacurong City, Sultan Kudarat, Philippines. When you use our Customer Mobile App, Rider Mobile App, or Web Dispatch Portal, you entrust us with personal data. We are committed to safeguarding that information and ensuring transparency in how it is used.
          </p>
        </section>

        {/* Section 2: Data We Collect */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">2</span>
            Information We Collect
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <Phone className="w-4 h-4" />
                <span>Phone Numbers & Verification Data</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your mobile phone number is collected during registration to deliver one-time verification codes (SMS OTP) through secure authentication services (including Google Firebase). This prevents fraudulent account creation and ensures dispatchers and riders can reach you during an active delivery.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <MapPin className="w-4 h-4" />
                <span>Location & Geolocation Data</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                We collect precise device location only when you place an errand or while a rider is actively fulfilling your delivery. This enables road navigation, store waypoint routing, and accurate estimated times of arrival (ETA). We do not track your location when the app is closed.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <FileText className="w-4 h-4" />
                <span>Errand & Transaction Records</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Itemized pabili purchase lists, merchant receipts, proof-of-delivery photos, and payment settlement confirmations (e.g., GCash reference images or cash delivery logs) are stored to resolve disputes and audit errand completion.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <Lock className="w-4 h-4" />
                <span>Account Credentials & Security Logs</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Usernames, cryptographically salted and hashed passwords (bcrypt), device identifiers, and IP addresses are recorded to detect unauthorized logins and defend against brute-force account intrusion.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: SMS OTP & Phone Number Usage */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">3</span>
            SMS Phone Verification Policy
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            We use your phone number strictly for operational service purposes:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-2">
            <li>Transmitting 6-digit one-time passcodes (OTP) to prove device ownership.</li>
            <li>Direct rider-to-customer phone calls and notifications regarding purchase substitutions or arrival at your delivery address.</li>
            <li>Security alerts regarding suspicious sign-ins or password reset requests.</li>
          </ul>
          <p className="text-xs text-slate-400 bg-slate-900/80 border border-slate-800 p-4 rounded-xl leading-relaxed">
            <strong className="text-slate-200">Strict Non-Disclosure Invariant:</strong> We will never sell, rent, lease, or share your phone number with external marketing aggregators or third-party advertising brokers. Your phone number is utilized solely to provide and secure Sugo Express services.
          </p>
        </section>

        {/* Section 4: Data Sharing */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">4</span>
            Service Providers & Data Sharing
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            We share relevant subsets of your information only with trusted infrastructure providers required to operate the platform:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 pl-2">
            <li><strong>Google Firebase & Identity Platform:</strong> For cryptographic phone number verification, push notifications, and database telemetry.</li>
            <li><strong>Assigned Delivery Riders:</strong> Riders assigned to your specific errand receive your delivery address and contact number solely for the duration of that delivery.</li>
            <li><strong>Legal & Regulatory Authorities:</strong> Only when strictly mandated by Philippine law, court subpoena, or lawful government process.</li>
          </ul>
        </section>

        {/* Section 5: Data Security & Retention */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">5</span>
            Security & Retention
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            All data in transit is encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS). Passwords are never stored in plaintext and are protected using industry-standard bcrypt hashing. Delivery receipts and records are retained for auditing and reconciliation before scheduled pruning.
          </p>
        </section>

        {/* Section 6: User Rights */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">6</span>
            Your Rights Under the Data Privacy Act
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Under Republic Act No. 10173, you have the right to be informed, the right to access your personal data, the right to dispute inaccuracies, and the right to request the deletion or anonymization of your account data upon written notice.
          </p>
        </section>

        {/* Section 7: Contact Information */}
        <section className="space-y-4 border-t border-slate-800/80 pt-8">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-300">7</span>
            Contacting the Data Protection Officer
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            If you have questions, feedback, or requests regarding your personal data or this Privacy Policy, please contact our administrative team:
          </p>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-sm space-y-1.5">
            <p className="font-semibold text-white">Sugo Express Logistics</p>
            <p className="text-slate-400">Tacurong City, Sultan Kudarat, Philippines 9800</p>
            <p className="text-slate-400">
              Support Email: <a href="mailto:aljayveversola@gmail.com" className="text-red-400 hover:underline">aljayveversola@gmail.com</a>
            </p>
            <p className="text-slate-400">
              Portal: <a href="https://portal.sugo-express.org" className="text-red-400 hover:underline">https://portal.sugo-express.org</a>
            </p>
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
export default PrivacyPolicyPage;
