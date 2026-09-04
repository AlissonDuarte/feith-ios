const palette = require('./src/theme/palette');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { feith: palette, fidio: palette },
      fontFamily: {
        display: ['CormorantGaramond_600SemiBold'],
        sans: ['Inter_400Regular'],
      },
      borderRadius: { pill: '9999px' },
    },
  },
  plugins: [],
};
