import type { Me } from "@/lib/api";

import { NAV } from "./sidebar";
import { BottomNavItem } from "./sidebar-item";
import { UserProgress } from "./user-progress";

export const MobileHeader = ({ me }: { me: Me }) => (
  <header className="fixed top-0 z-50 flex h-[60px] w-full items-center border-b-2 bg-background px-2 lg:hidden">
    <UserProgress me={me} />
  </header>
);

// Every section gets a tab, so the current page is always highlighted (including Settings).
export const BottomNav = () => (
  <nav className="fixed bottom-0 z-50 flex h-[68px] w-full items-center justify-around border-t-2 bg-background px-1 lg:hidden">
    {NAV.map((item) => (
      <BottomNavItem key={item.href} {...item} />
    ))}
  </nav>
);
