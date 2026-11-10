import Image from "next/image";
import Link from "next/link";

import { FlameIcon, GemIcon } from "@/components/icons";
import type { Me } from "@/lib/api";
import { cn } from "@/lib/utils";

const Stat = ({
  href,
  title,
  className,
  children,
}: {
  href: string;
  title: string;
  className: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    title={title}
    className={cn(
      "flex items-center gap-x-2 rounded-xl px-3 py-2 text-base font-extrabold transition hover:bg-neutral-100",
      className
    )}
  >
    {children}
  </Link>
);

export const UserProgress = ({ me }: { me: Me }) => (
  <div className="flex w-full items-center justify-between gap-x-1">
    <Stat href="/settings" title={me.course.title} className="text-neutral-500">
      <Image
        src={me.course.flag}
        alt={me.course.title}
        className="rounded-md"
        width={32}
        height={24}
      />
    </Stat>

    <Stat
      href="/profile"
      title={`${me.streak} day streak`}
      className={me.streak_extended_today ? "text-orange-500" : "text-neutral-400"}
    >
      <FlameIcon muted={!me.streak_extended_today} />
      {me.streak}
    </Stat>

    <Stat href="/shop" title={`${me.gems} gems`} className="text-sky-400">
      <GemIcon />
      {me.gems}
    </Stat>

    <Stat href="/shop" title={`${me.hearts} hearts`} className="text-rose-500">
      <Image src="/heart.svg" height={24} width={24} alt="Hearts" />
      {me.hearts}
    </Stat>
  </div>
);
