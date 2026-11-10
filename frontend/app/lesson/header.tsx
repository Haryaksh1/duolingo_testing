import { X } from "lucide-react";
import Image from "next/image";

import { Progress } from "@/components/ui/progress";
import { useExitModal } from "@/store/use-exit-modal";

type HeaderProps = { hearts: number | null; percentage: number };

export const Header = ({ hearts, percentage }: HeaderProps) => {
  const { open } = useExitModal();

  return (
    <header className="mx-auto flex w-full max-w-[1000px] items-center gap-x-5 px-6 pt-6 lg:px-10 lg:pt-12">
      <button type="button" onClick={open} aria-label="Quit lesson">
        <X className="h-7 w-7 text-neutral-400 transition hover:text-neutral-500" />
      </button>

      <Progress value={percentage} className="h-4" />

      {hearts === null ? (
        <span className="text-sm font-extrabold uppercase text-sky-400">Practice</span>
      ) : (
        <div key={hearts} className="flex animate-pop items-center gap-x-2 text-lg font-extrabold text-rose-500">
          <Image src="/heart.svg" height={28} width={28} alt="Hearts" />
          {hearts}
        </div>
      )}
    </header>
  );
};
