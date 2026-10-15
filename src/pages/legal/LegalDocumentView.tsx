import React from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  LEGAL_CONTACT,
  LEGAL_EFFECTIVE_DATE,
  type LegalBlock,
  type LegalDocument,
} from "../../constants/legalDocuments";

/**
 * The shared layout of /terms and /privacy.
 *
 * The words live in constants/legalDocuments.ts, which the Customer App renders
 * too; this file only decides how they look on the web. Editorial two-column
 * reading layout: a sticky contents list beside numbered sections.
 */

interface LegalDocumentViewProps {
  document: LegalDocument;
  /** Label and value pairs shown under the title, after the effective date. */
  meta: Array<{ label: string; value: string }>;
}

function Lead({ lead }: { lead?: string }) {
  if (!lead) return null;
  return <strong className="font-semibold text-slate-900">{lead} </strong>;
}

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === "list") {
    return (
      <ul className="space-y-2.5 text-sm sm:text-base text-slate-600 leading-relaxed pl-5 list-disc marker:text-slate-300">
        {block.items.map((item, i) => (
          <li key={i}>
            <Lead lead={item.lead} />
            {item.text}
          </li>
        ))}
      </ul>
    );
  }
  if (block.kind === "note") {
    return (
      <p className="border-l-2 border-red-500 pl-4 py-1 text-sm sm:text-base text-slate-700 leading-relaxed">
        <Lead lead={block.lead} />
        {block.text}
      </p>
    );
  }
  return (
    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
      <Lead lead={block.lead} />
      {block.text}
    </p>
  );
}

function ContactCard() {
  return (
    <div className="text-sm space-y-1.5 text-slate-600 border-l-2 border-slate-200 pl-4">
      <p className="font-semibold text-slate-900">{LEGAL_CONTACT.organization}</p>
      <p>{LEGAL_CONTACT.location}</p>
      <p>
        Email:{" "}
        <a href={`mailto:${LEGAL_CONTACT.email}`} className="text-red-600 hover:underline">
          {LEGAL_CONTACT.email}
        </a>
      </p>
      <p>
        Portal:{" "}
        <a href={LEGAL_CONTACT.portal} className="text-red-600 hover:underline">
          {LEGAL_CONTACT.portal.replace("https://", "")}
        </a>
      </p>
    </div>
  );
}

export const LegalDocumentView: React.FC<LegalDocumentViewProps> = ({ document: doc, meta }) => {
  const otherDoc =
    doc.id === "terms"
      ? { to: "/privacy", label: "Privacy Policy" }
      : { to: "/terms", label: "Terms of Service" };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-red-50 selection:text-red-900">
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

      <main className="max-w-6xl mx-auto px-6 py-10 sm:py-16 flex-1 w-full">
        <div className="border-b border-slate-100 pb-10 mb-12 space-y-4 max-w-3xl">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight">
            {doc.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
            <span>
              Effective: <strong className="text-slate-800 tabular-nums">{LEGAL_EFFECTIVE_DATE}</strong>
            </span>
            {meta.map((m) => (
              <React.Fragment key={m.label}>
                <span aria-hidden="true">&bull;</span>
                <span>
                  {m.label}: <strong className="text-slate-800">{m.value}</strong>
                </span>
              </React.Fragment>
            ))}
          </div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed pt-2">{doc.summary}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16 items-start">
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 self-start space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contents</h3>
            <nav className="space-y-1 text-xs">
              {doc.sections.map((sec, i) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="block py-1.5 px-2.5 rounded text-slate-600 hover:text-red-600 hover:bg-slate-50 transition-colors"
                >
                  {i + 1}. {sec.title}
                </a>
              ))}
            </nav>
            <div className="pt-6 border-t border-slate-100 text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-800">Questions?</p>
              <p className="leading-relaxed">
                Email us at{" "}
                <a href={`mailto:${LEGAL_CONTACT.email}`} className="text-red-600 hover:underline">
                  {LEGAL_CONTACT.email}
                </a>
                .
              </p>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-12 max-w-2xl xl:max-w-3xl">
            {doc.sections.map((sec, i) => (
              <section
                key={sec.id}
                id={sec.id}
                className={`space-y-4 scroll-mt-24 ${i > 0 ? "pt-8 border-t border-slate-100" : ""}`}
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="text-xs font-bold text-red-600 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">{sec.title}</h3>
                </div>
                {sec.blocks.map((block, j) => (
                  <Block key={j} block={block} />
                ))}
                {i === doc.sections.length - 1 && <ContactCard />}
              </section>
            ))}
            <p className="text-sm text-slate-500 pt-4">
              Read this together with our{" "}
              <Link to={otherDoc.to} className="text-red-600 hover:underline">
                {otherDoc.label}
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 px-6 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 Sugo Express. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-900 text-slate-600 font-medium transition-colors">
              Privacy Policy
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link to="/terms" className="hover:text-slate-900 text-slate-600 font-medium transition-colors">
              Terms of Service
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link to="/" className="hover:text-slate-900 text-slate-600 font-medium transition-colors">
              Portal Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalDocumentView;
