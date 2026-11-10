import { Quests } from "@/components/quests";
import { api } from "@/lib/api";

const QuestsPage = async () => {
  const me = await api.me();
  return (
    <div className="mx-auto max-w-[600px] space-y-6">
      <h1 className="text-3xl font-extrabold">Daily Quests</h1>
      <Quests me={me} full />
    </div>
  );
};

export default QuestsPage;
