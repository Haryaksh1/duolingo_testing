"use client";

import { useEffect, useMemo, useState } from "react";

import { Snail, Volume2 } from "lucide-react";
import Image from "next/image";
import { useKey } from "react-use";

import type { Answer, Exercise } from "@/lib/api";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";

/** Draft = the learner's in-progress answer: text, chosen option, or tile indices. */
export type Draft = string | number[] | null;
export type Status = "none" | "correct" | "wrong";

export function toAnswer(exercise: Exercise, draft: Draft): Answer | null {
  if (exercise.type === "translate") {
    return Array.isArray(draft) && draft.length ? draft.map((i) => exercise.tiles[i]) : null;
  }
  return typeof draft === "string" && draft.trim() ? draft : null;
}

type Props<T extends Exercise["type"]> = {
  exercise: Extract<Exercise, { type: T }>;
  draft: Draft;
  setDraft: (d: Draft) => void;
  status: Status;
};

const statusClasses = (selected: boolean, status: Status) =>
  cn(
    selected && "border-sky-300 bg-sky-100 text-sky-500",
    selected && status === "correct" && "border-green-500 bg-green-100 text-green-600",
    selected && status === "wrong" && "animate-shake border-rose-500 bg-rose-100 text-rose-500"
  );

const SpeakerButton = ({ text, lang, size = "sm" }: { text: string; lang: "es" | "en"; size?: "sm" | "lg" }) => (
  <button
    type="button"
    onClick={() => speak(text, lang)}
    aria-label="Play audio"
    className={cn(
      "flex shrink-0 items-center justify-center rounded-xl bg-sky-400 text-white transition active:translate-y-1",
      size === "lg" ? "h-24 w-24 rounded-2xl shadow-[0_5px_0_#1899D6]" : "h-9 w-9 shadow-[0_3px_0_#1899D6]"
    )}
  >
    <Volume2 className={size === "lg" ? "h-12 w-12" : "h-5 w-5"} />
  </button>
);

/** Mascot with a speech bubble, used for sentence prompts. */
const Bubble = ({ text, lang }: { text: string; lang: "es" | "en" }) => {
  useEffect(() => {
    if (lang === "es") speak(text, "es");
  }, [text, lang]);

  return (
    <div className="flex items-end gap-x-3">
      <Image src="/mascot.svg" alt="" width={96} height={96} className="h-20 w-20 lg:h-28 lg:w-28" />
      <div className="relative mb-6 flex items-center gap-x-3 rounded-2xl border-2 px-4 py-3 text-base font-semibold lg:text-lg">
        {lang === "es" && <SpeakerButton text={text} lang="es" />}
        <span className="underline decoration-neutral-300 decoration-dashed underline-offset-4">{text}</span>
        <span className="absolute -left-[9px] bottom-4 h-4 w-4 rotate-45 border-b-2 border-l-2 bg-background" />
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ select (picture cards)

const SelectCard = ({
  option,
  index,
  selected,
  status,
  onPick,
}: {
  option: { text: string; image: string };
  index: number;
  selected: boolean;
  status: Status;
  onPick: () => void;
}) => {
  useKey(String(index + 1), onPick, {}, [onPick]);
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex flex-col items-center justify-between gap-y-4 rounded-2xl border-2 border-b-4 p-4 transition hover:bg-neutral-50 active:border-b-2 lg:p-6",
        statusClasses(selected, status)
      )}
    >
      <span className="text-6xl lg:text-8xl">{option.image}</span>
      <span className="flex w-full items-center justify-between gap-x-2">
        <span className="text-base font-bold lg:text-lg">{option.text}</span>
        <span className="hidden h-7 w-7 items-center justify-center rounded-lg border-2 text-sm font-bold text-neutral-400 lg:flex">
          {index + 1}
        </span>
      </span>
    </button>
  );
};

export const SelectExercise = ({ exercise, draft, setDraft, status }: Props<"select">) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {exercise.options.map((o, i) => (
      <SelectCard
        key={o.text}
        option={o}
        index={i}
        selected={draft === o.text}
        status={status}
        onPick={() => status === "none" && (speak(o.text), setDraft(o.text))}
      />
    ))}
  </div>
);

// ------------------------------------------------------------------ fill in the blank

