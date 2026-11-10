import Image from "next/image";
import Link from "next/link";

import { FlameIcon, GemIcon } from "@/components/icons";
import type { Me } from "@/lib/api";
import { cn } from "@/lib/utils";

import { HeartCountdown } from "./heart-countdown";
import { Stat } from "./stat-popover";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** This week, Monday to Sunday: practised days burn, frozen days show a snowflake. */
const StreakWeek = ({ me }: { me: Me }) => (
  <div className="mt-3 flex justify-between rounded-xl bg-neutral-50 p-3">
    {me.week.map(({ day, status }, i) => (
      <div key={day} className="flex flex-col items-center gap-y-1" title={`${day}: ${status}`}>
        <span className={cn("text-xs font-extrabold", status === "today" ? "text-orange-500" : "text-neutral-500")}>
          {DAYS[i]}
        </span>
        {status === "frozen" ? (
          <span className="flex h-6 w-6 items-center justify-center text-lg leading-none">❄️</span>
        ) : (
          <FlameIcon muted={status !== "practiced"} perfect={status === "practiced" && me.perfect_streak} className="h-6 w-6" />
        )}
      </div>
    ))}
  </div>
);

const StreakMessage = ({ me }: { me: Me }) => {
  if (me.earn_back) {
    const left = me.earn_back.lessons_needed - me.earn_back.lessons_done;
    return (
      <p className="text-sm font-semibold text-rose-500">
        You lost your {me.earn_back.lost_streak} day streak. Finish {left} more lesson{left === 1 ? "" : "s"} by{" "}
        {me.earn_back.deadline} to earn it back!
      </p>
    );
  }
  return (
    <p className="text-sm text-neutral-500">
      {me.streak_extended_today
        ? "You've practised today. Come back tomorrow to keep it going!"
        : "Do a lesson today to extend your streak."}
    </p>
  );
};

export const UserProgress = ({ me }: { me: Me }) => (
  <div className="flex w-full items-center justify-between gap-x-1">
    <Link href="/settings" title={me.course.title} className="shrink-0 rounded-xl px-2 py-2 transition hover:bg-neutral-100">
      <Image src={me.course.flag} alt={me.course.title} className="rounded-md" width={32} height={24} />
    </Link>

    <Stat
      label={`${me.streak} day streak`}
      className={me.streak > 0 ? "text-orange-500" : "text-neutral-400"}
      popover={
        <>
          <p className="text-lg font-extrabold">
            {me.streak} day streak
            {me.perfect_streak && me.streak >= 2 && <span className="ml-2 text-sm text-amber-500">✨ Perfect</span>}
          </p>
          <StreakMessage me={me} />
          <StreakWeek me={me} />
          <p className="mt-3 text-sm font-bold text-sky-500">
            {me.freezes_unlocked
              ? `❄️ Streak freezes: ${me.streak_freezes} / ${me.max_freezes}`
              : "❄️ Reach a 5 day streak to unlock streak freezes"}
          </p>
        </>
      }
    >
      <FlameIcon muted={me.streak === 0} glow={me.streak_extended_today} perfect={me.perfect_streak && me.streak >= 2} />
      {me.streak}
    </Stat>

    <Stat
      label={`${me.xp} total XP`}
      className="text-amber-500"
      popover={
        <div className="flex items-center gap-x-4">
          <Image src="/points.svg" alt="" width={56} height={56} className="shrink-0" />
          <div className="space-y-2">
            <p className="text-lg font-extrabold">{me.xp} total XP</p>
            <p className="text-sm text-neutral-500">
              {me.daily_xp} / {me.daily_goal} XP toward today&apos;s goal.
            </p>
            <Link href="/leaderboard" className="text-sm font-extrabold uppercase text-sky-400 hover:text-sky-500">
              View leaderboard
            </Link>
          </div>
        </div>
      }
    >
      <Image src="/points.svg" height={24} width={24} alt="" />
      {me.xp}
    </Stat>

    <Stat
      label={`${me.gems} gems`}
      className="text-sky-400"
      popover={
        <div className="flex items-center gap-x-4">
          <GemIcon className="h-14 w-14 shrink-0" />
          <div className="space-y-2">
            <p className="text-lg font-extrabold">Gems</p>
            <p className="text-sm text-neutral-500">You have {me.gems} gems. Earn more from lessons and achievements.</p>
            <Link href="/shop" className="text-sm font-extrabold uppercase text-sky-400 hover:text-sky-500">
              Go to shop
            </Link>
          </div>
        </div>
      }
    >
      <GemIcon />
      {me.gems}
    </Stat>

    <Stat
      label={`${me.hearts} hearts`}
      className="text-rose-500"
      popover={
        <>
          <p className="text-lg font-extrabold">Hearts</p>
          <div className="my-3 flex gap-x-1">
            {Array.from({ length: me.max_hearts }, (_, i) => (
              <Image
                key={i}
                src="/heart.svg"
                alt=""
                width={32}
                height={32}
                className={i < me.hearts ? "" : "opacity-30 grayscale"}
              />
            ))}
          </div>
          <HeartCountdown nextAt={me.next_heart_at} />
          {me.hearts < me.max_hearts && (
            <div className="mt-3 flex gap-x-2">
              <Link
                href="/shop"
                className="flex-1 rounded-xl border-2 border-b-4 py-2 text-center text-sm font-extrabold uppercase text-sky-400"
              >
                Refill · {me.refill_cost} 💎
              </Link>
              <Link
                href="/lesson/review"
                className="flex-1 rounded-xl border-2 border-b-4 py-2 text-center text-sm font-extrabold uppercase text-green-500"
              >
                Practice
              </Link>
            </div>
          )}
        </>
      }
    >
      <Image src="/heart.svg" height={24} width={24} alt="" />
      {me.hearts}
    </Stat>
  </div>
);
