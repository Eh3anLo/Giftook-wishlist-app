import RecommendationCard from "./RecommendationCard";
import EmptyRecommendation from "./EmptyRecommendation";

export default function RecommendationList({
  recommendations,
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">
        🎁 پیشنهادهای هوش مصنوعی
      </h2>

      {!recommendations?.length ? (
        <EmptyRecommendation />
      ) : (
        <div className="grid gap-4">
          {recommendations.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}