export const FillExercise = ({ exercise, draft, setDraft, status }: Props<"fill">) => (
  <div className="space-y-8">
    <p className="text-sm font-bold text-neutral-400">“{exercise.translation}”</p>
    <p className="flex flex-wrap items-end gap-x-2 gap-y-3 text-2xl font-bold">
      <span>{exercise.before}</span>
      <span
        className={cn(
          "inline-flex min-w-[110px] justify-center border-b-2 border-neutral-300 px-2 pb-1",
          draft && "text-sky-500",
          status === "correct" && "text-green-500",
          status === "wrong" && "text-rose-500"
        )}
      >
        {draft || " "}
      </span>
      <span>{exercise.after}</span>
    </p>
    <div className="flex flex-wrap gap-3">
      {exercise.options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => status === "none" && setDraft(draft === o ? null : o)}
          className={cn(
            "rounded-2xl border-2 border-b-4 px-5 py-3 text-lg font-bold transition hover:bg-neutral-50 active:border-b-2",
            statusClasses(draft === o, status)
          )}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

// ------------------------------------------------------------------ translate with word bank

const Tile = ({ word, onClick, ghost }: { word: string; onClick?: () => void; ghost?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={ghost}
    className={cn(
      "animate-pop rounded-xl border-2 border-b-4 bg-background px-4 py-2 text-base font-semibold transition active:border-b-2 lg:text-lg",
      ghost && "animate-none border-transparent bg-neutral-200 text-transparent"
    )}
  >
    {word}
  </button>
);

export const TranslateExercise = ({ exercise, draft, setDraft, status }: Props<"translate">) => {
  const chosen = Array.isArray(draft) ? draft : [];
  const toggle = (i: number) => {
    if (status !== "none") return;
    if (exercise.source_lang === "en") speak(exercise.tiles[i], "es");
    setDraft(chosen.includes(i) ? chosen.filter((c) => c !== i) : [...chosen, i]);
  };

  return (
    <div className="space-y-6">
      <Bubble text={exercise.source} lang={exercise.source_lang} />
      <div className="flex min-h-[124px] flex-wrap content-start gap-2 border-y-2 py-3 [background:repeating-linear-gradient(transparent,transparent_58px,rgb(var(--n-200))_58px,rgb(var(--n-200))_60px)]">
        {chosen.map((i) => (
          <Tile key={i} word={exercise.tiles[i]} onClick={() => toggle(i)} />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {exercise.tiles.map((w, i) => (
          <Tile key={i} word={w} ghost={chosen.includes(i)} onClick={() => toggle(i)} />
        ))}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ type the answer / listen

const TextAnswer = ({
  draft,
  setDraft,
  status,
  placeholder,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  status: Status;
  placeholder: string;
}) => (
  <textarea
    autoFocus
    value={typeof draft === "string" ? draft : ""}
    onChange={(e) => setDraft(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
    readOnly={status !== "none"}
    placeholder={placeholder}
    spellCheck={false}
    autoComplete="off"
    rows={3}
    className={cn(
      "w-full resize-none rounded-2xl border-2 bg-neutral-50 p-4 text-lg outline-none focus:border-sky-300",
      status === "correct" && "border-green-500",
      status === "wrong" && "border-rose-500"
    )}
  />
);

export const TypeExercise = ({ exercise, draft, setDraft, status }: Props<"type">) => (
  <div className="space-y-6">
    <Bubble text={exercise.source} lang="en" />
    <TextAnswer draft={draft} setDraft={setDraft} status={status} placeholder="Type in Spanish" />
  </div>
);

export const ListenExercise = ({ exercise, draft, setDraft, status }: Props<"listen">) => {
  useEffect(() => {
    const t = setTimeout(() => speak(exercise.text, "es"), 300);
    return () => clearTimeout(t);
  }, [exercise.text]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-center gap-x-4">
        <SpeakerButton text={exercise.text} lang="es" size="lg" />
        <button
          type="button"
          onClick={() => speak(exercise.text, "es", true)}
          aria-label="Play slowly"
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-400 text-white shadow-[0_5px_0_#1899D6] transition active:translate-y-1"
        >
          <Snail className="h-8 w-8" />
        </button>
      </div>
      <TextAnswer draft={draft} setDraft={setDraft} status={status} placeholder="Type what you hear" />
    </div>
  );
};

// ------------------------------------------------------------------ match pairs

/** Graded locally tap by tap (Duolingo-style); the full set is then confirmed with the server. */
export const MatchExercise = ({
  exercise,
  onSolved,
}: {
  exercise: Extract<Exercise, { type: "match" }>;
  onSolved: (pairs: string[][]) => void;
}) => {
  const [left, right] = useMemo(() => {
    const shuffle = (xs: string[]) => [...xs].sort(() => Math.random() - 0.5);
    return [shuffle(exercise.pairs.map((p) => p[0])), shuffle(exercise.pairs.map((p) => p[1]))];
  }, [exercise.pairs]);
  const [pick, setPick] = useState<{ side: 0 | 1; word: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);

  const tap = (side: 0 | 1, word: string) => {
    if (matched.includes(word)) return;
    if (side === 0) speak(word, "es");
    if (!pick || pick.side === side) return setPick({ side, word });

    const [es, en] = side === 0 ? [word, pick.word] : [pick.word, word];
    setPick(null);
    if (exercise.pairs.some((p) => p[0] === es && p[1] === en)) {
      const next = [...matched, es, en];
      setMatched(next);
      if (next.length === exercise.pairs.length * 2) onSolved(exercise.pairs);
    } else {
      setWrong([es, en]);
      setTimeout(() => setWrong([]), 500);
    }
  };

  const column = (words: string[], side: 0 | 1) => (
    <div className="flex flex-col gap-3">
      {words.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => tap(side, w)}
          disabled={matched.includes(w)}
          className={cn(
            "rounded-2xl border-2 border-b-4 px-4 py-3 text-lg font-semibold transition active:border-b-2",
            pick?.word === w && "border-sky-300 bg-sky-100 text-sky-500",
            wrong.includes(w) && "animate-shake border-rose-500 bg-rose-100 text-rose-500",
            matched.includes(w) && "border-b-2 border-neutral-200 bg-background text-neutral-300"
          )}
        >
          {w}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4 lg:gap-8">
      {column(left, 0)}
      {column(right, 1)}
    </div>
  );
};
