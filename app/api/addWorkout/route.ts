import { NextResponse } from "next/server";
import { db } from "@/db";
import { workouts, exercises } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { date, type, exercises: exerciseData } = body;

    const [workout] = await db
      .insert(workouts)
      .values({
        userId,
        date,
        type,
      })
      .returning();

    if (exerciseData && Array.isArray(exerciseData)) {
      await db.insert(exercises).values(
        exerciseData.map((ex: any) => ({
          workoutId: workout.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          topWeight: ex.topWeight,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
