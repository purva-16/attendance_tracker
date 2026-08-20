/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#E9E4D6",
        paperDark: "#DED7C4",
        ink: "#1F2A3C",
        inkSoft: "#3C4A61",
        red: "#A6362C",
        green: "#3B6146",
        line: "#C7BFA9",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
