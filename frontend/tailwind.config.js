/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ─── Paleta Synapsix ───────────────────────────────────────────────────
      colors: {
        synapsix: {
          // Rojo corporativo (del logo)
          red:          '#C0392B',
          'red-dark':   '#96281B',
          'red-light':  '#E74C3C',
          'red-glow':   'rgba(192, 57, 43, 0.15)',

          // Fondos oscuros
          dark:         '#0A0A0C',
          'dark-2':     '#0D0D0F',
          surface:      '#14141A',
          'surface-2':  '#1A1A22',
          'surface-3':  '#1F1F2A',

          // Bordes y separadores
          border:       '#252530',
          'border-2':   '#2E2E3E',

          // Texto
          text:         '#F0F0F5',
          'text-2':     '#C8C8D8',
          muted:        '#8A8A9E',
          'muted-2':    '#5E5E78',

          // Colores de módulos
          blue:         '#2980B9',
          green:        '#27AE60',
          purple:       '#8E44AD',
          orange:       '#D35400',
          teal:         '#16A085',
        }
      },

      // ─── Tipografía ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      // ─── Animaciones ───────────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(192, 57, 43, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(192, 57, 43, 0.4)' },
        },
        'spotlight-open': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in':        'fade-in 0.3s ease-out',
        'fade-in-scale':  'fade-in-scale 0.25s ease-out',
        'slide-in-up':    'slide-in-up 0.4s ease-out',
        'shake':          'shake 0.4s ease-in-out',
        'glow-pulse':     'glow-pulse 2s ease-in-out infinite',
        'spotlight-open': 'spotlight-open 0.2s ease-out',
      },

      // ─── Blur / Glassmorphism ──────────────────────────────────────────────
      backdropBlur: {
        xs: '2px',
      },

      // ─── Bordes redondeados ────────────────────────────────────────────────
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      // ─── Sombras ──────────────────────────────────────────────────────────
      boxShadow: {
        'synapsix':      '0 0 0 1px rgba(192, 57, 43, 0.3), 0 4px 24px rgba(192, 57, 43, 0.15)',
        'card':          '0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)',
        'card-hover':    '0 4px 16px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.4)',
        'spotlight':     '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
}
