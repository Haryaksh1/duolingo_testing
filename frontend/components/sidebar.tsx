import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { SidebarItem } from "./sidebar-item";

export const NAV = [
  { label: "Learn", href: "/learn", icon: "/learn.svg" },
  { label: "Practice", href: "/practice", icon: "💪" },
  { label: "Leaderboards", href: "/leaderboard", icon: "/leaderboard.svg" },
  { label: "Quests", href: "/quests", icon: "/quests.svg" },
  { label: "Shop", href: "/shop", icon: "/shop.svg" },
  { label: "Profile", href: "/profile", icon: "/mascot.svg" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export const NavIcon = ({ icon, size = 32 }: { icon: string; size?: number }) =>
  icon.startsWith("/") ? (
    <Image src={icon} alt="" height={size} width={size} />
  ) : (
    <span
      className="flex items-center justify-center leading-none"
      style={{ width: size, height: size, fontSize: size * 0.8 }}
      aria-hidden
    >
      {icon}
    </span>
  );

export const Sidebar = ({ className }: { className?: string }) => (
  <nav
    className={cn(
      "left-0 top-0 flex h-full flex-col border-r-2 px-4 lg:fixed lg:w-[256px]",
      className
    )}
  >
    <Link href="/learn">
      <div className="flex items-center gap-x-3 pb-7 pl-4 pt-8">
        <Image src="/mascot.svg" alt="Dingo" height={40} width={40} />
        <span className="text-3xl font-black tracking-tight text-green-500">
          dingo
        </span>
      </div>
    </Link>

    <div className="flex flex-1 flex-col gap-y-2">
      {NAV.map((item) => (
        <SidebarItem key={item.href} {...item} />
      ))}
    </div>
  </nav>
);
