"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function PromptInput({
  value,
  onChange,
  onSubmit,
  loading = false,
}) {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`مثال:

برای برادرم هدیه می‌خواهم.
۲۶ سالشه.
برنامه‌نویسه.
گیمره.
قهوه تخصصی دوست داره.
بارسلونا رو خیلی دوست داره.
بودجه من حدود ۶ میلیون تومنه.
هدیه کاربردی می‌خوام.`}
          className="min-h-56 resize-none text-base"
        />

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Generating..." : "✨ Generate Gift Ideas"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}