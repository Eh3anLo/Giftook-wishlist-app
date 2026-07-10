import { NextResponse } from "next/server";
import { openrouter } from "@/lib/openrouter";

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const completion = await openrouter.chat.completions.create({
      model: "tencent/hy3:free",
      messages,
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("OpenRouter Error:", error);

    return NextResponse.json(
      {
        error: "Failed to get AI response",
      },
      {
        status: 500,
      }
    );
  }
}