/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#15803D',
          700: '#166534',
          800: '#14532D',
          900: '#0F3D22',
        },
        surface: '#FFFFFF',
        canvas: '#F7F9F7',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 22, 0.04), 0 1px 3px rgba(15, 23, 22, 0.05)',
        'card-hover': '0 8px 24px -6px rgba(15, 23, 22, 0.12), 0 2px 8px -2px rgba(15, 23, 22, 0.06)',
        glow: '0 8px 20px -6px rgba(21, 128, 61, 0.45)',
        soft: '0 1px 2px rgba(15, 23, 22, 0.04)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #16A34A 0%, #15803D 55%, #14532D 100%)',
        'brand-radial': 'radial-gradient(circle at 30% 20%, rgba(34,197,94,0.18), transparent 60%)',
      },
    },
  },
  plugins: [],
};
