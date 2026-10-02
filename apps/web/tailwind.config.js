/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#1D689B',
        },
        accent: {
          red: '#D12B2C',
        },
        paper: {
          DEFAULT: '#F7F8FA',
          subtle: '#FAFAF8',
        },
      },
    },
  },
  plugins: [],
}



