import Image from "next/image";
import Link from "next/link";

import { Progress } from "@/components/ui/progress";
import type { Me } from "@/lib/api";

import { ClaimChest } from "./claim-chest";

export const DailyGoal = ({ me }: { me: Me }) => {
  const done = me.daily_xp >= me.daily_goal;
  return (
    <div className="space-y-3 rounded-2xl border-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-neutral-700">Daily goal</h3>
        <Link
          href="/settings"
          className="text-sm font-extrabold uppercase text-sky-400 hover:text-sky-500"
        >
          Edit
        </Link>
      </div>
      <div className="flex items-center gap-x-3">
        <Image src="/points.svg" alt="XP" width={40} height={40} />
        <div className="flex-1 space-y-1">
          <Progress
            value={Math.min(100, (me.daily_xp / me.daily_goal) * 100)}
            className="h-4 bg-neutral-200"
            indicatorClassName={done ? "bg-amber-400" : "bg-orange-400"}
          />
          <p className="text-sm font-bold text-neutral-500">
            {done
              ? "Goal reached! 🎉"
              : `${me.daily_xp} / ${me.daily_goal} XP today`}
          </p>
        </div>
      </div>
    </div>
  );
};

export const Quests = ({ me, full = false }: { me: Me; full?: boolean }) => (
  <div className="space-y-4 rounded-2xl border-2 p-4">
    {!full && (
      <div className="flex w-full items-center justify-between">
        <h3 className="text-lg font-extrabold text-neutral-700">Daily Quests</h3>
        <Link
          href="/quests"
          className="text-sm font-extrabold uppercase text-sky-400 hover:text-sky-500"
        >
          View all
        </Link>
      </div>
    )}

    <ul className="w-full space-y-5">
      {me.quests.map((quest) => {
        const done = quest.progress >= quest.target;
        return (
          <li className="flex w-full items-center gap-x-3" key={quest.id}>
            <span className="text-3xl" aria-hidden>
              {done ? "🏆" : quest.id === "xp" ? "⚡" : quest.id === "lessons" ? "📘" : "🎯"}
            </span>
            <div className="flex w-full flex-col gap-y-2">
              <p className="text-sm font-bold text-neutral-700 lg:text-base">
                {quest.title}
              </p>
              <div className="flex items-center gap-x-2">
                <Progress
                  value={Math.min(100, (quest.progress / quest.target) * 100)}
                  className="h-4 bg-neutral-200"
                  indicatorClassName={done ? "bg-green-500" : "bg-amber-400"}
                />
                <span className="shrink-0 text-xs font-extrabold text-neutral-400">
                  {Math.min(quest.progress, quest.target)}/{quest.target}
                </span>
              </div>
            </div>
            <ClaimChest quest={quest} />
          </li>
        );
      })}
    </ul>
  </div>
);
