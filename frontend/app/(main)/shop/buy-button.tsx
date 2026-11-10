"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const ACTIONS = {
  refill: { call: api.refillHearts, done: "Hearts refilled!" },
  freeze: { call: api.buyFreeze, done: "Streak freeze equipped ❄️" },
};

export const BuyButton = ({ item, disabled, cost }: { item: keyof typeof ACTIONS; disabled: boolean; cost: number }) => {
  const router = useRouter();
  const buy = () =>
    ACTIONS[item]
      .call()
      .then(() => (toast.success(ACTIONS[item].done), router.refresh()))
      .catch((e: Error) => toast.error(e.message));
  return (
    <Button variant="super" disabled={disabled} onClick={buy} className="shrink-0">
      💎 {cost}
    </Button>
  );
};
