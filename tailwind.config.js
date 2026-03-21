/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{vue,ts,html}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#2a2a2a',
          raised: '#333333',
          overlay: '#3d3d3d',
        },
        border: {
          DEFAULT: '#4a4a4a',
          subtle: '#3a3a3a',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#a0a0a0',
          muted: '#6b6b6b',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
