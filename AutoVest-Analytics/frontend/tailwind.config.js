export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0a0a0c",
          surface: "#16161a",
          accent: "#3b82f6",
          success: "#10b981",
          danger: "#ef4444",
          warning: "#f59e0b",
        },
        glass: {
          border: "rgba(255, 255, 255, 0.08)",
          bg: "rgba(255, 255, 255, 0.03)",
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    }
  },
  plugins: []
}