import React from 'react';

/**
 * CSMSSeal Component
 * Renders the official CSMS institutional verification stamp or watermark.
 * Features:
 * - Uses the official CSMS stamp artwork (logostamp) processed into a 100% transparent mask
 * - Zero square/rectangular background boundaries (100% transparent outside circular seal)
 * - Dynamic theme color inheritance via CSS mask-image & var(--primary)
 * - Live color updating when global Theme Color changes without page reload
 * - Configurable responsive sizing and opacity for stamp & watermark variants
 */
export default function CSMSSeal({
  variant = 'stamp',
  size,
  opacity,
  className = '',
  style = {}
}) {
  const isWatermark = variant === 'watermark';

  // Responsive defaults
  const finalSize = size !== undefined ? size : (isWatermark ? 210 : 54);
  const finalOpacity = opacity !== undefined ? opacity : (isWatermark ? 0.035 : 0.95);

  return (
    <div
      className={`csms-seal-container csms-seal-${variant} ${className}`}
      style={{
        width: finalSize,
        height: finalSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: isWatermark ? 'absolute' : 'relative',
        opacity: finalOpacity,
        pointerEvents: 'none',
        userSelect: 'none',
        flexShrink: 0,
        ...style
      }}
      title="Official CSMS Institutional Verification Stamp"
    >
      <div
        className="csms-stamp-mask-element"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--primary, #3b82f6)',
          WebkitMaskImage: 'url("/logostamp_mask.png")',
          maskImage: 'url("/logostamp_mask.png")',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          transition: 'background-color 0.3s ease, filter 0.3s ease',
          filter: isWatermark ? 'none' : 'drop-shadow(0 0 6px var(--primary-glow, rgba(59, 130, 246, 0.25)))',
        }}
      />
    </div>
  );
}
