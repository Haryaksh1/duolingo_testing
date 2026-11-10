import { LessonPlayer } from "../player";

// key: client navigation from a lesson can otherwise reuse that player instance and its state.
const ReviewPage = () => <LessonPlayer key="review" mode="review" />;

export default ReviewPage;
