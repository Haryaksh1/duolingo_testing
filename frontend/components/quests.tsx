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

    {/* Fixed 3-column grid so every row's icon, bar and chest line up; counter sits inside the bar. */}
    <ul className="w-full divide-y-2">
      {me.quests.map((quest) => {
        const done = quest.progress >= quest.target;
        return (
          <li className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-x-3 py-3" key={quest.id}>
            <span className="flex justify-center text-3xl leading-none" aria-hidden>
              {done ? "🏆" : quest.id === "xp" ? "⚡" : quest.id === "lessons" ? "📘" : "🎯"}
            </span>
            <div className="min-w-0 space-y-2">
              <p className="text-[15px] font-bold leading-tight text-neutral-700">{quest.title}</p>
              <div className="relative">
                <Progress
                  value={Math.min(100, (quest.progress / quest.target) * 100)}
                  className="h-5"
                  indicatorClassName={done ? "bg-green-500" : "bg-amber-400"}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-neutral-600">
                  {Math.min(quest.progress, quest.target)} / {quest.target}
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
