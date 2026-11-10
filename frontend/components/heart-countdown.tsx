"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

/** Live "next heart in mm:ss"; refreshes server data when a heart lands. */
export const HeartCountdown = ({ nextAt }: { nextAt: string | null }) => {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!nextAt) return;
    const target = new Date(nextAt).getTime();
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= target) router.refresh();
    };
    const id = setInterval(tick, 1000);
    const first = setTimeout(tick, 0); // first paint without waiting a second
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [nextAt, router]);

  if (!nextAt) return <p className="text-sm font-bold text-neutral-500">You have full hearts. Keep on learning!</p>;
  if (now === null) return <p className="text-sm font-bold text-neutral-500">Next heart soon</p>;

  const left = Math.max(0, Math.round((new Date(nextAt).getTime() - now) / 1000));
  return (
    <p className="text-sm font-bold text-neutral-500">
      Next heart in{" "}
      <span className="tabular-nums text-rose-500">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </span>
    </p>
  );
};
