import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#FFF3E8',
          100: '#FFE0C2',
          200: '#FFBE87',
          300: '#FF9B4D',
          400: '#FF7D1F',
          500: '#E87722',
          600: '#C45E0D',
          700: '#9E490A',
          800: '#7A3708',
          900: '#562505',
        },
      },
    },
  },
  plugins: [],
}
export default config
