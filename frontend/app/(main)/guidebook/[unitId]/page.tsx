import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SpeakerButton } from "@/components/speaker-button";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";

const BANNER = { green: "bg-green-500", blue: "bg-sky-400", purple: "bg-purple-400" } as const;

const Row = ({ es, en }: { es: string; en: string }) => (
  <li className="flex items-center gap-x-3 rounded-2xl border-2 p-3">
    <SpeakerButton text={es} lang="es" />
    <div className="min-w-0">
      <p className="font-bold">{es}</p>
      <p className="text-sm text-neutral-500">{en}</p>
    </div>
  </li>
);

const GuidebookPage = async ({ params }: { params: Promise<{ unitId: string }> }) => {
  const unitId = Number((await params).unitId);
  const book = await api.guidebook(unitId).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });

  return (
    <div className="mx-auto max-w-[600px] space-y-6">
      <Link href="/learn" className="inline-flex items-center gap-x-2 font-extrabold uppercase text-neutral-500 hover:text-neutral-700">
        <ArrowLeft className="h-5 w-5" /> Back
      </Link>
      <div className={cn("rounded-2xl p-5 text-white", BANNER[book.color])}>
        <p className="text-sm font-extrabold uppercase opacity-80">{book.title} guidebook</p>
        <h1 className="text-2xl font-extrabold">{book.description}</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Key phrases</h2>
        <ul className="space-y-2">
          {book.phrases.map((p) => (
            <Row key={p.es} {...p} />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Words</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {book.words.map((w) => (
            <Row key={w.es} {...w} />
          ))}
        </ul>
      </section>
    </div>
  );
};

export default GuidebookPage;
