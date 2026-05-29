/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        cockpit: {
          950: "#020617",
          900: "#0b1120",
          800: "#111827",
          700: "#1f2937"
        }
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(148,163,184,.15), 0 12px 32px rgba(0,0,0,.45)"
      }
    }
  },
  plugins: []
};
