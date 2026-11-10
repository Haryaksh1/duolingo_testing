import Image from "next/image";

import { api } from "@/lib/api";

import { RefillButton } from "./refill-button";

const ShopPage = async () => {
  const me = await api.me();
  return (
    <div className="mx-auto max-w-[600px] space-y-4">
      <h1 className="text-3xl font-extrabold">Shop</h1>
      <div className="flex items-center gap-x-4 rounded-2xl border-2 p-4">
        <Image src="/heart.svg" alt="" height={56} width={56} />
        <div className="flex-1">
          <p className="text-lg font-extrabold">Refill hearts</p>
          <p className="text-neutral-500">{me.hearts} / {me.max_hearts} hearts · you have {me.gems} gems</p>
        </div>
        <RefillButton disabled={me.hearts >= me.max_hearts || me.gems < me.refill_cost} cost={me.refill_cost} />
      </div>
      <div className="flex items-center gap-x-4 rounded-2xl border-2 p-4 opacity-60">
        <Image src="/unlimited.svg" alt="" height={56} width={56} />
        <p className="flex-1 text-lg font-extrabold">Unlimited hearts</p>
        <span className="font-bold uppercase text-neutral-400">Coming soon</span>
      </div>
    </div>
  );
};

export default ShopPage;
