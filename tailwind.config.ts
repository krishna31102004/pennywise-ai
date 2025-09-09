import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Inter', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'Apple Color Emoji', 'Segoe UI Emoji']
      },
      colors: {
        bg: '#0B0F14',
        panel: '#10151C',
        border: '#1E2633',
        text: '#EDF1F7',
        subtext: '#99A3B3',
        muted: '#99A3B3',
        primary: '#42D392',
        primaryDark: '#2EB07A',
        primary600: '#2EB07A',
        danger: '#EF4444',
        warn: '#F59E0B',
        info: '#60A5FA'
      },
      boxShadow: {
        card: '0 1px 1px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.18)',
        glow: '0 0 0 2px rgba(66, 211, 146, .15)'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        pill: '999px'
      }
    }
  },
  plugins: []
};
export default config;
