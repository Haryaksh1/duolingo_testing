"use client";

import { usePathname } from "next/navigation";

/** Renders children everywhere except on `path` (e.g. no duplicate quests card on the Quests page). */
export const HideOn = ({ path, children }: { path: string; children: React.ReactNode }) =>
  usePathname() === path ? null : children;
