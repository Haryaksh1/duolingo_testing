"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api, type Quest } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Quest reward chest: locked until the quest is done, then one tap opens it for gems. */
export const ClaimChest = ({ quest }: { quest: Quest }) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ready = quest.progress >= quest.target && !quest.claimed;

  const open = () =>
    startTransition(async () => {
      try {
        await api.claimQuest(quest.id);
        toast.success(`Chest opened: +${quest.reward} gems 💎`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });

  return (
    <button
      type="button"
      onClick={open}
      disabled={!ready || pending}
      aria-label={quest.claimed ? "Chest opened" : ready ? `Open chest for ${quest.reward} gems` : "Chest locked"}
      title={quest.claimed ? `Opened: +${quest.reward} gems` : `${quest.reward} gems`}
      className={cn(
        "flex shrink-0 justify-center text-3xl leading-none transition",
        ready && "animate-bounce hover:scale-110",
        !ready && !quest.claimed && "opacity-40 grayscale",
        quest.claimed && "opacity-60"
      )}
    >
      {quest.claimed ? "📭" : "🎁"}
    </button>
  );
};
