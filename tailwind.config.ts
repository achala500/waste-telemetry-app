import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          canvas: '#08080A',
          subtle: '#0F0F12',
          surface: '#141416',
          elevated: '#1C1C20',
          hover: '#24242A',
          border: 'rgba(255, 255, 255, 0.07)',
          'border-strong': 'rgba(255, 255, 255, 0.14)',
          text: {
            primary: '#F4F4F6',
            secondary: '#A1A1AA',
            muted: '#71717A',
            faint: '#3F3F46',
          },
        },
        chrono: {
          lime: {
            DEFAULT: '#A3E635',
            glow: 'rgba(163, 230, 53, 0.35)',
            faint: 'rgba(163, 230, 53, 0.12)',
            dark: '#4D7C0F',
          },
          cyan: {
            DEFAULT: '#38BDF8',
            glow: 'rgba(56, 189, 248, 0.35)',
            faint: 'rgba(56, 189, 248, 0.12)',
            dark: '#0369A1',
          },
          orange: {
            DEFAULT: '#FB923C',
            glow: 'rgba(251, 146, 60, 0.35)',
            faint: 'rgba(251, 146, 60, 0.12)',
            dark: '#C2410C',
          },
          crimson: {
            DEFAULT: '#F43F5E',
            glow: 'rgba(244, 63, 94, 0.35)',
            faint: 'rgba(244, 63, 94, 0.12)',
            dark: '#9F1239',
          },
        },
      },
      fontFamily: {
        sans: [
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Fira Code',
          'Roboto Mono',
          'monospace',
        ],
      },
      boxShadow: {
        'bento': '0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        'bento-elevated': '0 12px 36px -4px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'glow-lime': '0 0 25px -4px rgba(163, 230, 53, 0.4), 0 0 10px rgba(163, 230, 53, 0.2)',
        'glow-cyan': '0 0 25px -4px rgba(56, 189, 248, 0.4), 0 0 10px rgba(56, 189, 248, 0.2)',
        'glow-orange': '0 0 25px -4px rgba(251, 146, 60, 0.4), 0 0 10px rgba(251, 146, 60, 0.2)',
        'glow-crimson': '0 0 25px -4px rgba(244, 63, 94, 0.4), 0 0 10px rgba(244, 63, 94, 0.2)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'live-beacon': 'liveBeacon 1.8s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(0.98)' },
        },
        liveBeacon: {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(163, 230, 53, 0.7)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 8px rgba(163, 230, 53, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(163, 230, 53, 0)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
