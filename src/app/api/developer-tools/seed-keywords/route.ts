import { NextResponse } from "next/server";
import { seedApprovedKeywords } from "@/modules/developer-tools/keywordSeeder";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Developer seed tools are disabled in production." },
        { status: 403 }
      );
    }

    const result = await seedApprovedKeywords();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Keyword seeding failed.",
      },
      { status: 500 }
    );
  }
}