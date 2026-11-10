"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api, type LeagueResult } from "@/lib/api";

import { LeagueBadge } from "./league-badge";

/** End-of-week popup: shown once per finished week, then marked seen. */
export const LeagueResultModal = ({ result, tiers }: { result: LeagueResult; tiers: string[] }) => {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const close = () => {
    setOpen(false);
    void api.leaderboardSeen().then(() => router.refresh());
  };

  const title =
    result.result === "promoted"
      ? `You've been promoted to the ${result.to_league} League!`
      : result.result === "demoted"
        ? `You dropped to the ${result.to_league} League`
        : `You stayed in the ${result.to_league} League`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md text-center">
        <div className="mx-auto">
          <LeagueBadge tier={tiers.indexOf(result.to_league)} size={96} />
        </div>
        <DialogTitle className="text-2xl font-extrabold">{title}</DialogTitle>
        <DialogDescription className="text-base">
          You finished #{result.rank} in last week&apos;s {result.from_league} League.
          {result.gems > 0 && ` Top 3 finish: +${result.gems} gems!`}
        </DialogDescription>
        <Button variant="secondary" size="lg" className="mt-2 w-full" onClick={close}>
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
};
