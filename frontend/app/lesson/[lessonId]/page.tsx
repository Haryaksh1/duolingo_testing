import { notFound } from "next/navigation";

import { LessonPlayer } from "../player";

const LessonPage = async ({ params }: { params: Promise<{ lessonId: string }> }) => {
  const lessonId = Number((await params).lessonId);
  if (!Number.isInteger(lessonId)) notFound();
  return <LessonPlayer key={lessonId} lessonId={lessonId} />;
};

export default LessonPage;
