import { NextResponse } from "next/server";
import { db } from "@/db";
import { userExercises } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

const baseExerciseList = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-Up",
  "Barbell Curl",
  "Incline Bench Press",
  "SkullCrusher",
];

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingExercises = await db
    .select()
    .from(userExercises)
    .where(eq(userExercises.userId, userId));

  if (existingExercises.length === 0) {
    const nowDateString = new Date().toISOString().slice(0, 10);

    await db.insert(userExercises).values(
      baseExerciseList.map((name) => ({
        userId,
        name,
        highestWeight: "0.00",
        firstPrDate: nowDateString,
        lastPrDate: nowDateString,
      }))
    );
  }

  const exercises = await db
    .select()
    .from(userExercises)
    .where(eq(userExercises.userId, userId));

  return NextResponse.json(
    exercises.map((ex) => ({ id: ex.id, name: ex.name }))
  );
}
