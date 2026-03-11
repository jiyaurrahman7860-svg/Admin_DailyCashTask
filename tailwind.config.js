/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border, #E5E7EB)',
        primary: '#1745FF',
        background: '#FFFFFF',
        foreground: '#000000',
        card: '#F6F8FF',
        error: '#FF3B30',
        success: '#22C55E',
      },
    },
  },
  plugins: [],
}
