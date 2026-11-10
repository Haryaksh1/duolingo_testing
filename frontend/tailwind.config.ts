import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import tailwindAnimate from "tailwindcss-animate";

// Theme-aware shades: values live in CSS variables (globals.css) so `.dark` can flip them.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const shades = (prefix: string, keys: number[]) =>
  Object.fromEntries(keys.map((k) => [k, v(`${prefix}-${k}`)]));
const NEUTRAL = shades("n", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]);

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Duolingo-like palette mapped onto the shades the components already use.
        green: { ...colors.green, 100: v("green-100"), 400: "#79D634", 500: "#58CC02", 600: "#58A700", 700: "#3F8A00" },
        sky: { ...colors.sky, 100: v("sky-100"), 300: "#84D8FF", 400: "#1CB0F6", 500: "#1899D6" },
        rose: { ...colors.rose, 100: v("rose-100"), 300: "#FFB2B2", 500: "#FF4B4B", 600: "#EA2B2B" },
        amber: { ...colors.amber, 50: v("amber-50"), 400: "#FFC800", 500: "#E5A500", 600: "#CD9700" },
        orange: { ...colors.orange, 400: "#FF9600", 500: "#FF9600", 600: "#E08600" },
        purple: { ...colors.purple, 400: "#CE82FF", 500: "#A568CC", 600: "#8F56B5" },
        neutral: NEUTRAL,
        slate: NEUTRAL,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        flicker: {
          "0%,100%": { transform: "scale(1) rotate(0deg)", transformOrigin: "50% 90%" },
          "50%": { transform: "scale(1.08) rotate(-3deg)", transformOrigin: "50% 90%" },
        },
        pop: { "0%": { transform: "scale(0.9)" }, "60%": { transform: "scale(1.05)" }, "100%": { transform: "scale(1)" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-6px)" }, "75%": { transform: "translateX(6px)" } },
        "slide-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        pop: "pop 0.25s ease-out",
        flicker: "flicker 1.6s ease-in-out infinite",
        shake: "shake 0.4s ease-in-out",
        "slide-up": "slide-up 0.2s ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;

export default config;
