import { NextResponse } from "next/server";
import { seedFeaturedImagePrompt } from "@/modules/developer-tools/promptSeeder";

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

    const result = await seedFeaturedImagePrompt();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Featured image prompt seeding failed.",
      },
      {
        status: 500,
      }
    );
  }
}
