"use client";

import { Volume2 } from "lucide-react";

import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";

export const SpeakerButton = ({ text, lang, size = "sm" }: { text: string; lang: "es" | "en"; size?: "sm" | "lg" }) => (
  <button
    type="button"
    onClick={() => speak(text, lang)}
    aria-label={`Play audio: ${text}`}
    className={cn(
      "flex shrink-0 items-center justify-center rounded-xl bg-sky-400 text-white transition active:translate-y-1",
      size === "lg" ? "h-24 w-24 rounded-2xl shadow-[0_5px_0_#1899D6]" : "h-9 w-9 shadow-[0_3px_0_#1899D6]"
    )}
  >
    <Volume2 className={size === "lg" ? "h-12 w-12" : "h-5 w-5"} />
  </button>
);
