import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        sand: "#f7f4ef",
        moss: "#3b5b4f",
        clay: "#e0d3c2"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(17, 17, 17, 0.08)",
        inset: "inset 0 0 0 1px rgba(17, 17, 17, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
