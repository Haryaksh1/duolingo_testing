import Link from "next/link";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const PracticeHub = async () => {
  const { stats } = await api.profile();
  const modes = [
    {
      href: "/lesson/review",
      icon: "💪",
      title: "Review",
      text:
        stats.to_review > 0
          ? `${stats.to_review} exercise${stats.to_review === 1 ? " is" : "s are"} due for review: the ones you're most likely to have forgotten. Earns back a heart.`
          : "Nothing is due yet, so you'll get a mix from lessons you've finished. Earns back a heart.",
      color: "border-sky-300 bg-sky-100 text-sky-700 dark:text-sky-300",
    },
    {
      href: "/lesson/timed",
      icon: "⏱️",
      title: "Timed challenge",
      text: "Answer as many as you can in 90 seconds. 1 XP per correct answer, no hearts lost.",
      color: "border-amber-400 bg-amber-50 text-amber-700 dark:text-amber-300",
    },
  ];

  return (
    <div className="mx-auto max-w-[600px] space-y-6">
      <h1 className="text-3xl font-extrabold">Practice Hub</h1>
      {modes.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className={cn(
            "flex items-center gap-x-4 rounded-2xl border-2 border-b-4 p-5 transition active:translate-y-0.5 active:border-b-2",
            m.color
          )}
        >
          <span className="text-5xl">{m.icon}</span>
          <div>
            <h2 className="text-xl font-extrabold">{m.title}</h2>
            <p className="font-semibold text-neutral-600">{m.text}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default PracticeHub;
