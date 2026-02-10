/**
 * PharmaVerif - Logo Component (Moderne & Minimaliste)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Design: Cercle bleu + croix pharma blanche + badge checkmark vert
 * Style: Flat design, formes géométriques pures, sans ombres
 */

import React from 'react';

interface LogoProps {
  variant?: 'full' | 'horizontal' | 'icon';
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Palette de couleurs
const colors = {
  light: {
    circle: '#0EA5E9',       // sky-500
    cross: '#FFFFFF',        // blanc
    badge: '#10B981',        // emerald-500
    check: '#FFFFFF',        // blanc
    textPrimary: '#0F172A',  // slate-900
    textAccent: '#0EA5E9',   // sky-500
    tagline: '#94A3B8',      // slate-400
  },
  dark: {
    circle: '#38BDF8',       // sky-400
    cross: '#0F172A',        // slate-900
    badge: '#34D399',        // emerald-400
    check: '#FFFFFF',        // blanc
    textPrimary: '#F1F5F9',  // slate-100
    textAccent: '#38BDF8',   // sky-400
    tagline: '#64748B',      // slate-500
  },
};

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
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Cercle principal */}
        <circle cx="25" cy="25" r="22" fill={c.circle} />

        {/* Croix pharma arrondie */}
        <rect x="22" y="13" width="6" height="24" rx="3" fill={c.cross} />
        <rect x="13" y="22" width="24" height="6" rx="3" fill={c.cross} />

        {/* Badge checkmark */}
        <circle cx="38" cy="38" r="9" fill={c.badge} />
        <path
          d="M33.5 38L36.5 41L42.5 35"
          stroke={c.check}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // ============ HORIZONTAL VARIANT ============
  if (variant === 'horizontal') {
    const width = height * 4.5;

    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 180 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Cercle */}
        <circle cx="20" cy="20" r="17" fill={c.circle} />
        <rect x="17.5" y="10" width="5" height="20" rx="2.5" fill={c.cross} />
        <rect x="10" y="17.5" width="20" height="5" rx="2.5" fill={c.cross} />

        {/* Badge check */}
        <circle cx="31" cy="31" r="7" fill={c.badge} />
        <path
          d="M27.5 31L29.5 33.5L34.5 28.5"
          stroke={c.check}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Texte */}
        <text
          x="44"
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
      {/* Cercle */}
      <circle cx="30" cy="28" r="22" fill={c.circle} />
      <rect x="26.5" y="15" width="7" height="26" rx="3.5" fill={c.cross} />
      <rect x="17" y="24.5" width="26" height="7" rx="3.5" fill={c.cross} />

      {/* Badge check */}
      <circle cx="44" cy="43" r="9" fill={c.badge} />
      <path
        d="M39.5 43L42.5 46L48.5 40"
        stroke={c.check}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Texte PharmaVerif */}
      <text
        x="62"
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
        x="63"
        y="50"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
        fontSize="11"
        fontWeight="400"
        fill={c.tagline}
      >
        Vérification intelligente
      </text>
    </svg>
  );
}
