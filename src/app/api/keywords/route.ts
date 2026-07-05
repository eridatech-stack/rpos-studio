import { NextResponse } from "next/server";
import { getKeywords } from "@/repositories/keywordRepository";

export async function GET() {
  const rows = await getKeywords();
  return NextResponse.json(rows);
}
