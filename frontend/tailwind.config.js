/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			// shadcn's names, pointed at the theme tokens in src/app/theme.css
  			background: 'color-mix(in srgb, var(--bg) calc(<alpha-value> * 100%), transparent)',
  			foreground: 'color-mix(in srgb, var(--text) calc(<alpha-value> * 100%), transparent)',
  			card: { DEFAULT: 'color-mix(in srgb, var(--card) calc(<alpha-value> * 100%), transparent)', foreground: 'color-mix(in srgb, var(--text) calc(<alpha-value> * 100%), transparent)' },
  			popover: { DEFAULT: 'color-mix(in srgb, var(--card) calc(<alpha-value> * 100%), transparent)', foreground: 'color-mix(in srgb, var(--text) calc(<alpha-value> * 100%), transparent)' },
  			primary: { DEFAULT: 'color-mix(in srgb, var(--primary) calc(<alpha-value> * 100%), transparent)', foreground: 'color-mix(in srgb, var(--on-primary) calc(<alpha-value> * 100%), transparent)' },
  			secondary: { DEFAULT: 'color-mix(in srgb, var(--card2) calc(<alpha-value> * 100%), transparent)', foreground: 'color-mix(in srgb, var(--text) calc(<alpha-value> * 100%), transparent)' },
  			muted: { DEFAULT: 'color-mix(in srgb, var(--card2) calc(<alpha-value> * 100%), transparent)', foreground: 'color-mix(in srgb, var(--t2) calc(<alpha-value> * 100%), transparent)' },
  			accent: { DEFAULT: 'color-mix(in srgb, var(--card2) calc(<alpha-value> * 100%), transparent)', foreground: 'color-mix(in srgb, var(--text) calc(<alpha-value> * 100%), transparent)' },
  			destructive: { DEFAULT: 'color-mix(in srgb, var(--danger) calc(<alpha-value> * 100%), transparent)', foreground: '#ffffff' },
  			border: 'color-mix(in srgb, var(--line) calc(<alpha-value> * 100%), transparent)',
  			input: 'color-mix(in srgb, var(--line) calc(<alpha-value> * 100%), transparent)',
  			ring: 'color-mix(in srgb, var(--t3) calc(<alpha-value> * 100%), transparent)'
  		},
  		fontFamily: {
  			sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			display: ['Clash Grotesk', 'Satoshi', 'ui-sans-serif', 'sans-serif'],
  			mono: ['Geist Mono', 'ui-monospace', 'Menlo', 'monospace']
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};