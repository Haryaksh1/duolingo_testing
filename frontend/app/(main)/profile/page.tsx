import Image from "next/image";
import Link from "next/link";

import { FlameIcon } from "@/components/icons";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ProfilePage = async () => {
  const p = await api.profile();
  const peak = Math.max(...p.history.map((h) => h.xp), 1);
  const stats = [
    { icon: <FlameIcon className="h-7 w-7" />, value: p.me.streak, label: "Day streak" },
    { icon: "⚡", value: p.stats.xp, label: "Total XP" },
    { icon: "📘", value: p.stats.lessons, label: "Lessons" },
    { icon: "💎", value: p.stats.perfect, label: "Perfect lessons" },
  ];

  return (
    <div className="mx-auto max-w-[600px] space-y-8">
      <div className="flex items-center gap-x-5 border-b-2 pb-6">
        <Image src={p.me.avatar} alt="" width={96} height={96} className="h-24 w-24 shrink-0 rounded-full border-2 bg-sky-100 object-contain p-2" />
        <div>
          <h1 className="text-3xl font-extrabold">{p.me.display_name}</h1>
          <p className="text-neutral-500">
            Learning {p.me.course.title} · joined{" "}
            {new Date(p.created_at).toLocaleDateString("en", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-2xl font-extrabold">Statistics</h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-x-3 rounded-2xl border-2 p-4">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-xl font-extrabold">{s.value}</p>
                <p className="text-sm text-neutral-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-extrabold">This week</h2>
        <div className="flex h-40 items-end gap-x-2 rounded-2xl border-2 p-4">
          {p.history.map((h) => (
            <div key={h.day} className="flex flex-1 flex-col items-center gap-y-1">
              <span className="text-xs font-bold text-neutral-500">{h.xp || ""}</span>
              <div
                className={cn("w-full rounded-t-lg", h.day === p.me.today ? "bg-orange-400" : "bg-amber-400")}
                style={{ height: `${(h.xp / peak) * 80}px`, minHeight: 4 }}
              />
              <span className="text-xs font-bold text-neutral-500">{DAY[new Date(`${h.day}T12:00`).getDay()]}</span>
            </div>
          ))}
        </div>
      </section>

      {p.stats.to_review > 0 && (
        <Link
          href="/lesson/review"
          className="flex items-center justify-between rounded-2xl border-2 border-b-4 border-sky-300 bg-sky-100 p-4 font-bold text-sky-500"
        >
          <span>💪 {p.stats.to_review} exercises to review</span>
          <span className="uppercase">Practice</span>
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-2xl font-extrabold">Achievements</h2>
        <ul className="divide-y-2 rounded-2xl border-2">
          {p.achievements.map((a) => (
            <li key={a.code} className={cn("flex items-center gap-x-4 p-4", !a.unlocked_at && "opacity-60")}>
              <span className={cn("text-4xl", !a.unlocked_at && "grayscale")}>{a.icon}</span>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <p className="font-extrabold">{a.title}</p>
                  <p className="text-sm font-bold text-neutral-500">
                    {a.progress}/{a.threshold}
                  </p>
                </div>
                <p className="text-sm text-neutral-500">{a.description}</p>
                {!a.unlocked_at && (
                  <Progress value={(a.progress / a.threshold) * 100} className="h-3" indicatorClassName="bg-amber-400" />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default ProfilePage;
