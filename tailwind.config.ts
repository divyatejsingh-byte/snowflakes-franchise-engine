import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // SnowFlakes palette: icy teal-blue
        brand: { 50: "#eef8fb", 100: "#d8eef5", 500: "#3f98b3", 600: "#2f8aa6", 700: "#24708a", 900: "#16465a" },
        ice: { 50: "#f5fbfd", 100: "#e8f5fa", 200: "#d3ebf4" },
        sprinkle: { pink: "#f7a8c4", mint: "#8fd9c4", caramel: "#e3a85f", berry: "#c85b9c", lemon: "#f7e08a" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0) rotate(0deg)" }, "50%": { transform: "translateY(-10px) rotate(4deg)" } },
      },
      animation: { floaty: "floaty 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
