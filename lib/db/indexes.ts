import { getDb } from "@/lib/mongodb";

let ensured = false;

export async function ensureIndexes() {
  if (ensured) return;
  const db = await getDb();
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("user_data").createIndex({ userId: 1 }, { unique: true });
  ensured = true;
}
