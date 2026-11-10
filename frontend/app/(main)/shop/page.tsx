import Image from "next/image";

import { api } from "@/lib/api";

import { BuyButton } from "./buy-button";

const Item = ({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-x-4 rounded-2xl border-2 p-4">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center text-4xl">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-lg font-extrabold">{title}</p>
      <p className="text-sm text-neutral-500">{text}</p>
    </div>
    {children}
  </div>
);

const ShopPage = async () => {
  const me = await api.me();
  return (
    <div className="mx-auto max-w-[600px] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Shop</h1>
        <span className="font-extrabold text-sky-400">💎 {me.gems}</span>
      </div>

      <Item
        icon={<Image src="/heart.svg" alt="" height={56} width={56} />}
        title="Refill hearts"
        text={`${me.hearts} / ${me.max_hearts} hearts. Get full hearts so you can worry less about mistakes.`}
      >
        <BuyButton item="refill" cost={me.refill_cost} disabled={me.hearts >= me.max_hearts || me.gems < me.refill_cost} />
      </Item>

      <Item
        icon="❄️"
        title="Streak Freeze"
        text={`${me.streak_freezes} / ${me.max_freezes} equipped. Covers a missed day automatically so your streak survives.`}
      >
        <BuyButton
          item="freeze"
          cost={me.freeze_cost}
          disabled={me.streak_freezes >= me.max_freezes || me.gems < me.freeze_cost}
        />
      </Item>

      <div className="opacity-60">
        <Item icon={<Image src="/unlimited.svg" alt="" height={56} width={56} />} title="Unlimited hearts" text="Part of Super.">
          <span className="shrink-0 text-sm font-bold uppercase text-neutral-500">Coming soon</span>
        </Item>
      </div>
    </div>
  );
};

export default ShopPage;
