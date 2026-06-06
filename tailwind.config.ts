import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Courier New'", "Courier", "monospace"],
      },
      fontSize: {
        /* 14px root — rem-based scale across the app */
        xs: ["0.9rem", { lineHeight: "1.45" }],
        sm: ["0.95rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.55" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.25rem", { lineHeight: "1.45" }],
        "2xl": ["1.5rem", { lineHeight: "1.4" }],
        "3xl": ["1.875rem", { lineHeight: "1.3" }],
        "4xl": ["2.25rem", { lineHeight: "1.2" }],
        "5xl": ["2.75rem", { lineHeight: "1.15" }],
      },
      colors: {
        bg: "var(--bg)",
        "bg-card": "var(--bg-card)",
        strawberry: "var(--strawberry)",
        "strawberry-light": "var(--strawberry-light)",
        "strawberry-dark": "var(--strawberry-dark)",
        /* backward-compat aliases */
        ube: "var(--strawberry)",
        "ube-light": "var(--strawberry-light)",
        "ube-dark": "var(--strawberry-dark)",
        matcha: "var(--matcha)",
        "matcha-light": "var(--matcha-light)",
        "matcha-bright": "var(--matcha-bright)",
        amber: "var(--strawberry-light)",
        danger: "var(--strawberry)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-dim": "var(--text-dim)",
      },
      boxShadow: {
        retro: "3px 3px 0 var(--strawberry-dark)",
        "retro-inset": "inset 2px 2px 0 var(--strawberry-dark)",
      },
      animation: {
        blink: "blink 1.4s step-end infinite",
        marquee: "marquee 30s linear infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
