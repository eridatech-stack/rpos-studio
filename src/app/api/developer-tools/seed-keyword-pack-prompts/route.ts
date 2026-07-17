import { NextResponse } from "next/server";
import { seedKeywordPackPrompts } from "@/modules/developer-tools/promptSeeder";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error: "Developer seed tools are disabled in production.",
        },
        {
          status: 403,
        }
      );
    }

    const results = await seedKeywordPackPrompts();
    const inserted = results.reduce((total, item) => total + item.inserted, 0);
    const updated = results.reduce((total, item) => total + item.updated, 0);

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      prompts: results,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Keyword pack prompt seeding failed.",
      },
      {
        status: 500,
      }
    );
  }
}
