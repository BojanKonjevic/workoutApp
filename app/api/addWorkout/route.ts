import { NextResponse } from "next/server";
import { db } from "@/db";
import { workouts, exercises, userExercises, prs } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

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

    if (!date || !type || !Array.isArray(exerciseData)) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Insert workout
    const [workout] = await db
      .insert(workouts)
      .values({ userId, date, type })
      .returning();

    // Insert exercises
    await db.insert(exercises).values(
      exerciseData.map((ex: any) => ({
        workoutId: workout.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        topWeight: ex.topWeight,
        date,
      }))
    );

    const names = exerciseData.map((ex: any) => ex.name);
    const existingUserExercises = await db
      .select()
      .from(userExercises)
      .where(
        and(
          eq(userExercises.userId, userId),
          inArray(userExercises.name, names)
        )
      );

    const existingMap = new Map(
      existingUserExercises.map((ex) => [ex.name, ex])
    );

    const newUserExercises = [];
    const newPRs = [];
    const updates = [];

    for (const ex of exerciseData) {
      const topWeight = Number(ex.topWeight);
      const existing = existingMap.get(ex.name);

      if (!existing) {
        newUserExercises.push({
          userId,
          name: ex.name,
          highestWeight: topWeight.toString(),
          firstPrDate: date,
          lastPrDate: date,
        });

        newPRs.push({
          userId,
          exerciseName: ex.name,
          weight: topWeight.toString(),
          date,
        });
      } else {
        const prevWeight = Number(existing.highestWeight);

        if (topWeight > prevWeight) {
          newPRs.push({
            userId,
            exerciseName: ex.name,
            weight: topWeight.toString(),
            date,
          });

          updates.push(
            db
              .update(userExercises)
              .set({
                highestWeight: topWeight.toString(),
                firstPrDate: date,
                lastPrDate: date,
              })
              .where(eq(userExercises.id, existing.id))
          );
        } else if (topWeight === prevWeight) {
          updates.push(
            db
              .update(userExercises)
              .set({ lastPrDate: date })
              .where(eq(userExercises.id, existing.id))
          );
        }
      }
    }

    if (newUserExercises.length > 0) {
      await db.insert(userExercises).values(newUserExercises);
    }

    if (newPRs.length > 0) {
      await db.insert(prs).values(newPRs);
    }

    if (updates.length > 0) {
      await Promise.all(updates);
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
