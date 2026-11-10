import { api } from "@/lib/api";

import { LearningPath } from "./learning-path";

const LearnPage = async () => {
  const { units } = await api.path();
  return <LearningPath units={units} />;
};

export default LearnPage;
