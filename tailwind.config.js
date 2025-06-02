/** @type {import('tailwindcss').Config} */
/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This creates a "font-poppins" utility class
        poppins: ["Poppins", "sans-serif"],
        // If instead you used next/font/google with a CSS variable, you would do:
        // poppins: ["var(--font-poppins)", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
