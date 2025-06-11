import { NextResponse } from "next/server";
import { db } from "@/db";
import { workouts, exercises, userExercises, prs } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

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
          date,
        }))
      );

      for (const ex of exerciseData) {
        const existing = await db
          .select()
          .from(userExercises)
          .where(
            and(
              eq(userExercises.userId, userId),
              eq(userExercises.name, ex.name)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(userExercises).values({
            userId,
            name: ex.name,
            highestWeight: ex.topWeight,
            firstPrDate: date,
            lastPrDate: date,
          });

          await db.insert(prs).values({
            userId,
            exerciseName: ex.name,
            weight: ex.topWeight,
            date,
          });
        } else {
          const userEx = existing[0];

          if (Number(ex.topWeight) > Number(userEx.highestWeight)) {
            await db.insert(prs).values({
              userId,
              exerciseName: ex.name,
              weight: ex.topWeight,
              date,
            });

            await db
              .update(userExercises)
              .set({
                highestWeight: ex.topWeight,
                firstPrDate: date,
                lastPrDate: date,
              })
              .where(eq(userExercises.id, userEx.id));
          } else if (Number(ex.topWeight) === Number(userEx.highestWeight)) {
            await db
              .update(userExercises)
              .set({
                lastPrDate: date,
              })
              .where(eq(userExercises.id, userEx.id));
          }
        }
      }
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
