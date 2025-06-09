/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./renderer/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./once-ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./renderer/src/once-ui/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Colors that work with Once UI tokens
      colors: {
        // Inherit CSS custom properties from Once UI
        brand: {
          'solid': 'var(--brand-solid)',
          'solid-strong': 'var(--brand-solid-strong)',
          'solid-weak': 'var(--brand-solid-weak)',
          'on-solid': 'var(--brand-on-solid)',
          'background': 'var(--brand-background)',
          'background-weak': 'var(--brand-background-weak)',
          'background-strong': 'var(--brand-background-strong)',
          'on-background': 'var(--brand-on-background)',
          'on-background-weak': 'var(--brand-on-background-weak)',
          'border': 'var(--brand-border)',
          'border-weak': 'var(--brand-border-weak)',
        },
        accent: {
          'solid': 'var(--accent-solid)',
          'solid-strong': 'var(--accent-solid-strong)',
          'solid-weak': 'var(--accent-solid-weak)',
          'on-solid': 'var(--accent-on-solid)',
          'background': 'var(--accent-background)',
          'background-weak': 'var(--accent-background-weak)',
          'background-strong': 'var(--accent-background-strong)',
          'on-background': 'var(--accent-on-background)',
          'on-background-weak': 'var(--accent-on-background-weak)',
          'border': 'var(--accent-border)',
          'border-weak': 'var(--accent-border-weak)',
        },
        neutral: {
          'solid': 'var(--neutral-solid)',
          'solid-strong': 'var(--neutral-solid-strong)',
          'solid-weak': 'var(--neutral-solid-weak)',
          'on-solid': 'var(--neutral-on-solid)',
          'background': 'var(--neutral-background)',
          'background-weak': 'var(--neutral-background-weak)',
          'background-medium': 'var(--neutral-background-medium)',
          'background-strong': 'var(--neutral-background-strong)',
          'on-background': 'var(--neutral-on-background)',
          'on-background-weak': 'var(--neutral-on-background-weak)',
          'on-background-medium': 'var(--neutral-on-background-medium)',
          'on-background-strong': 'var(--neutral-on-background-strong)',
          'border': 'var(--neutral-border)',
          'border-weak': 'var(--neutral-border-weak)',
          'border-medium': 'var(--neutral-border-medium)',
          'border-strong': 'var(--neutral-border-strong)',
        },
        success: {
          'solid': 'var(--success-solid)',
          'on-solid': 'var(--success-on-solid)',
          'background': 'var(--success-background)',
          'on-background': 'var(--success-on-background)',
          'border': 'var(--success-border)',
        },
        warning: {
          'solid': 'var(--warning-solid)',
          'on-solid': 'var(--warning-on-solid)',
          'background': 'var(--warning-background)',
          'on-background': 'var(--warning-on-background)',
          'border': 'var(--warning-border)',
        },
        danger: {
          'solid': 'var(--danger-solid)',
          'on-solid': 'var(--danger-on-solid)',
          'background': 'var(--danger-background)',
          'on-background': 'var(--danger-on-background)',
          'border': 'var(--danger-border)',
        },
      },
      
      // Typography that matches Once UI
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      
      // Spacing that matches Once UI tokens
      spacing: {
        'xs': 'var(--static-space-4)',
        's': 'var(--static-space-8)',
        'm': 'var(--static-space-16)',
        'l': 'var(--static-space-24)',
        'xl': 'var(--static-space-32)',
        '2xl': 'var(--static-space-40)',
        '3xl': 'var(--static-space-48)',
      },
      
      // Border radius matching Once UI
      borderRadius: {
        'xs': 'var(--radius-xs)',
        's': 'var(--radius-s)',
        'm': 'var(--radius-m)',
        'l': 'var(--radius-l)',
        'xl': 'var(--radius-xl)',
        'full': 'var(--radius-full)',
      },
      
      // Custom animations for enhanced UI
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'button-press': 'buttonPress 0.1s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      
      // Backdrop blur utilities
      backdropBlur: {
        'glass': '12px',
        'glass-heavy': '20px',
      },
      
      // Custom shadows
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.5)',
        'glass-press': '0 4px 16px 0 rgba(31, 38, 135, 0.3)',
        'brand': '0 4px 20px 0 var(--brand-solid-weak)',
        'accent': '0 4px 20px 0 var(--accent-solid-weak)',
      },
    },
  },
  plugins: [
    // Add custom utilities
    function({ addUtilities }) {
      const newUtilities = {
        '.text-gradient-brand': {
          'background': 'linear-gradient(135deg, var(--brand-solid), var(--accent-solid))',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.bg-gradient-brand': {
          'background': 'linear-gradient(135deg, var(--brand-solid), var(--accent-solid))',
        },
        '.glass-surface': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-surface-dark': {
          'background': 'rgba(0, 0, 0, 0.1)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}
