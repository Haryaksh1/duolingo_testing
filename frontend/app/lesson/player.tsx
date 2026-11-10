"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Loader } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { toast } from "sonner";

import { FlameIcon, GemIcon } from "@/components/icons";
import { ServerDown } from "@/components/server-down";
import { Button } from "@/components/ui/button";
import {
  type Answer,
  ApiError,
  type CompleteResult,
  api,
  type Session,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  type Draft,
  FillExercise,
  GlossaryContext,
  ListenExercise,
  MatchExercise,
  SelectExercise,
  type Status,
  TranslateExercise,
  TypeExercise,
  toAnswer,
} from "./exercises";
import { Footer } from "./footer";
import { Header } from "./header";

type Phase =
  "loading" | "error" | "playing" | "out_of_hearts" | "complete" | "streak";

const play = (src: string) => void new Audio(src).play().catch(() => {});

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

type Mode = "lesson" | "review" | "timed";
const KIND = { lesson: "lesson", review: "practice", timed: "timed" } as const;

/** Runs a lesson, a mistakes review, or a timed challenge. Only lessons use hearts. */
export const LessonPlayer = ({
  mode,
  lessonId,
}: {
  mode: Mode;
  lessonId?: number;
}) => {
  const router = useRouter();
  const practice = mode !== "lesson";
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [queue, setQueue] = useState<number[]>([]); // indexes into session.exercises; misses go back on the end
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [turn, setTurn] = useState(0);
  const [solved, setSolved] = useState(0);
  const [hearts, setHearts] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [status, setStatus] = useState<Status>("none");
  const [solution, setSolution] = useState("");
  const [pending, setPending] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const started = useRef(false);
  const finishing = useRef(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { width, height } = useWindowSize();

  const start = useCallback(async () => {
    setPhase("loading");
    try {
      const s = await api.startSession({
        kind: KIND[mode],
        lesson_id: lessonId,
      });
      setDeadline(s.time_limit ? Date.now() + s.time_limit * 1000 : null);
      setSession(s);
      setQueue(s.exercises.map((_, i) => i));
      setMissed(new Set());
      setSolved(0);
      setHearts(practice ? null : s.hearts);
      setDraft(null);
      setStatus("none");
      setOutOfHearts(false);
      setPhase("playing");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409)
        return setPhase("out_of_hearts");
      if (e instanceof ApiError && e.status === 403) {
        toast.error("That lesson is still locked.");
        return router.replace("/learn");
      }
      setError(message(e));
      setPhase("error");
    }
  }, [lessonId, mode, practice, router]);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev; create one session only
    started.current = true;
    void start();
  }, [start]);

  const exercise = session && queue.length ? session.exercises[queue[0]] : null;

  const submit = async (answer: Answer) => {
    if (!session || !exercise || pending) return;
    setPending(true);
    try {
      const r = await api.answer(session.id, exercise.id, answer);
      setSolution(r.solution);
      if (r.correct) {
        play("/correct.wav");
        setStatus("correct");
        setSolved((n) => n + 1);
      } else {
        play("/incorrect.wav");
        setStatus("wrong");
        setMissed((m) => new Set(m).add(exercise.id));
        if (!practice) setHearts(r.hearts);
        setOutOfHearts(r.out_of_hearts);
      }
    } catch (e) {
      toast.error(message(e));
    } finally {
      setPending(false);
    }
  };

  const finish = useCallback(async () => {
    if (!session || finishing.current) return;
    finishing.current = true;
    setPending(true);
    try {
      const r = await api.complete(session.id);
      setResult(r);
      setPhase("complete");
      play("/finish.mp3");
      r.achievements.forEach((a) =>
        toast.success(`${a.icon} Achievement unlocked: ${a.title}`, {
          description: `+${a.reward_gems} gems`,
        })
      );
    } catch (e) {
      finishing.current = false;
      toast.error(message(e));
    } finally {
      setPending(false);
    }
  }, [session]);

  // Timed challenge clock: ends the run when it hits zero (the server enforces the same limit).
  const timeUp = deadline !== null && now >= deadline;
  useEffect(() => {
    if (deadline === null || phase !== "playing") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) void finish();
    }, 250);
    return () => clearInterval(id);
  }, [deadline, phase, finish]);

  const advance = () => {
    const rest = queue.slice(1);
    // Misses come back at the end, except in timed runs where the clock decides when you stop.
    const next =
      status === "wrong" && mode !== "timed" ? [...rest, queue[0]] : rest;
    if (!next.length) return void finish(); // keep the queue until completion succeeds, so Continue can retry
    setQueue(next);
    setTurn((t) => t + 1);
    setDraft(null);
    setStatus("none");
  };

  const onFooter = () => {
    if (status === "none") {
      const answer = exercise && toAnswer(exercise, draft);
      if (answer) void submit(answer);
      return;
    }
    if (outOfHearts) return setPhase("out_of_hearts");
    advance();
  };

  const refill = async () => {
    try {
      await api.refillHearts();
      toast.success("Hearts refilled!");
      if (!session) return void start();
      setHearts(5);
      setOutOfHearts(false);
      setPhase("playing");
      advance();
    } catch (e) {
      toast.error(message(e));
    }
  };

  // ---------------------------------------------------------------- screens

  if (phase === "loading") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-y-4">
        <Image
          src="/mascot.svg"
          alt=""
          width={90}
          height={90}
          className="animate-bounce"
        />
        <Loader className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (phase === "error") return <ServerDown message={error} />;

  if (phase === "out_of_hearts") {
    return (
      <div className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-y-4 px-6 text-center">
          <Image src="/mascot_bad.svg" alt="" width={120} height={120} />
          <h1 className="text-3xl font-extrabold">You ran out of hearts!</h1>
          <p className="max-w-md text-lg text-neutral-500">
            Hearts refill over time (one every 30 minutes). Refill now with
            gems, or practice to earn a heart back.
          </p>
          <div className="mt-4 flex w-full max-w-sm flex-col gap-y-3">
            <Button variant="super" size="lg" onClick={refill}>
              <GemIcon className="mr-2 h-5 w-5" /> Refill for 350 gems
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/lesson/review")}
            >
              Practice to earn hearts
            </Button>
            <Button
              variant="primaryOutline"
              size="lg"
              onClick={() => router.push("/learn")}
            >
              No thanks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "complete" && result) {
    return (
      <div className="flex min-h-full flex-col">
        <Confetti
          recycle={false}
          numberOfPieces={400}
          tweenDuration={8000}
          width={width}
          height={height}
          style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-y-6 px-6 text-center">
          <Image
            src="/finish.svg"
            alt=""
            width={140}
            height={140}
            className="animate-pop"
          />
          <h1 className="text-3xl font-extrabold text-amber-400 lg:text-4xl">
            {mode === "timed"
              ? timeUp
                ? "Time's up!"
                : "Challenge complete!"
              : practice
                ? "Practice complete!"
                : result.mistakes
                  ? "Lesson complete!"
                  : "Perfect lesson!"}
          </h1>
          <div className="flex w-full max-w-lg gap-3">
            <StatCard
              label="Total XP"
              value={`⚡ ${result.xp}`}
              color="bg-amber-400 border-amber-400 text-amber-500"
            />
            <StatCard
              label={result.accuracy === 100 ? "Amazing" : "Accuracy"}
              value={`🎯 ${result.accuracy}%`}
              color="bg-green-500 border-green-500 text-green-500"
            />
            {mode === "timed" ? (
              <StatCard
                label="Correct"
                value={`✅ ${result.xp}`}
                color="bg-sky-400 border-sky-400 text-sky-400"
              />
            ) : practice ? (
              <StatCard
                label="Hearts"
                value={`❤️ ${result.me.hearts}`}
                color="bg-rose-500 border-rose-500 text-rose-500"
              />
            ) : (
              <StatCard
                label="Gems"
                value={`💎 ${result.gems}`}
                color="bg-sky-400 border-sky-400 text-sky-400"
              />
            )}
          </div>
          {result.achievements.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {result.achievements.map((a) => (
                <span
                  key={a.code}
                  className="rounded-full border-2 border-amber-400 bg-amber-50 px-3 py-1 font-bold text-amber-600"
                >
                  {a.icon} {a.title}
                </span>
              ))}
            </div>
          )}
        </div>
        <Footer
          key="complete"
          status="none"
          label="Continue"
          onCheck={() =>
            result.streak_extended ? setPhase("streak") : router.push("/learn")
          }
        />
      </div>
    );
  }

  if (phase === "streak" && result) {
    return (
      <div className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-y-2 px-6 text-center">
          {result.streak_milestone && (
            <Confetti
              recycle={false}
              numberOfPieces={300}
              width={width}
              height={height}
              style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
            />
          )}
          <FlameIcon glow
            className="h-40 w-40"
            perfect={result.me.perfect_streak}
          />
          <p className="text-8xl font-black text-orange-500">
            {result.me.streak}
          </p>
          <h1 className="text-3xl font-extrabold text-orange-500">
            {result.earned_back
              ? "day streak earned back!"
              : result.streak_milestone
                ? "day milestone!"
                : "day streak!"}
          </h1>
          <p className="mt-2 max-w-sm text-lg text-neutral-500">
            {result.earned_back
              ? "You restored your streak. Keep it going!"
              : result.streak_milestone
                ? `${result.me.streak} days in a row. That's a real habit!`
                : "Practice every day so your streak doesn't reset."}
          </p>
          {result.freezes_gained > 0 && (
            <p className="mt-3 rounded-2xl border-2 border-sky-300 bg-sky-100 px-4 py-2 font-extrabold text-sky-500">
              ❄️ +{result.freezes_gained} streak freeze
              {result.freezes_gained === 1 ? "" : "s"} (
              {result.me.streak_freezes}/{result.me.max_freezes})
            </p>
          )}
        </div>
        <Footer
          key="streak"
          status="none"
          label="Continue"
          onCheck={() => router.push("/learn")}
        />
      </div>
    );
  }

  if (!session || !exercise) return null;

  const view = { draft, setDraft, status };
  const canCheck =
    status !== "none" ||
    (exercise.type !== "match" && !!toAnswer(exercise, draft));

  return (
    <div className="flex min-h-full flex-col">
      <Header
        hearts={hearts}
        percentage={(solved / session.exercises.length) * 100}
        secondsLeft={
          deadline === null
            ? undefined
            : Math.max(0, Math.ceil((deadline - now) / 1000))
        }
      />

      <GlossaryContext.Provider value={session.glossary}>
        <main className="flex flex-1 justify-center px-6 py-8">
          <div
            key={turn}
            className="flex w-full max-w-[600px] flex-col justify-center gap-y-8 animate-in fade-in slide-in-from-right-4"
          >
            <div>
              {missed.has(exercise.id) && status === "none" && (
                <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-orange-500">
                  ↺ Previous mistake
                </p>
              )}
              <h1 className="text-2xl font-extrabold lg:text-3xl">
                {exercise.prompt}
              </h1>
            </div>
            {exercise.type === "select" && (
              <SelectExercise exercise={exercise} {...view} />
            )}
            {exercise.type === "fill" && (
              <FillExercise exercise={exercise} {...view} />
            )}
            {exercise.type === "translate" && (
              <TranslateExercise exercise={exercise} {...view} />
            )}
            {exercise.type === "type" && (
              <TypeExercise exercise={exercise} {...view} />
            )}
            {exercise.type === "listen" && (
              <ListenExercise exercise={exercise} {...view} />
            )}
            {exercise.type === "match" && (
              <MatchExercise
                exercise={exercise}
                onSolved={(pairs) => void submit(pairs)}
              />
            )}
          </div>
        </main>
      </GlossaryContext.Provider>

      <Footer
        status={status}
        solution={solution}
        disabled={pending || !canCheck}
        onCheck={onFooter}
      />
    </div>
  );
};

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) => (
  <div className={cn("flex-1 rounded-2xl border-2", color)}>
    <p className="py-1 text-xs font-extrabold uppercase text-white">{label}</p>
    <p className="rounded-xl bg-background px-2 py-4 text-xl font-extrabold">
      {value}
    </p>
  </div>
);
