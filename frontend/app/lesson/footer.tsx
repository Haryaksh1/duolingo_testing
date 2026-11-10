"use client";

import { useEffect, useRef } from "react";

import { CheckCircle2, XCircle } from "lucide-react";
import { useKey } from "react-use";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRAISE = ["Nicely done!", "Great job!", "Excellent!", "Amazing!", "You got it!"];

type FooterProps = {
  status: "none" | "correct" | "wrong";
  solution?: string;
  disabled?: boolean;
  onCheck: () => void;
  label?: string;
};

export const Footer = ({ status, solution, disabled, onCheck, label }: FooterProps) => {
  // Ignore an Enter that lands right as a new screen mounts, so a double-press can't skip it.
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  // preventDefault: Enter on a focused option button would otherwise also "click" (toggle) it.
  useKey(
    "Enter",
    (e) => {
      e.preventDefault();
      if (!disabled && Date.now() - mountedAt.current > 400) onCheck();
    },
    {},
    [onCheck, disabled]
  );
  const praise = PRAISE[(solution?.length ?? 0) % PRAISE.length];

  return (
    <footer
      className={cn(
        "border-t-2 transition-colors",
        status === "correct" && "animate-slide-up border-transparent bg-green-100",
        status === "wrong" && "animate-slide-up border-transparent bg-rose-100"
      )}
    >
      <div className="mx-auto flex min-h-[120px] max-w-[1000px] flex-col justify-center gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:min-h-[140px] lg:px-10">
        {status === "correct" && (
          <div className="flex items-center gap-x-4 text-green-600">
            <CheckCircle2 className="h-12 w-12 shrink-0 rounded-full bg-white p-1 lg:h-16 lg:w-16" />
            <p className="text-2xl font-extrabold">{praise}</p>
          </div>
        )}
        {status === "wrong" && (
          <div className="flex items-center gap-x-4 text-rose-500">
            <XCircle className="h-12 w-12 shrink-0 rounded-full bg-white p-1 lg:h-16 lg:w-16" />
            <div>
              <p className="text-2xl font-extrabold">Correct solution:</p>
              <p className="text-lg font-semibold">{solution}</p>
            </div>
          </div>
        )}
        <Button
          disabled={disabled}
          onClick={onCheck}
          size="lg"
          variant={status === "wrong" ? "danger" : "secondary"}
          className="w-full sm:ml-auto sm:w-[150px]"
        >
          {label ?? (status === "none" ? "Check" : status === "wrong" ? "Got it" : "Continue")}
        </Button>
      </div>
    </footer>
  );
};
