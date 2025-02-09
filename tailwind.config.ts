import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'verdigris': { DEFAULT: '#75b9be', 100: '#14282a', 200: '#275053', 300: '#3b787d', 400: '#4ea1a6', 500: '#75b9be', 600: '#90c7cb', 700: '#acd5d8', 800: '#c8e3e5', 900: '#e3f1f2' },
        'light_blue': { DEFAULT: '#a8ccc9', 100: '#1c2f2d', 200: '#375e5b', 300: '#538d88', 400: '#79b1ac', 500: '#a8ccc9', 600: '#bad6d4', 700: '#cbe0df', 800: '#dcebe9', 900: '#eef5f4' },
        'ash_gray': { DEFAULT: '#b3d6c6', 100: '#1b3328', 200: '#376651', 300: '#529979', 400: '#80baa0', 500: '#b3d6c6', 600: '#c2ded1', 700: '#d1e6dd', 800: '#e1efe8', 900: '#f0f7f4' },
        'tea_green': { DEFAULT: '#dceab2', 100: '#354112', 200: '#6a8224', 300: '#9fc335', 400: '#bfd872', 500: '#dceab2', 600: '#e3eec2', 700: '#eaf2d1', 800: '#f1f7e1', 900: '#f8fbf0' },
        'straw': { DEFAULT: '#c7d66d', 100: '#2d320e', 200: '#59641c', 300: '#86962a', 400: '#b2c73a', 500: '#c7d66d', 600: '#d1de89', 700: '#dde6a7', 800: '#e8eec4', 900: '#f4f7e2' }
      },
      fontFamily: {
        sans: ['var(--font-montserrat)'],
      },
    },
  },
  plugins: [],
} satisfies Config;
