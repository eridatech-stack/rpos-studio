import { NextResponse } from "next/server";
import { getArticles } from "@/repositories/articleRepository";

export async function GET() {
  const rows = await getArticles();
  return NextResponse.json(rows);
}
