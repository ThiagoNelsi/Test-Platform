import tailwindcssAnimate from "tailwindcss-animate";
import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			verdigris: {
  				'100': '#14282a',
  				'200': '#275053',
  				'300': '#3b787d',
  				'400': '#4ea1a6',
  				'500': '#75b9be',
  				'600': '#90c7cb',
  				'700': '#acd5d8',
  				'800': '#c8e3e5',
  				'900': '#e3f1f2',
  				DEFAULT: '#75b9be'
  			},
  			light_blue: {
  				'100': '#1c2f2d',
  				'200': '#375e5b',
  				'300': '#538d88',
  				'400': '#79b1ac',
  				'500': '#a8ccc9',
  				'600': '#bad6d4',
  				'700': '#cbe0df',
  				'800': '#dcebe9',
  				'900': '#eef5f4',
  				DEFAULT: '#a8ccc9'
  			},
  			ash_gray: {
  				'100': '#1b3328',
  				'200': '#376651',
  				'300': '#529979',
  				'400': '#80baa0',
  				'500': '#b3d6c6',
  				'600': '#c2ded1',
  				'700': '#d1e6dd',
  				'800': '#e1efe8',
  				'900': '#f0f7f4',
  				DEFAULT: '#b3d6c6'
  			},
  			tea_green: {
  				'100': '#354112',
  				'200': '#6a8224',
  				'300': '#9fc335',
  				'400': '#bfd872',
  				'500': '#dceab2',
  				'600': '#e3eec2',
  				'700': '#eaf2d1',
  				'800': '#f1f7e1',
  				'900': '#f8fbf0',
  				DEFAULT: '#dceab2'
  			},
  			straw: {
  				'100': '#2d320e',
  				'200': '#59641c',
  				'300': '#86962a',
  				'400': '#b2c73a',
  				'500': '#c7d66d',
  				'600': '#d1de89',
  				'700': '#dde6a7',
  				'800': '#e8eec4',
  				'900': '#f4f7e2',
  				DEFAULT: '#c7d66d'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
		fontFamily: {
			sans: [
				'Inter',
				'ui-sans-serif',
				'system-ui',
				'sans-serif'
			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
