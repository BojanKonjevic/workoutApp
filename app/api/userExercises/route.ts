import { NextResponse } from "next/server";
import { db } from "@/db";
import { userExercises } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

const baseExerciseList = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Romanian Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Barbell Curl",
  "Incline Bench Press",
  "SkullCrusher",
];

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const idParam = url.searchParams.get("id");
    const id = parseInt(idParam || "");

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid or missing exercise id" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(userExercises)
      .where(and(eq(userExercises.id, id), eq(userExercises.userId, userId)));

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    await db
      .delete(userExercises)
      .where(and(eq(userExercises.id, id), eq(userExercises.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

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
    exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      highestWeight: ex.highestWeight,
    }))
  );
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return NextResponse.json(
        { error: "Invalid exercise name" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(userExercises)
      .where(
        and(
          eq(userExercises.userId, userId),
          eq(userExercises.name, trimmedName)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Exercise already exists" },
        { status: 409 }
      );
    }

    const nowDateString = new Date().toISOString().slice(0, 10);

    const [insertedExercise] = await db
      .insert(userExercises)
      .values({
        userId,
        name: trimmedName,
        highestWeight: "0.00",
        firstPrDate: nowDateString,
        lastPrDate: nowDateString,
      })
      .returning({ id: userExercises.id, name: userExercises.name });

    return NextResponse.json({ success: true, exercise: insertedExercise });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
