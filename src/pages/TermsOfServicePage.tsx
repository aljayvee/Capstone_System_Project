import React from "react";
import { Link } from "react-router";
import { ArrowLeft, Scale, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export const TermsOfServicePage: React.FC = () => {
  const sections = [
    { id: "acceptance", label: "1. Acceptance of Terms" },
    { id: "platform-nature", label: "2. Platform Description" },
    { id: "account-verification", label: "3. Account & Phone Verification" },
    { id: "errands-pricing", label: "4. Pricing & Settlement" },
    { id: "prohibited-items", label: "5. Prohibited Cargo" },
    { id: "liability", label: "6. Limitation of Liability" },
    { id: "governing-law", label: "7. Governing Law & Dispute" },
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
            <Scale className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Legal Agreement</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight">
            Terms of Service
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono pt-1">
            <span>Effective Date: <strong className="text-slate-800 tabular-nums">October 5, 2026</strong></span>
            <span>&bull;</span>
            <span>Jurisdiction: <strong className="text-slate-800">Tacurong City, Philippines</strong></span>
            <span>&bull;</span>
            <span>Binding Agreement: <strong className="text-slate-800">Customers, Riders & Dispatchers</strong></span>
          </div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed pt-2">
            Please read these terms carefully before accessing or using the Sugo Express logistics and on-demand delivery platform. By using our platform, you agree to comply with the rules outlined below.
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
              <p className="font-semibold text-slate-800">Questions?</p>
              <p className="leading-relaxed">Contact legal operations at <a href="mailto:aljayveeversola@gmail.com" className="text-red-600 hover:underline">aljayveeversola@gmail.com</a>.</p>
            </div>
          </aside>

          {/* Editorial Reading Stream (Zero Cards, Flowing Typography) */}
          <div className="lg:col-span-9 space-y-14 max-w-2xl xl:max-w-3xl">
            {/* Section 1: Acceptance */}
            <section id="acceptance" className="space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">01</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Acceptance of Terms
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                By registering an account, submitting an errand, or accessing any service provided by Sugo Express, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use our services.
              </p>
            </section>

            {/* Section 2: Platform Description */}
            <section id="platform-nature" className="space-y-3 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">02</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Nature of the Platform
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Sugo Express is a digital dispatch and logistics coordination platform serving Tacurong City and neighboring areas. We connect customers with independent freelance delivery riders to fulfill pabili errands, store shopping, parcel pickup, and document transport.
              </p>
            </section>

            {/* Section 3: Account Security & Phone Number Verification */}
            <section id="account-verification" className="space-y-6 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">03</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Account Registration & Phone Verification
                </h3>
              </div>

              {/* Clean Definition Flow (No Boxed Cards) */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Accurate Information & Ownership Verification</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                    You agree to provide true, current, and complete registration details, including your personal Philippine mobile phone number. All phone numbers are subjected to one-time password (OTP) verification. You may not register phone numbers that you do not legally own or hold authorization to access.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Account Confidentiality</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                    You are responsible for safeguarding your login credentials. You agree to notify Sugo Express immediately if you suspect unauthorized access or breach of your account.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4: Ordering, Pricing & Payments */}
            <section id="errands-pricing" className="space-y-4 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">04</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Errands, Pricing & Settlement
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                When ordering a pabili errand through Sugo Express:
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 pl-4 list-disc">
                <li><strong className="text-slate-800">Item Pricing:</strong> Estimated item prices shown in catalogs or user-entered lists are approximate. The final amount due is based on the actual merchant cash register receipt obtained by the rider.</li>
                <li><strong className="text-slate-800">Delivery Fees:</strong> Delivery fees are computed based on distance, number of store stops, and operational route conditions.</li>
                <li><strong className="text-slate-800">Payment Modes:</strong> Customers must settle errand payments upon delivery via Cash on Delivery (COD) or verified electronic transfer (such as GCash or Maya) supported by legible payment receipts.</li>
              </ul>
            </section>

            {/* Section 5: Prohibited Items */}
            <section id="prohibited-items" className="space-y-4 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">05</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Prohibited Items & Illegal Activities
                </h3>
              </div>
              <div className="border-l-2 border-red-500 pl-4 py-2 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <div className="flex items-center gap-2 text-red-600 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Strictly Banned Cargo</span>
                </div>
                <p className="text-slate-600">
                  You must not use Sugo Express to purchase, transport, or deliver illegal narcotics, firearms, ammunition, hazardous chemicals, stolen goods, or any items prohibited by the laws of the Republic of the Philippines. Any violation will result in immediate account termination and referral to law enforcement agencies.
                </p>
              </div>
            </section>

            {/* Section 6: Limitation of Liability */}
            <section id="liability" className="space-y-3 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">06</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Limitation of Liability
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Sugo Express strives for prompt, reliable delivery, but shall not be held liable for delays caused by adverse weather conditions, traffic incidents, store stock unavailability, or unforeseen force majeure events beyond our reasonable operational control.
              </p>
            </section>

            {/* Section 7: Governing Law */}
            <section id="governing-law" className="space-y-4 scroll-mt-24 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600">07</span>
                <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Governing Law & Dispute Resolution
                </h3>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising under these terms shall be resolved amicably through good-faith negotiation or brought before the competent courts of Tacurong City, Sultan Kudarat.
              </p>
              <div className="pt-2 text-xs sm:text-sm space-y-1.5 text-slate-600 border-l-2 border-slate-200 pl-4">
                <p className="font-bold text-slate-900">Questions Regarding Terms</p>
                <p>Location: Tacurong City, Sultan Kudarat, Philippines 9800</p>
                <p>
                  Support Email: <a href="mailto:aljayveeversola@gmail.com" className="text-red-600 hover:underline">aljayveeversola@gmail.com</a>
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

export default TermsOfServicePage;
