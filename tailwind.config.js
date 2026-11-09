/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        gaming: {
          dark: '#07060e',
          card: 'rgba(18, 15, 32, 0.78)',
          input: 'rgba(26, 22, 46, 0.85)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-active': 'rgba(168, 85, 247, 0.45)',
          neon: '#a855f7',
          violet: '#7c3aed',
          fuchsia: '#d946ef',
        }
      },
      boxShadow: {
        'neon-purple': '0 0 25px rgba(168, 85, 247, 0.45)',
        'neon-btn': '0 4px 22px rgba(168, 85, 247, 0.5), 0 0 12px rgba(147, 51, 234, 0.35)',
        'neon-glow': '0 0 40px rgba(168, 85, 247, 0.25)',
        'glass-card': '0 20px 50px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'input-focus': '0 0 0 2px rgba(168, 85, 247, 0.3), 0 0 15px rgba(168, 85, 247, 0.25)',
      },
      backgroundImage: {
        'purple-gradient': 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        'btn-gradient': 'linear-gradient(90deg, #9333ea 0%, #a855f7 100%)',
        'glass-gradient': 'linear-gradient(180deg, rgba(25, 20, 45, 0.7) 0%, rgba(13, 11, 24, 0.8) 100%)',
      }
    },
  },
  plugins: [],
}

