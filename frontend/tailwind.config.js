/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050A15',
        navy: '#0A1628',
        card: '#0D1B2A',
        card2: '#0F1F33',
        bdr: '#1B2E4A',
        cyan: '#00D4FF',
        purple: '#7C3AED',
        emerald: '#10B981',
        amber: '#F59E0B',
        sky: '#0EA5E9',
        pink: '#F472B6',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        glow: { from: { boxShadow: '0 0 10px #00D4FF22' }, to: { boxShadow: '0 0 40px #00D4FF44' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(0, 212, 255, 0.1)',
        'glow-md': '0 0 30px rgba(0, 212, 255, 0.15)',
        'glow-lg': '0 0 60px rgba(0, 212, 255, 0.2)',
        'glow-purple': '0 0 30px rgba(124, 58, 237, 0.15)',
      },
    },
  },
  plugins: [],
}
