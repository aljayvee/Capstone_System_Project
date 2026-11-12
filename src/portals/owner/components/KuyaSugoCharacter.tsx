import React from "react";

export type KuyaSugoAction = "wave" | "listen" | "think" | "ready";

function Parcel({ className }: { className: string }) {
  return <g className={className}>
    <path d="m53 180 24-11 30 13-24 12z" fill="#F5D6A7" />
    <path d="m53 180 30 14v27l-30-15z" fill="#DDB17B" />
    <path d="m83 194 24-12v27l-24 12z" fill="#C58E53" />
    <path d="m65 174 30 14-9 5-29-15z" fill="#FFF4DF" />
    <path d="m71 189 9 4v11l-9-4z" fill="#FFF4DF" />
  </g>;
}

interface KuyaSugoCharacterProps {
  action?: KuyaSugoAction;
  paused?: boolean;
  className?: string;
}

/** Layered vector faces give the courier depth without image assets or a 3D runtime. */
export function KuyaSugoCharacter({ action = "wave", paused = false, className = "" }: KuyaSugoCharacterProps) {
  return (
    <svg viewBox="0 0 240 260" fill="none" aria-hidden="true" focusable="false"
      className={`kuya-character ${className}`} data-action={action} data-paused={paused}>
      <ellipse cx="123" cy="240" rx="65" ry="9" fill="#E7E5E4" />
      <g className="kuya-character__body">
        {/* Shoes and trousers, with a visible side face. */}
        <g className="kuya-character__leg kuya-character__leg--left">
        <path d="M91 196h26v29H91z" fill="#57534E" />
        <path d="m117 196 9-5v30l-9 4z" fill="#44403C" />
        <path d="M90 218h27v17H78v-6c0-6 5-11 12-11Z" fill="#292524" />
        <path d="M78 233h39v5H78z" fill="#D6D3D1" />
        </g>
        <g className="kuya-character__leg kuya-character__leg--right">
        <path d="M132 194h24v31h-24z" fill="#57534E" />
        <path d="m156 194 8-5v31l-8 5z" fill="#44403C" />
        <path d="M134 218h23c7 0 13 6 13 13v4h-38v-15Z" fill="#292524" />
        <path d="M132 233h38v5h-38z" fill="#D6D3D1" />
        </g>
        <g className="kuya-character__torso">
        {/* Delivery vest. */}
        <path d="m85 136 56-7 23 13v58l-21 10-58-9z" fill="#B91C1C" />
        <path d="m85 136 58 9v65l-58-9z" fill="#EF4444" />
        <path d="m143 145 21-3v58l-21 10z" fill="#DC2626" />
        <path d="m100 134 14 3 8 17 10-14 11 5-10 22-11-8-10 6z" fill="#FFF" />
        <path d="M122 159v43" stroke="#B91C1C" strokeWidth="3" />
        <path d="m91 177 22 4v13l-22-4z" fill="#FCA5A5" />
        <path d="m132 181 9 2v12l-9-2z" fill="#FFF" />
        {/* Left arm carries a parcel; the other arm changes its gesture. */}
        <g className="kuya-character__carry-arm">
        <path d="m83 142-12 4-9 34 17 7 14-36z" fill="#E7E5E4" />
        <path d="m62 176 16 5 4 17-14 4-10-13z" fill="#D6D3D1" />
        <Parcel className="kuya-character__parcel" />
        </g>
        <g className="kuya-character__arm">
          <path d="m158 146 15-2 11 17 13-20 13 10-18 31c-3 5-10 5-14 0l-21-23z" fill="#D6D3D1" />
          <path d="m162 146 11-2 11 17-7 14-19-21z" fill="#F5F5F4" />
          <g className="kuya-character__hand">
            <path d="m196 151-6-13c-2-4 2-7 5-4l4 5-3-20c-1-5 5-6 6-1l4 16 1-23c0-5 6-5 6 0l1 23 4-18c1-5 7-3 6 2l-4 22c-1 8-7 17-14 17z" fill="#E7E5E4" />
            <path d="m206 155 7-17 7-2c0 10-7 21-14 21z" fill="#A8A29E" />
          </g>
        </g>
        <g className="kuya-character__clipboard">
          <path d="m160 158 34-5 5 44-34 5z" fill="#78716C" />
          <path d="m164 161 26-4 4 36-26 4z" fill="#FFF" />
          <path d="m172 155 9-1 1 6-9 1z" fill="#D6D3D1" />
          <path d="m171 171 13-2m-12 9 13-2m-12 9 8-1" stroke="#B91C1C" strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* Rounded face, cap and headset are drawn on separate planes. */}
        <g className="kuya-character__head">
          <path d="M111 119h24v24l-12 9-12-13z" fill="#A8A29E" />
          <path d="M77 72c0-24 20-41 49-41s47 17 47 41v33c0 26-18 38-47 38s-49-15-49-38z" fill="#D6D3D1" />
          <path d="M77 77c0-20 17-33 40-33s40 13 40 33v28c0 22-14 34-40 34s-40-14-40-34z" fill="#FAFAF9" />
          <path d="M72 73c0-31 18-47 50-47 31 0 52 16 52 47l-18 6-80-2z" fill="#DC2626" />
          <path d="M81 51c8-13 23-18 40-18 23 0 38 10 42 25-28-9-54-10-82-7Z" fill="#EF4444" />
          <path d="m75 68 76 3 24 10c-14 11-61 10-101-1-8-2-7-10 1-12z" fill="#B91C1C" />
          <path d="m75 68 76 3 17 7c-23 5-57 1-93-5-5-1-5-4 0-5z" fill="#EF4444" />
          <path d="M128 42h-12c-7 0-7 8 0 8h4c7 0 7 8 0 8h-12" stroke="#FFF" strokeWidth="4" strokeLinecap="round" />
          <g className="kuya-character__eyes" fill="#44403C">
            <rect x="94" y="94" width="7" height="13" rx="3.5" />
            <rect x="132" y="96" width="7" height="13" rx="3.5" />
          </g>
          <path d="M109 116c5 6 12 7 18 1" stroke="#78716C" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="92" cy="113" rx="6" ry="3" fill="#FECACA" />
          <ellipse cx="143" cy="115" rx="5" ry="3" fill="#FECACA" />
          <rect x="163" y="85" width="14" height="25" rx="7" fill="#78716C" />
          <rect x="162" y="89" width="9" height="17" rx="4.5" fill="#A8A29E" />
          <path d="M170 106v8c0 7-8 10-17 10" stroke="#78716C" strokeWidth="4" strokeLinecap="round" />
          <rect x="145" y="120" width="12" height="7" rx="3.5" fill="#44403C" />
        </g>
        <g className="kuya-character__thought" fill="#DC2626">
          <circle cx="193" cy="80" r="3" /><circle cx="205" cy="68" r="4" />
          <circle cx="219" cy="53" r="5" />
        </g>
        <path className="kuya-character__check" d="m190 83 8 8 15-20" stroke="#15803D" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <g className="kuya-character__loose-parcel-motion"><Parcel className="kuya-character__loose-parcel" /></g>
      <g className="kuya-character__impact" stroke="#A8A29E" strokeWidth="3" strokeLinecap="round">
        <path d="m29 229-8-5m9 17-10 1m84-11 8-5m-9 17 10 2" />
      </g>
    </svg>
  );
}
