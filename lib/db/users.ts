import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type DbUser = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
};

const COLLECTION = "users";

export async function findUserByEmail(email: string) {
  const db = await getDb();
  return db.collection<DbUser>(COLLECTION).findOne({
    email: email.toLowerCase().trim(),
  });
}

export async function findUserById(id: string) {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;
  return db.collection<DbUser>(COLLECTION).findOne({ _id: new ObjectId(id) });
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  const db = await getDb();
  const doc: Omit<DbUser, "_id"> = {
    email: input.email.toLowerCase().trim(),
    name: input.name.trim(),
    passwordHash: input.passwordHash,
    createdAt: new Date(),
  };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return { ...doc, _id: result.insertedId };
}
