import { cn } from "@/lib/utils";

type IconProps = { className?: string; muted?: boolean };

export const FlameIcon = ({ className, muted }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn("h-6 w-6", className)} aria-hidden>
    <path
      d="M12 2c.6 3.2 4.5 5.4 5.8 8.6 1.6 4-1 9.4-5.8 9.4s-7.4-3.9-6.2-8c.5-1.8 1.6-3 2.6-3.8-.1 1.5.4 2.9 1.5 3.6C9.4 8.5 10.8 4.6 12 2Z"
      fill={muted ? "#E5E5E5" : "#FF9600"}
    />
    <path
      d="M12 12.5c1.6 1.4 3 2.7 3 4.6A3 3 0 0 1 12 20a3 3 0 0 1-3-2.9c0-1.8 1.4-3.2 3-4.6Z"
      fill={muted ? "#AFAFAF" : "#FFC800"}
    />
  </svg>
);

export const GemIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn("h-6 w-6", className)} aria-hidden>
    <path d="M6 3h12l4 6-10 12L2 9l4-6Z" fill="#1CB0F6" />
    <path d="M2 9h20L12 21 2 9Z" fill="#1899D6" />
    <path d="M8.5 9 12 3l3.5 6L12 21 8.5 9Z" fill="#84D8FF" opacity=".7" />
  </svg>
);

export const CrownIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn("h-6 w-6", className)} aria-hidden>
    <path
      d="M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19 19H5L3 7.5Z"
      fill="currentColor"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);
