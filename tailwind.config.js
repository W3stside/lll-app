/** @type {import('tailwindcss').Config} */
import tailwindContainerQueries from "@tailwindcss/container-queries";
import tailwindcssForms from "@tailwindcss/forms";
import tailwindcssAnimate from "tailwindcss-animate";

module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{html,ts,tsx}",
  ],
  theme: {
    colors: {
      white: "ghostwhite"
    },
    screens: {
      xs: "368px",
      sm: "432px",
      md: "496px",
      lg: "608px",
      xl: "720px",
      "2xl": "810px",
      "3xl": "1004px",
      "4xl": "1208px",
      "5xl": "1368px",
      "6xl": "1472px",
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [tailwindContainerQueries, tailwindcssForms, tailwindcssAnimate],
};
