/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: '#faf8f5',
        surface: '#ffffff',
        surface2: '#f4f1ec',
        border: '#e8e2d9',
        ink: '#1a1714',
        muted: '#8a8078',
        accent: {
          DEFAULT: '#c8956c',
          light: '#f5ede4',
          hover: '#b5834f',
        },
        food: { DEFAULT: '#6b9e6b', light: '#edf5ed' },
        symptom: { DEFAULT: '#c07b5a', light: '#faeee8' },
        medication: { DEFAULT: '#9b76b5', light: '#f2ecf8' },
        activity: { DEFAULT: '#b5a046', light: '#f7f3e3' },
      },
      boxShadow: {
        card: '0 2px 12px rgba(26,23,20,0.07)',
        lg: '0 8px 32px rgba(26,23,20,0.12)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
