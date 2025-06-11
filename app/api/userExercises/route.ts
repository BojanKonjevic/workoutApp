import { NextResponse } from "next/server";
import { db } from "@/db";
import { userExercises } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exercises = await db
    .select()
    .from(userExercises)
    .where(eq(userExercises.userId, userId));

  return NextResponse.json(
    exercises.map((ex) => ({ id: ex.id, name: ex.name }))
  );
}
