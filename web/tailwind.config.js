/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { 50: "#ecfdf5", 100: "#d1fae5", 500: "#10b981", 600: "#059669", 700: "#047857", 900: "#064e3b" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      keyframes: { shake: { "0%,100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-8px)" }, "75%": { transform: "translateX(8px)" } } },
    },
  },
  plugins: [],
};
