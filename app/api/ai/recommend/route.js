// import { NextResponse } from "next/server";
// import { ai } from "@/lib/ai-client";
// // import { openrouter } from "@/lib/openrouter";

// export async function POST(req) {
//   try {
//     const { messages } = await req.json();

//     const completion = await openrouter.chat.completions.create({
//       model: "tencent/hy3:free",
//       messages,
//     });

//     return NextResponse.json({
//       message: completion.choices[0].message.content,
//     });
//   } catch (error) {
//     console.error("OpenRouter Error:", error);

//     return NextResponse.json(
//       {
//         error: "Failed to get AI response",
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }

// export async function POST(request) {
//   const { description } = await request.json();

//   if (!description?.trim()) {
//     return NextResponse.json(
//       {
//         message: "Description is required.",
//       },
//       {
//         status: 400,
//       }
//     );
//   }

//   return NextResponse.json({
//     profile: {
//       relationship: "Brother",
//       age: 26,
//       budget: "6,000,000 تومان",
//       interests: [
//         "Programming",
//         "Gaming",
//         "Coffee",
//       ],
//     },

//     recommendations: [
//       {
//         id: 1,
//         title: "Mechanical Keyboard",
//         reason:
//           "علاقه‌مند به برنامه‌نویسی است و این هدیه کاربردی خواهد بود.",
//         estimatedPrice: "5,500,000 تومان",
//         confidence: 98,
//       },
//       {
//         id: 2,
//         title: "Coffee Brewing Kit",
//         reason:
//           "با توجه به علاقه به قهوه، انتخاب مناسبی است.",
//         estimatedPrice: "2,500,000 تومان",
//         confidence: 92,
//       },
//     ],
//   });
// }

// import { NextResponse } from "next/server";

// export async function POST(request) {
//   const { messages } = await request.json();

//   const lastMessage =
//     messages[messages.length - 1];

//   return NextResponse.json({
//   "id":"assistant-1",
//   "role":"assistant",
//   "type":"gift_recommendations",
//   "data":{
//     "profile":{
//       "relationship":"Brother",
//       "estimatedAge":26,
//       "budget":{
//         "value":6000000,
//         "currency":"IRR"
//       },
//       "personality":[
//         "Analytical"
//       ],
//       "interests":[
//         "Programming",
//         "Coffee",
//         "Gaming"
//       ],
//       "occasion":"Birthday"
//     },
//     "recommendations":[
//       {
//         "id":"gift-1",
//         "title":"Keychron K8 Pro",
//         "category":"Technology",
//         "reason":"برای یک برنامه‌نویس بسیار کاربردی است.",
//         "confidence":96,
//         "estimatedPrice":{
//           "value":5500000,
//           "currency":"IRR"
//         },
//         "searchKeywords":[
//           "Keychron K8 Pro",
//           "Mechanical Keyboard"
//         ]
//       }
//     ]
//   }
// });
// }

import { NextResponse } from "next/server"

import { ai } from "@/lib/ai-client"
import { giftPrompt } from "@/lib/prompts/gift-recommendation"
import { extractJson } from "@/lib/extract-json"
import { ZodError } from "zod"
import { validateAIResponse } from "@/lib/validate-ai-response"
export async function POST(req) {
  try {
    const { messages } = await req.json()

    const completion = await ai.chat.completions.create({
      model: "tencent/hy3:free",

      temperature: 0.4,

      max_tokens: 1200,

      messages: [
        {
          role: "system",
          content: giftPrompt,
        },
        ...messages,
      ],
    })

    const aiText = completion.choices[0].message
    
    console.log(aiText)

    // const jsonText = extractJson(aiText)

    let parsed

    try {
      // const parsed = validateAIResponse(JSON.parse(jsonText))
      return NextResponse.json({
        data: aiText
      })
    } catch (error) {
      if (error instanceof ZodError) {
        console.log(error.issues)

        return NextResponse.json(
          {
            error: "Invalid AI response",
            issues: error.issues,
          },
          {
            status: 500,
          }
        )
      }
    }

    // if (parsed.type === "question") {
    //   return NextResponse.json({
    //     id: crypto.randomUUID(),
    //     role: "assistant",
    //     type: "text",
    //     content: parsed.question,
    //   })
    // }

    // if (parsed.type === "recommendation") {
    //   return NextResponse.json({
    //     id: crypto.randomUUID(),
    //     role: "assistant",
    //     type: "gift_recommendations",
    //     data: {
    //       profile: parsed.profile,
    //       recommendations: parsed.recommendations,
    //     },
    //   })
    // }

    return NextResponse.json(
      {
        error: "Unknown response type",
      },
      {
        status: 500,
      }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    )
  }
}
