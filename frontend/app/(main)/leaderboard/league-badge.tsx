import { cn } from "@/lib/utils";

// One colour per tier: Bronze, Silver, Gold, Sapphire, Ruby, Emerald, Amethyst, Pearl, Obsidian, Diamond.
const COLORS = ["#CD7F32", "#B4BCC4", "#FFC800", "#1CB0F6", "#FF4B4B", "#58CC02", "#CE82FF", "#F2A7C3", "#4B4B4B", "#84D8FF"];

/** Shield-shaped league badge. */
export const LeagueBadge = ({ tier, size = 40, locked = false }: { tier: number; size?: number; locked?: boolean }) => (
  <svg
    viewBox="0 0 40 44"
    width={size}
    height={size * 1.1}
    className={cn("shrink-0 transition", locked && "opacity-40 grayscale")}
    aria-hidden
  >
    <path d="M20 2 37 8v14c0 10-7.5 17-17 20C10.5 39 3 32 3 22V8l17-6Z" fill={COLORS[tier]} />
    <path d="M20 2 37 8v14c0 10-7.5 17-17 20V2Z" fill="black" opacity=".12" />
    <path d="M20 12l2.6 5.4 5.9.8-4.3 4.1 1 5.8L20 25.3 14.8 28l1-5.8-4.3-4.1 5.9-.8L20 12Z" fill="white" opacity=".9" />
  </svg>
);
