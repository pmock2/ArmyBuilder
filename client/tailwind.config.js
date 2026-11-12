/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Standardized Semantic Theme System (backed by CSS variables in index.css)
        theme: {
          bg: 'rgb(var(--theme-bg) / <alpha-value>)',
          surface: 'rgb(var(--theme-surface) / <alpha-value>)',
          card: 'rgb(var(--theme-card) / <alpha-value>)',
          elevated: 'rgb(var(--theme-elevated) / <alpha-value>)',
          border: 'rgb(var(--theme-border) / <alpha-value>)',
          'border-subtle': 'rgb(var(--theme-border-subtle) / <alpha-value>)',
          text: 'rgb(var(--theme-text) / <alpha-value>)',
          'text-secondary': 'rgb(var(--theme-text-secondary) / <alpha-value>)',
          'text-muted': 'rgb(var(--theme-text-muted) / <alpha-value>)',
          accent: 'rgb(var(--theme-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--theme-accent-hover) / <alpha-value>)',
          'accent-soft': 'rgb(var(--theme-accent-soft) / <alpha-value>)',
          success: 'rgb(var(--theme-success) / <alpha-value>)',
          warning: 'rgb(var(--theme-warning) / <alpha-value>)',
          danger: 'rgb(var(--theme-danger) / <alpha-value>)'
        },
        // Map legacy palette aliases so all components follow the standardized theme
        slate: {
          950: 'rgb(var(--theme-bg) / <alpha-value>)',
          900: 'rgb(var(--theme-surface) / <alpha-value>)',
          850: 'rgb(var(--theme-card) / <alpha-value>)',
          800: 'rgb(var(--theme-elevated) / <alpha-value>)',
          750: 'rgb(var(--theme-border-subtle) / <alpha-value>)',
          700: 'rgb(var(--theme-border) / <alpha-value>)',
          650: 'rgb(var(--theme-border) / <alpha-value>)',
          600: 'rgb(var(--theme-text-muted) / <alpha-value>)',
          500: 'rgb(var(--theme-text-muted) / <alpha-value>)',
          400: 'rgb(var(--theme-text-secondary) / <alpha-value>)',
          300: 'rgb(var(--theme-text-secondary) / <alpha-value>)',
          200: 'rgb(var(--theme-text) / <alpha-value>)',
          100: 'rgb(var(--theme-text) / <alpha-value>)'
        },
        grimdark: {
          950: 'rgb(var(--theme-bg) / <alpha-value>)',
          900: 'rgb(var(--theme-surface) / <alpha-value>)',
          850: 'rgb(var(--theme-card) / <alpha-value>)',
          800: 'rgb(var(--theme-elevated) / <alpha-value>)',
          700: 'rgb(var(--theme-border) / <alpha-value>)',
          600: 'rgb(var(--theme-text-muted) / <alpha-value>)',
          500: 'rgb(var(--theme-text-muted) / <alpha-value>)',
          400: 'rgb(var(--theme-text-secondary) / <alpha-value>)',
          300: 'rgb(var(--theme-text-secondary) / <alpha-value>)',
          200: 'rgb(var(--theme-text) / <alpha-value>)',
          100: 'rgb(var(--theme-text) / <alpha-value>)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
