/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // darkMode: 'class' no es necesario — usamos data-theme
  theme: {
    extend: {
      // ─── Paleta Synapsix — usa CSS variables para soportar light/dark ───────
      colors: {
        synapsix: {
          // Rojo corporativo
          red:          'rgb(var(--color-primary, 192 57 43))',
          'red-dark':   '#96281B',
          'red-light':  '#E74C3C',
          'red-glow':   'rgba(192, 57, 43, 0.15)',

          // Fondos — adaptativos
          dark:         'rgb(var(--color-dark, 10 10 12))',
          'dark-2':     '#0D0D0F',
          surface:      'rgb(var(--color-surface, 18 18 22))',
          'surface-2':  'rgb(var(--color-surface-2, 24 24 30))',
          'surface-3':  'rgb(var(--color-surface-3, 32 32 40))',

          // Bordes
          border:       'rgba(var(--color-border, 255 255 255 / 0.07))',
          'border-2':   'rgba(var(--color-border-2, 255 255 255 / 0.15))',

          // Texto
          text:         'rgb(var(--color-text, 240 240 245))',
          'text-2':     'rgb(var(--color-text-2, 190 190 205))',
          muted:        'rgb(var(--color-muted, 120 120 140))',
          'muted-2':    'rgb(var(--color-muted-2, 80 80 100))',

          // Colores de acento para módulos
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
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-scale': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(192, 57, 43, 0.2)' },
          '50%':  { boxShadow: '0 0 40px rgba(192, 57, 43, 0.4)' },
        },
        'spotlight-open': {
          '0%':   { opacity: '0', transform: 'scale(0.96) translateY(-8px)' },
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

      backdropBlur: { xs: '2px' },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'synapsix':    '0 0 0 1px rgba(192, 57, 43, 0.3), 0 4px 24px rgba(192, 57, 43, 0.15)',
        'card':        '0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)',
        'card-hover':  '0 4px 16px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.4)',
        'spotlight':   '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
}
