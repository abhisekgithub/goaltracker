import { getDb } from "@/lib/mongodb";
import type { AppData } from "@/lib/types";
import { EMPTY_APP_DATA } from "@/lib/types";

type UserDataDoc = {
  userId: string;
  data: AppData;
  updatedAt: Date;
};

const COLLECTION = "user_data";

export async function getUserData(userId: string): Promise<AppData> {
  const db = await getDb();
  const doc = await db
    .collection<UserDataDoc>(COLLECTION)
    .findOne({ userId });

  if (!doc?.data) return { ...EMPTY_APP_DATA };
  return { ...EMPTY_APP_DATA, ...doc.data };
}

export async function saveUserData(userId: string, data: AppData) {
  const db = await getDb();
  await db.collection<UserDataDoc>(COLLECTION).updateOne(
    { userId },
    {
      $set: {
        userId,
        data,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}
