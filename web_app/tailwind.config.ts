import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    screens: {
      xs: "400px",
      sm: "576px",
      md: "768px",
      lg: "992px",
      xl: "1200px",
      "2xl": "1440px",
      "3xl": "1920px",
      "4xl": "2560px",
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        xs: "1rem",
        sm: "1.5rem",
        md: "2rem",
        lg: "3rem",
        xl: "4rem",
        "2xl": "5rem",
        "3xl": "6rem",
        "4xl": "7rem",
      },
    },
    extend: {
      colors: {
        brand: {
          light: "#0BA5E8",
          DEFAULT: "#0679C7",
          dark: "#055A99",
        },
        inputBorder: "#CDE8F7",
        labelText: "#2C4A63",
        mutedText: "#486581",
        success: {
          light: "#86efac",
          DEFAULT: "#22c55e",
          dark: "#15803d",
        },
        error: {
          light: "#fecaca",
          DEFAULT: "#ef4444",
          dark: "#b91c1c",
        },
        warning: {
          light: "#fed7aa",
          DEFAULT: "#f59e0b",
          dark: "#b45309",
        },
        info: {
          light: "#bae6fd",
          DEFAULT: "#0ea5e9",
          dark: "#0369a1",
        },
      },
      backgroundImage: {
        "login-card": "linear-gradient(135deg, rgba(219,241,253,0.55), rgba(186,230,253,0.35))",
        "login-button": "linear-gradient(90deg, #0BA5E8 0%, #0679C7 100%)",
        "login-button-hover": "linear-gradient(90deg, #0c9ad9 0%, #056bb2 100%)",
        "brand-gradient": "linear-gradient(135deg, #0BA5E8 0%, #0679C7 50%, #055A99 100%)",
        "overlay-gradient": "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)",
      },
      boxShadow: {
        card: "0 10px 35px rgba(0,0,0,0.05)",
        soft: "0 6px 20px rgba(0,0,0,0.04)",
        medium: "0 8px 30px rgba(0,0,0,0.08)",
        strong: "0 12px 40px rgba(0,0,0,0.12)",
        brand: "0 8px 20px rgba(6, 121, 199, 0.3)",
        "brand-hover": "0 12px 28px rgba(6, 121, 199, 0.4)",
        "inner-soft": "inset 0 2px 4px 0 rgba(0,0,0,0.02)",
      },
      borderRadius: {
        card: "30px",
        xl2: "20px",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      fontFamily: {
        sans: ["Poppins", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", "sans-serif"],
        mono: ["Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
      fontSize: {
        title: ["40px", { lineHeight: "1.2", fontWeight: "600" }],
        label: ["14px", { lineHeight: "1.4" }],
        xxs: ["10px", { lineHeight: "1.2" }],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
        42: "10.5rem",
        50: "12.5rem",
        58: "14.5rem",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-in",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeOut: { "0%": { opacity: "1" }, "100%": { opacity: "0" } },
        slideIn: { "0%": { transform: "translateX(-10px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(10px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        scaleIn: { "0%": { transform: "scale(0.95)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      zIndex: {
        modal: 1000,
        overlay: 900,
        dropdown: 800,
        header: 700,
      },
      gridTemplateColumns: {
        14: "repeat(14, minmax(0, 1fr))",
        16: "repeat(16, minmax(0, 1fr))",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
} satisfies Config;
