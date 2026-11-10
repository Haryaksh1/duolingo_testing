"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export const ServerDown = ({ message }: { message?: string }) => {
  const router = useRouter();
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-y-4 p-6 text-center">
      <Image src="/mascot_sad.svg" alt="" width={100} height={100} />
      <h1 className="text-2xl font-extrabold text-neutral-700">
        We can&apos;t reach the server
      </h1>
      <p className="max-w-sm text-neutral-500">
        {message ??
          "The Lingo API isn't responding. If it's a free-tier host it may be waking up — give it a few seconds."}
      </p>
      <Button variant="secondary" size="lg" onClick={() => router.refresh()}>
        Try again
      </Button>
    </div>
  );
};
