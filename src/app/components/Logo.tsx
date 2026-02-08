import React from 'react';

interface LogoProps {
  variant?: 'full' | 'horizontal' | 'icon';
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
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

  const { height, scale } = getSizeValue();

  // Icon only variant
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
        <defs>
          <linearGradient
            id={`shieldGradient-${size}`}
            x1="25"
            y1="5"
            x2="25"
            y2="45"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={theme === 'dark' ? '#60A5FA' : '#3B82F6'} />
            <stop offset="100%" stopColor={theme === 'dark' ? '#3B82F6' : '#2563EB'} />
          </linearGradient>
        </defs>

        {/* Shield shape */}
        <path
          d="M25 5C25 5 17.5 7.5 10 7.5C10 7.5 10 18.75 10 25C10 35 17.5 42.5 25 45C32.5 42.5 40 35 40 25C40 18.75 40 7.5 40 7.5C32.5 7.5 25 5 25 5Z"
          fill={`url(#shieldGradient-${size})`}
          stroke={theme === 'dark' ? '#60A5FA' : '#1E40AF'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Pharmaceutical cross */}
        <g opacity="0.95">
          <rect
            x="23"
            y="15"
            width="4"
            height="14"
            rx="1"
            fill={theme === 'dark' ? '#1F2937' : 'white'}
          />
          <rect
            x="18"
            y="20"
            width="14"
            height="4"
            rx="1"
            fill={theme === 'dark' ? '#1F2937' : 'white'}
          />
        </g>

        {/* Checkmark */}
        <path
          d="M29 26L27 28.5L22 23.5"
          stroke={theme === 'dark' ? '#34D399' : '#10B981'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Horizontal variant
  if (variant === 'horizontal') {
    const width = height * 4.5; // Ratio 180/40 = 4.5

    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 180 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient
            id={`shieldGrad-${size}`}
            x1="20"
            y1="5"
            x2="20"
            y2="35"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={theme === 'dark' ? '#60A5FA' : '#3B82F6'} />
            <stop offset="100%" stopColor={theme === 'dark' ? '#3B82F6' : '#2563EB'} />
          </linearGradient>
        </defs>

        {/* Icon */}
        <g id="icon-compact">
          {/* Shield */}
          <path
            d="M20 5C20 5 14.5 7 9 7C9 7 9 15 9 20C9 27 14.5 32.5 20 35C25.5 32.5 31 27 31 20C31 15 31 7 31 7C25.5 7 20 5 20 5Z"
            fill={`url(#shieldGrad-${size})`}
            stroke={theme === 'dark' ? '#60A5FA' : '#1E40AF'}
            strokeWidth="1.2"
          />

          {/* Cross */}
          <rect
            x="18.5"
            y="12"
            width="3"
            height="11"
            rx="0.8"
            fill={theme === 'dark' ? '#1F2937' : 'white'}
          />
          <rect
            x="14"
            y="16.5"
            width="11"
            height="3"
            rx="0.8"
            fill={theme === 'dark' ? '#1F2937' : 'white'}
          />

          {/* Checkmark */}
          <path
            d="M23 20L21.5 22L17.5 18"
            stroke={theme === 'dark' ? '#34D399' : '#10B981'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Text */}
        <text
          x="40"
          y="26"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
          fontSize="20"
          fontWeight="700"
          fill={theme === 'dark' ? '#F9FAFB' : '#1F2937'}
        >
          Pharma
          <tspan fill={theme === 'dark' ? '#60A5FA' : '#2563EB'}>Verif</tspan>
        </text>
      </svg>
    );
  }

  // Full variant
  const width = height * 4; // Ratio 240/60 = 4

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id={`shieldGradientFull-${size}`}
          x1="30"
          y1="10"
          x2="30"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={theme === 'dark' ? '#60A5FA' : '#3B82F6'} />
          <stop offset="100%" stopColor={theme === 'dark' ? '#3B82F6' : '#2563EB'} />
        </linearGradient>
      </defs>

      {/* Logo Icon */}
      <g id="icon">
        {/* Shield */}
        <path
          d="M30 10C30 10 21 13 12 13C12 13 12 26 12 33C12 45 21 53 30 56C39 53 48 45 48 33C48 26 48 13 48 13C39 13 30 10 30 10Z"
          fill={`url(#shieldGradientFull-${size})`}
          stroke={theme === 'dark' ? '#60A5FA' : '#1E40AF'}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Cross */}
        <g opacity="0.95">
          <rect
            x="27.5"
            y="20"
            width="5"
            height="18"
            rx="1.5"
            fill={theme === 'dark' ? '#1F2937' : 'white'}
          />
          <rect
            x="21"
            y="26.5"
            width="18"
            height="5"
            rx="1.5"
            fill={theme === 'dark' ? '#1F2937' : 'white'}
          />
        </g>

        {/* Checkmark */}
        <path
          d="M35 32L32.5 35L26.5 29"
          stroke={theme === 'dark' ? '#34D399' : '#10B981'}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Text */}
      <g id="text">
        {/* "Pharma" */}
        <text
          x="65"
          y="30"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
          fontSize="24"
          fontWeight="700"
          fill={theme === 'dark' ? '#F9FAFB' : '#1F2937'}
          letterSpacing="-0.5"
        >
          Pharma
        </text>

        {/* "Verif" */}
        <text
          x="65"
          y="48"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
          fontSize="24"
          fontWeight="700"
          fill={theme === 'dark' ? '#60A5FA' : '#2563EB'}
          letterSpacing="-0.5"
        >
          Verif
        </text>

        {/* Tagline */}
        <text
          x="168"
          y="38"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
          fontSize="10"
          fontWeight="500"
          fill="#6B7280"
        >
          Vérification intelligente
        </text>
      </g>
    </svg>
  );
}
