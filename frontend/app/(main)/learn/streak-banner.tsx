"use client";

import { useSyncExternalStore } from "react";

import Link from "next/link";

import { FlameIcon } from "@/components/icons";
import type { Me } from "@/lib/api";
import { cn } from "@/lib/utils";

const SAVER_HOUR = 18; // Duolingo's streak saver nudges late in the day

const subscribe = () => () => {};
const localHour = () => new Date().getHours();

/** Earn-back progress after a lost streak, or a "streak at risk" nudge in the evening. */
export const StreakBanner = ({ me, lessonId }: { me: Me; lessonId?: number }) => {
  const hour = useSyncExternalStore(subscribe, localHour, () => 0);
  const atRisk = me.streak > 0 && !me.streak_extended_today && hour >= SAVER_HOUR;
  if (!me.earn_back && !atRisk) return null;

  const eb = me.earn_back;
  return (
    <div
      className={cn(
        "mx-auto mb-6 flex max-w-[600px] flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border-2 p-4",
        eb ? "border-rose-300 bg-rose-100" : "border-orange-400 bg-amber-50"
      )}
    >
      <FlameIcon muted={!!eb} className="h-10 w-10 shrink-0" />
      <div className="min-w-[160px] flex-1">
        <p className={cn("font-extrabold", eb ? "text-rose-700 dark:text-rose-300" : "text-orange-700 dark:text-orange-300")}>
          {eb ? `Earn back your ${eb.lost_streak} day streak!` : `Your ${me.streak} day streak is at risk!`}
        </p>
        <p className="text-sm font-semibold text-neutral-600">
          {eb
            ? `${eb.lessons_done} / ${eb.lessons_needed} lessons done · ends ${eb.deadline}`
            : "Finish a lesson before midnight to keep it."}
        </p>
      </div>
      {lessonId && (
        <Link
          href={`/lesson/${lessonId}`}
          className="shrink-0 rounded-xl border-b-4 border-green-600 bg-green-500 px-4 py-2 text-center text-sm font-extrabold uppercase text-white active:translate-y-0.5 active:border-b-0 max-sm:w-full"
        >
          {eb ? "Start" : "Save it"}
        </Link>
      )}
    </div>
  );
};
