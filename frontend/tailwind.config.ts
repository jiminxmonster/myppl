import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#125b50",
          light: "#1d7a6d",
          muted: "#e7f3f1"
        },
        ink: "#14213d",
        sand: "#f6f1e9",
        accent: "#f77f00"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(20, 33, 61, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
