import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // All brand colors reference CSS variables — swap in globals.css to rebrand
        brand: {
          primary:  'var(--brand-primary)',
          accent:   'var(--brand-accent)',
          'accent-hover': 'var(--brand-accent-hover)',
        },
        surface: {
          bg:     'var(--surface-bg)',
          card:   'var(--surface-card)',
          border: 'var(--surface-border)',
          hover:  'var(--surface-hover)',
          input:  'var(--surface-input)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          inverse:   'var(--text-inverse)',
        },
        status: {
          green:  'var(--status-green)',
          red:    'var(--status-red)',
          amber:  'var(--status-amber)',
          blue:   'var(--status-blue)',
          purple: 'var(--status-purple)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
        dropdown: 'var(--shadow-dropdown)',
      },
    },
  },
  plugins: [],
}

export default config
