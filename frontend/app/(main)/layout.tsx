import type { PropsWithChildren } from "react";

import { BottomNav, MobileHeader } from "@/components/mobile-header";
import { DailyGoal, Quests } from "@/components/quests";
import { ServerDown } from "@/components/server-down";
import { Sidebar } from "@/components/sidebar";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

const MainLayout = async ({ children }: PropsWithChildren) => {
  const me = await api.me().catch(() => null);
  if (!me) return <ServerDown />;

  return (
    <>
      <MobileHeader me={me} />
      <Sidebar className="hidden lg:flex" />
      <main className="min-h-full pb-[84px] pt-[60px] lg:pb-0 lg:pl-[256px] lg:pt-0">
        <div className="mx-auto flex max-w-[1056px] flex-row-reverse gap-12 px-4 pt-6 lg:px-6">
          <StickyWrapper>
            <UserProgress me={me} />
            <DailyGoal me={me} />
            <Quests me={me} />
          </StickyWrapper>
          <div className="relative min-w-0 flex-1 pb-10">{children}</div>
        </div>
      </main>
      <BottomNav />
    </>
  );
};

export default MainLayout;
