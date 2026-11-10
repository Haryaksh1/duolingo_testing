import { Quests } from "@/components/quests";
import { api } from "@/lib/api";

const QuestsPage = async () => {
  const me = await api.me();
  return (
    <div className="mx-auto max-w-[600px] space-y-6">
      <div className="flex items-center gap-x-4 rounded-2xl bg-purple-400 p-5 text-white">
        <span className="text-5xl" aria-hidden>🎁</span>
        <div>
          <h1 className="text-2xl font-extrabold">Daily Quests</h1>
          <p className="font-semibold opacity-90">Finish quests to open chests and earn gems. New quests every day.</p>
        </div>
      </div>
      <Quests me={me} full />
    </div>
  );
};

export default QuestsPage;
