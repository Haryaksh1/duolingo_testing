import Image from "next/image";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import { LeagueBadge } from "./league-badge";
import { LeagueResultModal } from "./result-modal";

const MEDAL = ["🥇", "🥈", "🥉"];

const ZoneLine = ({ kind }: { kind: "promotion" | "demotion" }) => (
  <div
    className={cn(
      "my-2 flex items-center gap-x-3 text-xs font-extrabold uppercase tracking-wider",
      kind === "promotion" ? "text-green-500" : "text-rose-500"
    )}
  >
    <span className="h-0.5 flex-1 bg-current opacity-40" />
    {kind === "promotion" ? "▲ Promotion zone" : "▼ Demotion zone"}
    <span className="h-0.5 flex-1 bg-current opacity-40" />
  </div>
);

const LeaderboardPage = async () => {
  const board = await api.leaderboard();
  const demoteFrom = board.demote ? board.rows.length - board.demote + 1 : Infinity;

  return (
    <div className="mx-auto max-w-[600px]">
      {board.result && <LeagueResultModal result={board.result} tiers={board.tiers} />}

      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 w-full overflow-x-auto pb-1 [scrollbar-width:none]">
          <div className="mx-auto flex w-max items-end gap-x-1.5 px-2">
            {board.tiers.map((name, i) => (
              <LeagueBadge key={name} tier={i} size={i === board.tier ? 60 : 30} locked={i > board.tier} />
            ))}
          </div>
        </div>
        <h1 className="text-2xl font-extrabold">{board.league} League</h1>
        <p className="font-semibold text-neutral-500">
          {board.promote
            ? `Top ${board.promote} advance to the next league`
            : "You're in the top league!"}
        </p>
        <p className="mt-1 text-sm font-extrabold text-amber-500">
          {board.days_left === 0 ? "Ends today" : `${board.days_left} day${board.days_left === 1 ? "" : "s"} left`}
        </p>
      </div>

      <div className="border-t-2 pt-2">
        {board.rows.map((r) => (
          <div key={r.id}>
            {r.rank === demoteFrom && <ZoneLine kind="demotion" />}
            <div
              className={cn(
                "flex items-center gap-x-4 rounded-2xl px-4 py-2.5",
                r.is_me && "bg-sky-100"
              )}
            >
              <span className={cn("w-7 text-center font-extrabold", r.rank <= 3 ? "text-2xl" : "text-neutral-500")}>
                {r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}
              </span>
              <Image
                src={r.avatar}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-full border-2 bg-white object-contain p-0.5"
              />
              <span className={cn("flex-1 truncate font-bold", r.is_me && "text-sky-500")}>{r.display_name}</span>
              <span className="shrink-0 font-bold text-neutral-500">{r.weekly_xp} XP</span>
            </div>
            {r.rank === board.promote && <ZoneLine kind="promotion" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardPage;
