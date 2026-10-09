import React from "react";
import { Link } from "react-router";
import { ArrowLeft, ShieldCheck, Phone, MapPin, Lock, FileText } from "lucide-react";

export const PrivacyPolicyPage: React.FC = () => {
  const sections = [
    { id: "overview", label: "1. Introduction & Scope" },
    { id: "data-collection", label: "2. Information We Collect" },
    { id: "sms-policy", label: "3. SMS Phone Verification" },
    { id: "data-sharing", label: "4. Third-Party Sharing" },
    { id: "security-retention", label: "5. Security & Retention" },
    { id: "user-rights", label: "6. Data Privacy Rights" },
    { id: "contact-dpo", label: "7. Contact & Inquiries" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-red-50 selection:text-red-900">
      {/* Top Navigation Bar — Pure White with Hairline Border */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 font-bold text-sm shrink-0">
              SE
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 leading-tight">
                SUGO EXPRESS
              </h1>
              <p className="text-xs text-slate-500">Tacurong City Logistics</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area: Editorial 2-Column with Sticky Table of Contents */}
      <main className="max-w-6xl mx-auto px-6 py-10 sm:py-16 flex-1 w-full">
        {/* Document Header */}
        <div className="border-b border-slate-100 pb-10 mb-12 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Official Policy Document</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight">
            Privacy Policy
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono pt-1">
            <span>Effective Date: <strong className="text-slate-800 tabular-nums">October 5, 2026</strong></span>
            <span>&bull;</span>
            <span>Jurisdiction: <strong className="text-slate-800">Tacurong City, Philippines</strong></span>
            <span>&bull;</span>
            <span>Compliance: <strong className="text-slate-800">RA 10173 (Data Privacy Act)</strong></span>
          </div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed pt-2">
            This policy outlines how Sugo Express collects, utilizes, stores, and safeguards your personal data across the Customer Mobile App, Rider Mobile App, and Web Dispatch Management Portal in strict accordance with Republic Act No. 10173 (Philippine Data Privacy Act of 2012).
          </p>
        </div>

        {/* 2-Column Grid: Sticky TOC on Left, Clean Editorial Content on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16 items-start">
          {/* Sticky Table of Contents (No Card, Clean Hairline Navigation) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 self-start space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contents
            </h3>
            <nav className="space-y-1 text-xs">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="block py-1.5 px-2.5 rounded text-slate-600 hover:text-red-600 hover:bg-slate-50 transition-colors"
                >
                  {sec.label}
                </a>
              ))}
            </nav>
            <div className="pt-6 border-t border-slate-100 text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-800">Need Assistance?</p>
              <p className="leading-relaxed">Contact our Data Protection Officer at <a href="mailto:aljayveversola@gmail.com" className="text-red-600 hover:underline">aljayveversola@gmail.com</a>.</p>
            </div>
          </aside>

          {/* Editorial Reading Stream (Zero Cards, Flowing Typography) */}
          <div className="lg:col-span-9 space-y-14 max-w-2xl xl:max-w-3xl">
            {/* Section 1: Overview */}
            <section id="overview" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">01</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Introduction & Scope
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Sugo Express operates on-demand logistics, delivery, and pabili errand services in Tacurong City, Sultan Kudarat, Philippines. When you use our Customer Mobile App, Rider Mobile App, or Web Dispatch Portal, you entrust us with personal data. We are committed to safeguarding that information and ensuring transparency in how it is used.
              </p>
            </section>

            {/* Section 2: Data We Collect */}
            <section id="data-collection" className="space-y-6 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">02</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Information We Collect
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                We collect only the essential personal information required to safely dispatch, navigate, purchase, and fulfill errands across Tacurong City:
              </p>

              {/* Clean Definition Flow (No Boxed Cards) */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Phone className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Phone Numbers & Verification Data</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                    Your mobile phone number is collected during registration to deliver one-time verification codes (SMS OTP) through secure authentication services (including Google Firebase). This prevents fraudulent account creation and ensures dispatchers and riders can reach you during an active delivery.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Location & Geolocation Data</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                    We collect precise device location only when you place an errand or while a rider is actively fulfilling your delivery. This enables road navigation, store waypoint routing, and accurate estimated times of arrival (ETA). We do not track your location when the app is closed.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <FileText className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Errand & Transaction Records</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                    Itemized pabili purchase lists, merchant receipts, proof-of-delivery photos, and payment settlement confirmations (such as GCash reference images or cash delivery logs) are stored to resolve disputes and audit errand completion.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Lock className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Account Credentials & Security Logs</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                    Usernames, cryptographically salted and hashed passwords (bcrypt), device identifiers, and IP addresses are recorded to detect unauthorized logins and defend against brute-force account intrusion.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: SMS OTP & Phone Number Usage */}
            <section id="sms-policy" className="space-y-4 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">03</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  SMS Phone Verification Policy
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                We use your phone number strictly for operational service purposes:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600 pl-4 list-disc">
                <li>Transmitting 6-digit one-time passcodes (OTP) to prove device ownership.</li>
                <li>Direct rider-to-customer phone calls and notifications regarding purchase substitutions or arrival at your delivery address.</li>
                <li>Security alerts regarding suspicious sign-ins or password reset requests.</li>
              </ul>
              <div className="border-l-2 border-red-500 pl-4 py-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-950 font-bold">Strict Non-Disclosure Invariant:</strong> We will never sell, rent, lease, or share your phone number with external marketing aggregators or third-party advertising brokers. Your phone number is utilized solely to provide and secure Sugo Express services.
              </div>
            </section>

            {/* Section 4: Data Sharing */}
            <section id="data-sharing" className="space-y-4 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">04</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Service Providers & Data Sharing
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                We share relevant subsets of your information only with trusted infrastructure providers required to operate the platform:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600 pl-4 list-disc">
                <li><strong className="text-slate-800">Google Firebase & Identity Platform:</strong> For cryptographic phone number verification, push notifications, and database telemetry.</li>
                <li><strong className="text-slate-800">Assigned Delivery Riders:</strong> Riders assigned to your specific errand receive your delivery address and contact number solely for the duration of that delivery.</li>
                <li><strong className="text-slate-800">Legal & Regulatory Authorities:</strong> Only when strictly mandated by Philippine law, court subpoena, or lawful government process.</li>
              </ul>
            </section>

            {/* Section 5: Data Security & Retention */}
            <section id="security-retention" className="space-y-4 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">05</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Security & Retention
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                All data in transit is encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS). Passwords are never stored in plaintext and are protected using industry-standard bcrypt hashing. Delivery receipts and records are retained for auditing and reconciliation before scheduled pruning.
              </p>
            </section>

            {/* Section 6: User Rights */}
            <section id="user-rights" className="space-y-4 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">06</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Your Rights Under the Data Privacy Act
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Under Republic Act No. 10173, you have the right to be informed, the right to access your personal data, the right to dispute inaccuracies, and the right to request the deletion or anonymization of your account data upon written notice.
              </p>
            </section>

            {/* Section 7: Contact Information */}
            <section id="contact-dpo" className="space-y-4 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">07</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Contacting the Data Protection Officer
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                If you have questions, feedback, or requests regarding your personal data or this Privacy Policy, please contact our administrative team:
              </p>
              <div className="pt-2 text-xs sm:text-sm space-y-1.5 text-slate-600 border-l-2 border-slate-200 pl-4">
                <p className="font-bold text-slate-900">Sugo Express Logistics</p>
                <p>Tacurong City, Sultan Kudarat, Philippines 9800</p>
                <p>
                  Support Email: <a href="mailto:aljayveversola@gmail.com" className="text-red-600 hover:underline">aljayveversola@gmail.com</a>
                </p>
                <p>
                  Portal: <a href="https://portal.sugo-express.org" className="text-red-600 hover:underline">https://portal.sugo-express.org</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer — Pure White with Hairline Border */}
      <footer className="border-t border-slate-100 py-8 px-6 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 Sugo Express. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-900 text-slate-600 font-medium transition-colors">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-slate-900 text-slate-600 font-medium transition-colors">
              Terms of Service
            </Link>
            <span>&bull;</span>
            <Link to="/" className="hover:text-slate-900 text-slate-600 font-medium transition-colors">
              Portal Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
