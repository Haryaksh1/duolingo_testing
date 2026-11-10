"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const RefillButton = ({ disabled, cost }: { disabled: boolean; cost: number }) => {
  const router = useRouter();
  const refill = () =>
    api
      .refillHearts()
      .then(() => (toast.success("Hearts refilled!"), router.refresh()))
      .catch((e: Error) => toast.error(e.message));
  return (
    <Button variant="super" disabled={disabled} onClick={refill}>
      💎 {cost}
    </Button>
  );
};
