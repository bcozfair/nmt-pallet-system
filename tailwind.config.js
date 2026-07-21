/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
    ],
    // NOTE: this project runs Tailwind v4, which configures its theme from CSS
    // (see the @theme block in index.css) and ignores this file unless a
    // `@config` directive points at it. A fontFamily block used to sit here and
    // had no effect at all. Keep theme values in index.css.
    theme: {
        extend: {},
    },
    plugins: [],
}
