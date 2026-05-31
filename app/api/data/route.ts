import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureIndexes } from "@/lib/db/indexes";
import { getUserData, saveUserData } from "@/lib/db/user-data";
import type { AppData } from "@/lib/types";
import { EMPTY_APP_DATA } from "@/lib/types";

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const v = value as AppData;
  return (
    Array.isArray(v.monthlyBudgets) &&
    Array.isArray(v.spendEntries) &&
    Array.isArray(v.goals) &&
    Array.isArray(v.actionCompletions) &&
    Array.isArray(v.todos)
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureIndexes();
    const data = await getUserData(session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/data error:", error);
    return NextResponse.json(
      { error: "Failed to load data." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!isAppData(body)) {
      return NextResponse.json({ error: "Invalid data." }, { status: 400 });
    }

    const data: AppData = { ...EMPTY_APP_DATA, ...body };
    await saveUserData(session.user.id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/data error:", error);
    return NextResponse.json(
      { error: "Failed to save data." },
      { status: 500 },
    );
  }
}
