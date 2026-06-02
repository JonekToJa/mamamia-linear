import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0e1116",
        panel: "#161b22",
        panel2: "#1f242c",
        border: "#262d36",
        muted: "#8b95a5",
        text: "#e6edf3",
        accent: "#3b82f6",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
};

export default config;
