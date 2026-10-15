/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy Flutter UI Theme Colors (LIFESPROUT Care Brand)
        lifesprout: {
          blue: '#1565C0',      // Primary Blue (Deep Blue)
          'blue-dark': '#0D47A1',
          'blue-light': '#1976D2',
          orange: '#FF6F00',    // Accent Orange (Vibrant)
          'orange-dark': '#E65100',
          'orange-light': '#FF8F00',
          green: '#2E7D32',     // Success Green
          red: '#C62828',       // Error Red
          'text-dark': '#212121',
          'text-muted': '#757575',
          'bg-light': '#F5F5F5',
        },
        // Modern Tailwind-style palette (keeping for compatibility)
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1565C0',      // Match old UI primary
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
        accent: {
          50: '#fff3e0',
          100: '#ffe0b2',
          200: '#ffcc80',
          300: '#ffb74d',
          400: '#ffa726',
          500: '#ff9800',
          600: '#FF6F00',      // Match old UI accent orange
          700: '#f57c00',
          800: '#ef6c00',
          900: '#e65100',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#2E7D32',      // Match old UI success
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#C62828',      // Match old UI error
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      }
    },
  },
  plugins: [],
}