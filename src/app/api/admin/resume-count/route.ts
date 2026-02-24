import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/d1";
import { count } from "drizzle-orm";
import { createD1HttpClient } from "@/db/d1-http";
import { resumes } from "@/db/schema";
import { checkIsAdmin } from "@/lib/admin";

export async function GET() {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = drizzle(createD1HttpClient() as any);
  const result = await db.select({ count: count() }).from(resumes);

  return NextResponse.json({ count: result[0]?.count ?? 0 });
}
