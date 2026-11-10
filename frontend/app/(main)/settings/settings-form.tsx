"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, type Me } from "@/lib/api";
import { cn } from "@/lib/utils";

const GOALS = [
  { xp: 10, label: "Casual" },
  { xp: 20, label: "Regular" },
  { xp: 30, label: "Serious" },
  { xp: 50, label: "Intense" },
];

const SOON = [
  { flag: "/fr.svg", name: "French" },
  { flag: "/it.svg", name: "Italian" },
  { flag: "/jp.svg", name: "Japanese" },
  { flag: "/hr.svg", name: "Croatian" },
];

type Theme = "system" | "light" | "dark";

function applyTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {
    // storage blocked: the choice just won't persist
  }
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new Event("themechange"));
}

const readTheme = (): Theme => {
  try {
    return (localStorage.getItem("theme") as Theme | null) ?? "system";
  } catch {
    return "system";
  }
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("themechange", onChange);
  return () => window.removeEventListener("themechange", onChange);
};

const ThemePicker = () => {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  return (
    <div className="grid grid-cols-3 gap-3">
      {(["system", "light", "dark"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => applyTheme(t)}
          className={cn(
            "rounded-2xl border-2 border-b-4 p-3 font-bold capitalize transition active:border-b-2",
            theme === t && "border-sky-300 bg-sky-100 text-sky-500"
          )}
        >
          {t === "system" ? "🖥️" : t === "light" ? "☀️" : "🌙"} {t}
        </button>
      ))}
    </div>
  );
};

export const SettingsForm = ({ me }: { me: Me }) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(me.display_name);

  const run = (action: () => Promise<unknown>, done: string) =>
    startTransition(async () => {
      try {
        await action();
        toast.success(done);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });

  return (
    <div className="mx-auto max-w-[600px] space-y-8">
      <h1 className="text-3xl font-extrabold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Profile</h2>
        <form
          className="flex gap-x-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.updateMe({ display_name: name }), "Name saved");
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
            aria-label="Display name"
            className="flex-1 rounded-2xl border-2 bg-neutral-50 px-4 py-2 outline-none focus:border-sky-300"
          />
          <Button variant="primary" disabled={pending || !name.trim() || name === me.display_name}>
            Save
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Daily goal</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GOALS.map((g) => (
            <button
              key={g.xp}
              type="button"
              disabled={pending}
              onClick={() => run(() => api.updateMe({ daily_goal: g.xp }), `Daily goal set to ${g.xp} XP`)}
              className={cn(
                "rounded-2xl border-2 border-b-4 p-3 text-center font-bold transition active:border-b-2",
                me.daily_goal === g.xp && "border-sky-300 bg-sky-100 text-sky-500"
              )}
            >
              <p>{g.label}</p>
              <p className="text-sm opacity-70">{g.xp} XP / day</p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Appearance</h2>
        <ThemePicker />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Courses</h2>
        <div className="flex items-center gap-x-3 rounded-2xl border-2 border-green-500 p-3">
          <Image src={me.course.flag} alt="" width={40} height={30} className="rounded" />
          <span className="flex-1 font-bold">{me.course.title}</span>
          <span className="text-sm font-bold uppercase text-green-500">Learning</span>
        </div>
        {SOON.map((c) => (
          <div key={c.name} className="flex items-center gap-x-3 rounded-2xl border-2 p-3 opacity-60">
            <Image src={c.flag} alt="" width={40} height={30} className="rounded" />
            <span className="flex-1 font-bold">{c.name}</span>
            <span className="text-sm font-bold uppercase text-neutral-500">Coming soon</span>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Coming soon</h2>
        <p className="rounded-2xl border-2 p-4 text-neutral-500">
          Speaking exercises, notifications, friends and Super subscription.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border-2 border-dashed p-4">
        <h2 className="text-xl font-extrabold">Testing tools</h2>
        <p className="text-sm text-neutral-500">
          Simulated date: <b>{me.today}</b>. Move the clock to check streaks and daily goals.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="default" disabled={pending} onClick={() => run(api.advanceDay, "Moved to the next day")}>
            Simulate next day
          </Button>
          <Button
            variant="dangerOutline"
            className="border-2 border-b-4"
            disabled={pending}
            onClick={() => confirm("Reset all progress to the seeded demo state?") && run(api.reset, "Progress reset")}
          >
            Reset progress
          </Button>
        </div>
      </section>
    </div>
  );
};
