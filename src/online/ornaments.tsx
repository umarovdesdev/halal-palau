import React, { useId } from 'react';

/**
 * 1. QoshqarMuizMotif — Symmetric Kazakh ram-horn scroll (қошқар мүйіз)
 *    with central stepped rhombus. Crisp round coordinates, viewBox 0 0 120 28.
 */
export const QoshqarMuizMotif: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 28"
    fill="none"
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    {/* Center stepped diamond */}
    <path
      d="M60 4 L70 14 L60 24 L50 14 Z"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M60 9 L65 14 L60 19 L55 14 Z"
      fill="currentColor"
      stroke="none"
    />
    {/* Left ram-horn scroll (қошқар мүйіз) */}
    <path
      d="M50 14 H36 C28 14 24 6 31 6 C36 6 37 11 33 12 M36 14 C28 14 24 22 31 22 C36 22 37 17 33 16"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M22 14 L16 10 L10 14 L16 18 Z" strokeWidth="1.4" strokeLinejoin="round" />
    <line x1="2" y1="14" x2="10" y2="14" strokeWidth="1.4" strokeLinecap="round" />

    {/* Right ram-horn scroll (mirror) */}
    <path
      d="M70 14 H84 C92 14 96 6 89 6 C84 6 83 11 87 12 M84 14 C92 14 96 22 89 22 C84 22 83 17 87 16"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M98 14 L104 10 L110 14 L104 18 Z" strokeWidth="1.4" strokeLinejoin="round" />
    <line x1="110" y1="14" x2="118" y2="14" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/**
 * 2. OrnamentBorderBand — Repeating SVG pattern band for hero bottom and footer top.
 *    Combines stepped Central-Asian rhombus and қошқар мүйіз curls.
 */
export const OrnamentBorderBand: React.FC<{ className?: string }> = ({ className }) => {
  const patternId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width="100%"
      height="16"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width="48"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          {/* Framing border lines */}
          <line
            x1="0"
            y1="1"
            x2="48"
            y2="1"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          <line
            x1="0"
            y1="15"
            x2="48"
            y2="15"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          {/* Center diamond */}
          <path
            d="M24 3 L31 8 L24 13 L17 8 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path d="M24 6 L27 8 L24 10 L21 8 Z" fill="currentColor" />
          {/* Symmetric S-scrolls flanking the diamond */}
          <path
            d="M0 8 H7 C10 8 11 4 14 4 C16 4 16 7 14 8 C16 9 16 12 14 12 C11 12 10 8 7 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
          />
          <path
            d="M48 8 H41 C38 8 37 4 34 4 C32 4 32 7 34 8 C32 9 32 12 34 12 C37 12 38 8 41 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
          />
          {/* Side half-diamonds at tile boundaries */}
          <path d="M0 5 L4 8 L0 11" fill="none" stroke="currentColor" strokeWidth="1.15" />
          <path d="M48 5 L44 8 L48 11" fill="none" stroke="currentColor" strokeWidth="1.15" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="16" fill={`url(#${patternId})`} />
    </svg>
  );
};

/**
 * 3. OrnamentCorner — Crisp symmetric corner flourish for section headers and cards
 *    on tablet and desktop layouts.
 */
export const OrnamentCorner: React.FC<{
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({ className = '', position = 'top-right' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 28 28"
    fill="none"
    stroke="currentColor"
    className={`ornament-corner is-${position} ${className}`.trim()}
    aria-hidden="true"
  >
    {/* Outer stepped corner */}
    <path
      d="M2 22 V7 L7 2 H22"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner scroll & diamond */}
    <path
      d="M6 16 V9 L9 6 H16"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.75"
    />
    <path d="M6 3 L9 6 L6 9 L3 6 Z" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * 4. GirihLattice — Faint Central-Asian rhombus & 8-pointed star lattice background
 *    used inside the hero header and optional ≥1440px margin strip.
 */
export const GirihLattice: React.FC<{ className?: string }> = ({ className }) => {
  const patternId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
        >
          {/* Outer rhombus */}
          <path
            d="M28 0 L56 28 L28 56 L0 28 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          {/* Inner 8-fold girih star */}
          <path
            d="M28 10 L34 22 L46 28 L34 34 L28 46 L22 34 L10 28 L22 22 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
          />
          {/* Center small rhombus */}
          <path
            d="M28 22 L34 28 L28 34 L22 28 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};
