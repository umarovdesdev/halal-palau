import React, { useId } from 'react';
import type { Lang } from '../types/menu';

/**
 * Flag icons for the language switcher (inline SVG — emoji flags do not render on Windows).
 * Kazakhstan is simplified for small sizes: sun with rays, steppe eagle wings, ornament stripe.
 */

interface FlagProps {
  className?: string;
}

const KZ_RAYS = Array.from({ length: 32 }, (_, i) => (i * 360) / 32);

export const FlagKZ: React.FC<FlagProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 600 300" aria-hidden="true" focusable="false">
    <rect width="600" height="300" fill="#00AFCA" />
    <g fill="#FEC50C">
      {KZ_RAYS.map((deg) => (
        <polygon key={deg} points="300,52 309,72 291,72" transform={`rotate(${deg} 300 130)`} />
      ))}
      <circle cx="300" cy="130" r="46" />
      <path d="M180 214 Q300 166 420 214 Q360 204 300 222 Q240 204 180 214 Z" />
      {[30, 90, 150, 210, 270].map((y) => (
        <path key={y} d={`M40 ${y - 22} L58 ${y} L40 ${y + 22} L22 ${y} Z`} />
      ))}
    </g>
  </svg>
);

export const FlagRU: React.FC<FlagProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 9 6" aria-hidden="true" focusable="false">
    <rect width="9" height="2" fill="#FFFFFF" />
    <rect y="2" width="9" height="2" fill="#0039A6" />
    <rect y="4" width="9" height="2" fill="#D52B1E" />
  </svg>
);

export const FlagTR: React.FC<FlagProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 1200 800" aria-hidden="true" focusable="false">
    <rect width="1200" height="800" fill="#E30A17" />
    <circle cx="425" cy="400" r="200" fill="#FFFFFF" />
    <circle cx="475" cy="400" r="160" fill="#E30A17" />
    <path
      fill="#FFFFFF"
      d="M583.334 400 764.235 458.779 652.431 304.894V495.106L764.235 341.221Z"
    />
  </svg>
);

export const FlagGB: React.FC<FlagProps> = ({ className }) => {
  const clipId = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 60 30" aria-hidden="true" focusable="false">
      <clipPath id={`gb-${clipId}`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#FFFFFF" strokeWidth="6" />
      <path
        d="M0 0l60 30m0-30L0 30"
        clipPath={`url(#gb-${clipId})`}
        stroke="#C8102E"
        strokeWidth="4"
      />
      <path d="M30 0v30M0 15h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
};

const FLAGS: Record<Lang, React.FC<FlagProps>> = {
  kk: FlagKZ,
  ru: FlagRU,
  tr: FlagTR,
  en: FlagGB,
};

export const LangFlag: React.FC<{ lang: Lang; className?: string }> = ({ lang, className }) => {
  const Flag = FLAGS[lang];
  return <Flag className={className} />;
};
