import ProfileSummary from "./ProfileSummary";
import RecommendationList from "./RecommendationList";

export default function GiftRecommendationMessage({ data }) {
  return (
    <div className="w-full max-w-3xl space-y-6">
      <ProfileSummary profile={data.profile} />

      <RecommendationList
        recommendations={data.recommendations}
      />
    </div>
  );
}