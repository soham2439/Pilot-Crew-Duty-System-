/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        cockpit: {
          950: "#14532d",
          900: "#166534",
          800: "#15803d",
          700: "#16a34a"
        }
      },
      boxShadow: {
        panel: "0 0 0 2px rgba(21,128,61,.28), 0 16px 34px rgba(20,83,45,.34)"
      }
    }
  },
  plugins: []
};
