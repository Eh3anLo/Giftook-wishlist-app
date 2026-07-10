import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function RecommendationCard({ item }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{item.title}</h3>

          <Badge>{item.confidence}%</Badge>
        </div>

        <p className="text-muted-foreground">{item.reason}</p>

        <div className="text-sm font-medium">
          💰 {item.estimatedPrice.value.toLocaleString("fa-IR")} تومان{" "}
        </div>
      </CardContent>
    </Card>
  )
}
