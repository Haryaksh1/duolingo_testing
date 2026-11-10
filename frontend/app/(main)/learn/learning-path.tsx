"use client";

import { useEffect, useState } from "react";

import { Check, Lock, NotebookText, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CircularProgressbarWithChildren } from "react-circular-progressbar";

import { CrownIcon } from "@/components/icons";
import type { Skill, Unit } from "@/lib/api";
import { cn } from "@/lib/utils";

import "react-circular-progressbar/dist/styles.css";

const THEME = {
  green: { banner: "bg-green-500 border-green-600", node: "bg-green-500", shadow: "#58A700", ring: "#58CC02" },
  blue: { banner: "bg-sky-400 border-sky-500", node: "bg-sky-400", shadow: "#1899D6", ring: "#1CB0F6" },
  purple: { banner: "bg-purple-400 border-purple-500", node: "bg-purple-400", shadow: "#A568CC", ring: "#CE82FF" },
} as const;

// Snake offsets (px) repeating every 8 nodes: centre, right, right, centre, left, left...
const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

export const LearningPath = ({ units }: { units: Unit[] }) => {
  const [openId, setOpenId] = useState<number | null>(null);
  const current = units.flatMap((u) => u.skills).find((s) => s.state === "active");

  useEffect(() => {
    // React's event root is `document` in the App Router, so stopPropagation can't shield this listener.
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-skill]")) setOpenId(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    document.getElementById(`skill-${current?.id}`)?.scrollIntoView({ block: "center" });
  }, [current?.id]);

  return (
    <div className="mx-auto max-w-[600px]">
      {units.map((unit) => (
        <section key={unit.id} className="mb-14">
          <UnitBanner unit={unit} />
          <div className="relative mt-4 flex flex-col items-center">
            {unit.skills.map((skill, i) => (
              <SkillNode
                key={skill.id}
                skill={skill}
                unit={unit}
                offset={OFFSETS[i % OFFSETS.length]}
                isCurrent={skill.id === current?.id}
                open={openId === skill.id}
                onToggle={() => setOpenId(openId === skill.id ? null : skill.id)}
              />
            ))}
            <Image
              src={unit.position % 2 ? "/mascot_bad.svg" : "/mascot.svg"}
              alt=""
              width={120}
              height={120}
              className={cn(
                "pointer-events-none absolute top-24 hidden opacity-90 xl:block",
                unit.position % 2 ? "right-1/2 mr-32" : "left-1/2 ml-32"
              )}
            />
          </div>
        </section>
      ))}
      <div className="flex flex-col items-center gap-y-2 pb-10 text-center text-neutral-500">
        <span className="text-5xl grayscale">🏆</span>
        <p className="font-bold">More units coming soon</p>
      </div>
    </div>
  );
};

const UnitBanner = ({ unit }: { unit: Unit }) => (
  <div
    className={cn(
      "sticky top-[68px] z-20 flex items-center justify-between rounded-2xl border-b-4 p-4 text-white lg:top-6",
      THEME[unit.color].banner
    )}
  >
    <div>
      <p className="text-sm font-extrabold uppercase tracking-wide opacity-80">{unit.title}</p>
      <h2 className="text-xl font-extrabold">{unit.description}</h2>
    </div>
    <Link
      href={`/guidebook/${unit.id}`}
      aria-label={`${unit.title} guidebook`}
      className="flex shrink-0 items-center gap-x-2 rounded-xl border-2 border-b-4 border-white/40 p-2 text-sm font-extrabold uppercase tracking-wide hover:bg-white/10 sm:px-4"
    >
      <NotebookText className="h-5 w-5" /> <span className="hidden sm:inline">Guidebook</span>
    </Link>
  </div>
);

type SkillNodeProps = {
  skill: Skill;
  unit: Unit;
  offset: number;
  isCurrent: boolean;
  open: boolean;
  onToggle: () => void;
};

const SkillNode = ({ skill, unit, offset, isCurrent, open, onToggle }: SkillNodeProps) => {
  const theme = THEME[unit.color];
  const locked = skill.state === "locked";
  const completed = skill.state === "completed";
  const Icon = completed ? CrownIcon : locked ? Lock : isCurrent ? Star : Check;

  const button = (
    <button
      type="button"
      id={`skill-${skill.id}`}
      aria-label={`${skill.title} (${skill.state})`}
      onClick={onToggle}
      className={cn(
        "relative flex h-[66px] w-[72px] items-center justify-center rounded-[50%] transition-transform active:translate-y-[6px]",
        locked ? "bg-neutral-200" : completed ? "bg-amber-400" : theme.node
      )}
      style={{
        boxShadow: `0 7px 0 ${locked ? "rgb(var(--n-300))" : completed ? "#E5A500" : theme.shadow}`,
      }}
    >
      <Icon
        className={cn(
          "h-9 w-9",
          locked ? "text-neutral-400" : "fill-white text-white",
          completed && "text-white"
        )}
      />
    </button>
  );

  return (
    <div data-skill className="relative my-3" style={{ left: offset }}>
      {isCurrent && (
        <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 animate-bounce whitespace-nowrap rounded-xl border-2 bg-background px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-green-500">
          Start
          <div className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-neutral-200" />
        </div>
      )}

      {isCurrent ? (
        <div className="h-[100px] w-[100px]">
          <CircularProgressbarWithChildren
            value={(skill.lessons_done / skill.lessons_total) * 100}
            strokeWidth={8}
            styles={{ path: { stroke: theme.ring }, trail: { stroke: "rgb(var(--n-200))" } }}
          >
            {button}
          </CircularProgressbarWithChildren>
        </div>
      ) : (
        <div className="flex h-[100px] w-[100px] items-center justify-center">{button}</div>
      )}

      <p className="mt-1 text-center text-xs font-extrabold uppercase tracking-wide text-neutral-500">
        {skill.icon} {skill.title}
      </p>

      {open && (
        <div
          className={cn(
            "absolute left-1/2 top-[118px] z-30 w-[290px] -translate-x-1/2 animate-pop rounded-2xl p-4 text-white",
            locked ? "border-2 bg-neutral-100 text-neutral-400" : completed ? "bg-amber-400" : theme.node
          )}
        >
          <h3 className="text-lg font-extrabold">{skill.title}</h3>
          <p className="mb-3 font-bold opacity-90">
            {locked
              ? "Complete all levels above to unlock this!"
              : completed
                ? "Skill complete! Replay a lesson to keep it fresh."
                : `Lesson ${skill.lessons_done + 1} of ${skill.lessons_total}`}
          </p>
          {locked ? (
            <div className="w-full rounded-xl bg-neutral-200 py-3 text-center text-sm font-extrabold uppercase tracking-wide text-neutral-400">
              Locked
            </div>
          ) : (
            <Link
              href={`/lesson/${skill.next_lesson_id}`}
              className={cn(
                "block w-full rounded-xl border-b-4 bg-background py-3 text-center text-sm font-extrabold uppercase tracking-wide transition active:translate-y-0.5 active:border-b-0",
                completed ? "border-neutral-200 text-amber-500" : "border-neutral-200 text-neutral-700"
              )}
            >
              {completed ? "Review +10 XP" : "Start +10 XP"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
