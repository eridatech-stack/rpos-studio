import { NextResponse } from "next/server";
import { generateAndAttachFeaturedImage } from "@/services/featuredImageService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.articleId) {
      return NextResponse.json(
        {
          error: "articleId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const image = await generateAndAttachFeaturedImage(body.articleId);

    return NextResponse.json({
      success: true,
      image,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate featured image.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
