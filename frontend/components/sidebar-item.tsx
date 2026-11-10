"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

import { NavIcon } from "./sidebar";

type SidebarItemProps = { label: string; icon: string; href: string };

export const SidebarItem = ({ label, icon, href }: SidebarItemProps) => {
  const isActive = usePathname() === href;

  return (
    <Button
      variant={isActive ? "sidebarOutline" : "sidebar"}
      className="h-[52px] justify-start gap-x-5 text-[15px]"
      asChild
    >
      <Link href={href}>
        <NavIcon icon={icon} />
        {label}
      </Link>
    </Button>
  );
};

export const BottomNavItem = ({ label, icon, href }: SidebarItemProps) => {
  const isActive = usePathname() === href;

  return (
    <Link
      href={href}
      aria-label={label}
      className={
        isActive
          ? "rounded-xl border-2 border-sky-300 bg-sky-100 p-1.5"
          : "rounded-xl border-2 border-transparent p-1.5"
      }
    >
      <NavIcon icon={icon} size={28} />
    </Link>
  );
};
