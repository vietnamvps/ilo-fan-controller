import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        server: {
          900: "#0b0f19",
          850: "#0f1626",
          800: "#131c31",
          700: "#1d2945",
          600: "#2a3b61",
        },
        hpe: {
          green: "#01a982",
          lightGreen: "#00d1a0",
          blue: "#2b5cbe",
          cyan: "#00c4cc",
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-medium': 'spin 1.5s linear infinite',
        'spin-fast': 'spin 0.6s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
export default config;
