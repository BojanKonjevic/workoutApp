import { db } from "@/db";
import { workouts, exercises } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json([]);

    const userWorkouts = await db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.date));

    const workoutIds = userWorkouts.map((w) => w.id);

    const relatedExercises = await db
      .select()
      .from(exercises)
      .where(inArray(exercises.workoutId, workoutIds));

    const workoutsWithExercises = userWorkouts.map((workout) => ({
      ...workout,
      exercises: relatedExercises.filter((ex) => ex.workoutId === workout.id),
    }));

    return NextResponse.json(workoutsWithExercises);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
