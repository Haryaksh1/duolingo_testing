import { api } from "@/lib/api";

import { LearningPath } from "./learning-path";
import { StreakBanner } from "./streak-banner";

const LearnPage = async () => {
  const [{ units }, me] = await Promise.all([api.path(), api.me()]);
  const next = units.flatMap((u) => u.skills).find((s) => s.state === "active")?.next_lesson_id;
  return (
    <>
      <StreakBanner me={me} lessonId={next} />
      <LearningPath units={units} />
    </>
  );
};

export default LearnPage;
