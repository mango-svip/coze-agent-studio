/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: "#3b82f6",
                "background-light": "#f9fafb",
                "background-dark": "#0f172a",
                "card-light": "#ffffff",
                "card-dark": "#1e293b",
            },
            fontFamily: {
                display: ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.75rem",
            },
        },
    },
    plugins: [],
}
