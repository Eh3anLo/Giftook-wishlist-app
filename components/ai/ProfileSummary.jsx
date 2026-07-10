import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default function ProfileSummary({ profile }) {
  if (!profile) return null

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <h2 className="text-xl font-semibold">👤 تحلیل شخصیت</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">رابطه</p>

            <p className="font-medium">{profile.relationship}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">سن</p>

            <p className="font-medium">{profile.age}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">بودجه</p>

            <p className="font-medium">
              {profile.budget.value.toLocaleString("fa-IR")} تومان
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.interests.map((interest) => (
            <Badge key={interest}>{interest}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
