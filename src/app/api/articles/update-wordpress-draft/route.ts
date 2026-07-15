import { NextResponse } from "next/server";
import { updateWordPressDraft } from "@/services/wordpressService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json(
        { error: "articleId is required." },
        { status: 400 }
      );
    }

    const result = await updateWordPressDraft(body.articleId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message || "Unable to update the WordPress draft.",
      },
      { status: 500 }
    );
  }
}
