"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Top-bar icon with a Duolingo-style popover.
 * Mouse: opens on hover only (a click can't pin it). Touch: a tap toggles it — iOS Safari never
 * focuses tapped buttons, so focus-based CSS can't be used there. Keyboard: opens on Tab focus.
 */
export const Stat = ({
  label,
  className,
  children,
  popover,
}: {
  label: string;
  className: string;
  children: React.ReactNode;
  popover: React.ReactNode;
}) => {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  // Remember which page it was opened on, so navigating away closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpenOn(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const toggle = () => {
    if (window.matchMedia("(hover: hover)").matches) return; // mouse users get hover
    setOpenOn(open ? null : pathname);
  };

  return (
    <div ref={ref} className="group relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "flex items-center gap-x-1.5 rounded-xl px-2 py-2 text-base font-extrabold transition hover:bg-neutral-100",
          open && "bg-neutral-100",
          className
        )}
      >
        {children}
      </button>
      <div
        className={cn(
          "invisible absolute right-0 top-full z-50 w-[300px] pt-2 opacity-0 transition max-lg:fixed max-lg:inset-x-2 max-lg:top-[60px] max-lg:w-auto",
          "[@media(hover:hover)]:group-hover:visible [@media(hover:hover)]:group-hover:opacity-100",
          "group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100",
          open && "visible opacity-100"
        )}
      >
        <div className="rounded-2xl border-2 bg-background p-4 shadow-lg">{popover}</div>
      </div>
    </div>
  );
};
