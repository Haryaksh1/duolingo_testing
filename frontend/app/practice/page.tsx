import { LessonPlayer } from "../lesson/player";

// key: client navigation from a lesson can otherwise reuse that player instance and its state.
const PracticePage = () => <LessonPlayer key="practice" />;

export default PracticePage;
