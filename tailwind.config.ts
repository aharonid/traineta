import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		extend: {
			fontFamily: {
				heading: ['var(--font-heading)', 'Cormorant Garamond', 'Georgia', 'serif'],
				body: ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
			},
		},
	},
	plugins: [],
};

export default config;
