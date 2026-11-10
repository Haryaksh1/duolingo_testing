import Image from "next/image";
import Link from "next/link";

import { FlameIcon, GemIcon } from "@/components/icons";
import type { Me } from "@/lib/api";
import { cn } from "@/lib/utils";

import { HeartCountdown } from "./heart-countdown";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Icon + number with a Duolingo-style hover/focus popover (pure CSS, no JS state). */
const Stat = ({
  label,
  className,
  children,
  popover,
}: {
  label: string;
  className: string;
  children: React.ReactNode;
  popover: React.ReactNode;
}) => (
  <div className="group relative">
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex items-center gap-x-1.5 rounded-xl px-2 py-2 text-base font-extrabold transition hover:bg-neutral-100",
        className
      )}
    >
      {children}
    </button>
    <div className="invisible absolute right-0 top-full z-50 w-[300px] pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 max-lg:fixed max-lg:inset-x-2 max-lg:top-[60px] max-lg:w-auto">
      <div className="rounded-2xl border-2 bg-background p-4 shadow-lg">{popover}</div>
    </div>
  </div>
);

/** Weekday dots for the current streak: the last `streak` days ending today (or yesterday). */
const StreakWeek = ({ me }: { me: Me }) => {
  const today = new Date(`${me.today}T12:00:00`);
  const todayIdx = (today.getDay() + 6) % 7; // Monday = 0
  const lastActive = me.streak_extended_today ? todayIdx : todayIdx - 1;
  return (
    <div className="mt-3 flex justify-between rounded-xl bg-neutral-50 p-3">
      {DAYS.map((d, i) => {
        const active = me.streak > 0 && i <= lastActive && i > lastActive - me.streak;
        return (
          <div key={i} className="flex flex-col items-center gap-y-1">
            <span className={cn("text-xs font-extrabold", i === todayIdx ? "text-orange-500" : "text-neutral-400")}>
              {d}
            </span>
            <FlameIcon muted={!active} className="h-6 w-6" />
          </div>
        );
      })}
    </div>
  );
};

export const UserProgress = ({ me }: { me: Me }) => (
  <div className="flex w-full items-center justify-between gap-x-1">
    <Link href="/settings" title={me.course.title} className="shrink-0 rounded-xl px-2 py-2 transition hover:bg-neutral-100">
      <Image src={me.course.flag} alt={me.course.title} className="rounded-md" width={32} height={24} />
    </Link>

    <Stat
      label={`${me.streak} day streak`}
      className={me.streak_extended_today ? "text-orange-500" : "text-neutral-400"}
      popover={
        <>
          <p className="text-lg font-extrabold">{me.streak} day streak</p>
          <p className="text-sm text-neutral-500">
            {me.streak_extended_today
              ? "You've practised today. Come back tomorrow to keep it going!"
              : "Do a lesson today to extend your streak."}
          </p>
          <StreakWeek me={me} />
        </>
      }
    >
      <FlameIcon muted={!me.streak_extended_today} />
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
