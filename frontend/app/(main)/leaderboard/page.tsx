import Image from "next/image";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const LeaderboardPage = async () => {
  const board = await api.leaderboard();
  return (
    <div className="mx-auto max-w-[600px]">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image src="/leaderboard.svg" alt="" height={80} width={80} />
        <h1 className="mt-4 text-2xl font-extrabold">{board.league} League</h1>
        <p className="text-neutral-500">Top 3 advance · {board.days_left} days left this week</p>
      </div>
      {board.rows.map((r) => (
        <div
          key={r.id}
          className={cn(
            "flex items-center gap-x-4 rounded-2xl px-4 py-3",
            r.is_me && "border-2 border-sky-300 bg-sky-100"
          )}
        >
          <span className={cn("w-6 font-extrabold", r.rank <= 3 ? "text-green-500" : "text-neutral-500")}>{r.rank}</span>
          <Image src={r.avatar} alt="" width={44} height={44} className="rounded-full border-2 bg-background" />
          <span className="flex-1 font-bold">{r.display_name}</span>
          <span className="font-bold text-neutral-500">{r.weekly_xp} XP</span>
        </div>
      ))}
    </div>
  );
};

export default LeaderboardPage;
