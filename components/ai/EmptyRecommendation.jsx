import { Card, CardContent } from "@/components/ui/card";

export default function EmptyRecommendation() {
  return (
    <Card>
      <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
        هنوز پیشنهادی تولید نشده است.
      </CardContent>
    </Card>
  );
}