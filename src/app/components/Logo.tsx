/**
 * PharmaVerif - Logo Component (Bouclier + Checkmark)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Design: Bouclier bleu avec checkmark — symbolise protection & verification
 * Style: Flat design, bouclier geometrique, sans ombres
 *
 * Variantes :
 *  - icon : bouclier seul
 *  - horizontal : bouclier + texte "PharmaVerif" sur une ligne
 *  - full : bouclier + texte + tagline "Verification intelligente"
 */

interface LogoProps {
  variant?: 'full' | 'horizontal' | 'icon';
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Palette de couleurs
const colors = {
  light: {
    shield: '#1E40AF',       // blue-800
    shieldBg: '#1E40AF',     // blue-800 (opacity via SVG)
    check: '#1E40AF',        // blue-800
    textPrimary: '#0F172A',  // slate-900
    textAccent: '#1E40AF',   // blue-800
    tagline: '#94A3B8',      // slate-400
  },
  dark: {
    shield: '#60A5FA',       // blue-400
    shieldBg: '#60A5FA',     // blue-400 (opacity via SVG)
    check: '#60A5FA',        // blue-400
    textPrimary: '#F1F5F9',  // slate-100
    textAccent: '#60A5FA',   // blue-400
    tagline: '#64748B',      // slate-500
  },
};

/**
 * Bouclier SVG reutilisable — le coeur du logo PharmaVerif.
 * Dessine un bouclier avec fond semi-transparent + contour + checkmark.
 */
function ShieldIcon({
  x = 0,
  y = 0,
  scale = 1,
  c,
}: {
  x?: number;
  y?: number;
  scale?: number;
  c: (typeof colors)['light'];
}) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Bouclier background */}
      <path
        d="M25 2 L46 12 L46 27 Q46 44 25 55 Q4 44 4 27 L4 12 Z"
        fill={c.shieldBg}
        opacity="0.1"
      />
      {/* Bouclier contour */}
      <path
        d="M25 2 L46 12 L46 27 Q46 44 25 55 Q4 44 4 27 L4 12 Z"
        stroke={c.shield}
        strokeWidth="2.5"
        fill="none"
      />
      {/* Checkmark */}
      <path
        d="M14 27 L22 35 L37 18"
        stroke={c.check}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
}

export function Logo({
  variant = 'horizontal',
  theme = 'light',
  size = 'md',
  className = '',
}: LogoProps) {
  const getSizeValue = () => {
    switch (size) {
      case 'sm':
        return { height: 24, scale: 0.6 };
      case 'md':
        return { height: 32, scale: 0.8 };
      case 'lg':
        return { height: 40, scale: 1 };
      case 'xl':
        return { height: 48, scale: 1.2 };
      default:
        return { height: 32, scale: 0.8 };
    }
  };

  const { height } = getSizeValue();
  const c = colors[theme];

  // ============ ICON VARIANT ============
  if (variant === 'icon') {
    return (
      <svg
        width={height}
        height={height}
        viewBox="0 0 50 57"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <ShieldIcon c={c} />
      </svg>
    );
  }

  // ============ HORIZONTAL VARIANT ============
  if (variant === 'horizontal') {
    const width = height * 5;

    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 200 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Bouclier (reduit pour s'adapter a 40px de haut) */}
        <ShieldIcon x={1} y={0} scale={0.68} c={c} />

        {/* Texte */}
        <text
          x="40"
          y="26"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
          fontSize="20"
          fontWeight="700"
          fill={c.textPrimary}
        >
          Pharma
          <tspan fill={c.textAccent}>Verif</tspan>
        </text>
      </svg>
    );
  }

  // ============ FULL VARIANT ============
  const fullWidth = height * 4;

  return (
    <svg
      width={fullWidth}
      height={height}
      viewBox="0 0 240 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bouclier */}
      <ShieldIcon x={2} y={1} scale={1} c={c} />

      {/* Texte PharmaVerif */}
      <text
        x="58"
        y="34"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
        fontSize="26"
        fontWeight="700"
        letterSpacing="-0.5"
        fill={c.textPrimary}
      >
        Pharma
        <tspan fill={c.textAccent}>Verif</tspan>
      </text>

      {/* Tagline */}
      <text
        x="59"
        y="50"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
        fontSize="11"
        fontWeight="400"
        fill={c.tagline}
      >
        Verification intelligente
      </text>
    </svg>
  );
}
