import React from "react";
import { ArrowUpRight } from "lucide-react";
import type { CopilotActionLink, CopilotMessage } from "../../../services/ownerCopilotApiService";

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  })}</>;
}

function MessageContent({ content }: { content: string }) {
  return <div className="kuya-message__text">{content.split("\n").map((line, index) => {
    if (!line.trim()) return <div key={index} className="kuya-message__break" />;
    if (/^#{1,3} /.test(line)) return <h4 key={index}><InlineText text={line.replace(/^#{1,3} /, "")} /></h4>;
    if (/^\s*[*-] /.test(line)) return <div key={index} className="kuya-message__bullet"><span aria-hidden="true">•</span><p><InlineText text={line.trim().slice(2)} /></p></div>;
    return <p key={index}><InlineText text={line} /></p>;
  })}</div>;
}

export function OwnerCopilotMessage({ message, onAction }: { message: CopilotMessage; onAction: (link: CopilotActionLink) => void }) {
  const isUser = message.role === "user";
  return (
    <article className="kuya-message" data-user={isUser}>
      <span className="kuya-message__name">{isUser ? "You" : "Kuya Sugo"}</span>
      <div className="kuya-message__bubble">
        <MessageContent content={message.content} />
        {!isUser && !!message.actionLinks?.length && <div className="kuya-message__links">
          {message.actionLinks.map((link, index) => <button key={index} type="button" onClick={() => onAction(link)}>{link.label}<ArrowUpRight size={14} /></button>)}
        </div>}
        <time className="kuya-message__time">{message.timestamp}</time>
      </div>
    </article>
  );
}
