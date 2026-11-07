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
        grimdark: {
          950: '#0b0d10',
          900: '#111419',
          850: '#161a22',
          800: '#1c212b',
          700: '#282f3d',
          600: '#3a4457',
          500: '#526079',
          400: '#7383a0',
          300: '#9cb0cf',
          200: '#c5d3ea',
          100: '#e6edf8'
        },
        warhammer: {
          gold: '#c99a3e',
          goldLight: '#e4b85d',
          goldDark: '#997328',
          red: '#961d1d',
          redLight: '#c23333',
          redDark: '#6b1111',
          blue: '#1b4a82',
          green: '#1a5933',
          teal: '#1b676b'
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

