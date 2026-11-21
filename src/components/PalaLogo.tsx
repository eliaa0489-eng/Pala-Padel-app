import React from 'react';

interface PalaLogoProps {
  height?: number;
  className?: string;
}

/**
 * Bespoke geometric lowercase "pala" SVG wordmark
 */
export const PalaLogo: React.FC<PalaLogoProps> = ({
  height = 22,
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 118 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="pala"
      style={{ height: `${height}px`, width: 'auto' }}
      className={`block shrink-0 ${className}`}
    >
      <circle cx="24" cy="30" r="8.5" stroke="currentColor" strokeWidth="7" />
      <line
        x1="15.5"
        y1="18"
        x2="15.5"
        y2="54"
        stroke="currentColor"
        strokeWidth="7"
      />
      <circle cx="53" cy="30" r="8.5" stroke="currentColor" strokeWidth="7" />
      <line
        x1="61.5"
        y1="18"
        x2="61.5"
        y2="42"
        stroke="currentColor"
        strokeWidth="7"
      />
      <line
        x1="74"
        y1="6"
        x2="74"
        y2="42"
        stroke="currentColor"
        strokeWidth="7"
      />
      <circle cx="94" cy="30" r="8.5" stroke="currentColor" strokeWidth="7" />
      <line
        x1="102.5"
        y1="18"
        x2="102.5"
        y2="42"
        stroke="currentColor"
        strokeWidth="7"
      />
    </svg>
  );
};
