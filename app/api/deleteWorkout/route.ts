import { NextResponse } from "next/server";
import { eq, and, inArray, not, sql } from "drizzle-orm";
import { db } from "@/db";
import { workouts, exercises, userExercises, prs } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const idParam = url.searchParams.get("id");
  const workoutId = parseInt(idParam || "", 10);

  if (isNaN(workoutId)) {
    return NextResponse.json({ error: "Invalid workout ID" }, { status: 400 });
  }

  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, workoutId),
  });

  if (!workout || workout.userId !== userId) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  // Step 1: Fetch exercises linked to workout
  const workoutExercises = await db.query.exercises.findMany({
    where: eq(exercises.workoutId, workoutId),
  });

  const exerciseNames = workoutExercises.map((e) => e.name);

  // Step 2: Delete exercises from this workout
  await db.delete(exercises).where(eq(exercises.workoutId, workoutId));

  // Step 3: For each exerciseName, check if it exists in any other workout for this user
  for (const exerciseName of exerciseNames) {
    // Check if other exercises with this name exist in other workouts for the user
    for (const exerciseName of exerciseNames) {
      // Find if exercise exists in other workouts for the user
      const otherExercises = await db
        .select()
        .from(exercises)
        .innerJoin(workouts, eq(exercises.workoutId, workouts.id))
        .where(
          and(
            eq(exercises.name, exerciseName),
            not(eq(exercises.workoutId, workoutId)),
            eq(workouts.userId, userId)
          )
        );

      if (otherExercises.length === 0) {
        // No other workouts have this exercise, delete prs and userExercises
        await db
          .delete(prs)
          .where(
            and(eq(prs.userId, userId), eq(prs.exerciseName, exerciseName))
          );

        await db
          .delete(userExercises)
          .where(
            and(
              eq(userExercises.userId, userId),
              eq(userExercises.name, exerciseName)
            )
          );
      } else {
        // There are other exercises, find max weight from them
        // Use the correct weight column name here (e.g., ex.weight)
        await db
          .delete(prs)
          .where(
            and(eq(prs.userId, userId), eq(prs.exerciseName, exerciseName))
          );

        // Recalculate PRs from remaining exercises for this user and exercise

        // Fetch all remaining exercises for this user & exercise
        const remainingExercises = await db
          .select()
          .from(exercises)
          .innerJoin(workouts, eq(exercises.workoutId, workouts.id))
          .where(
            and(eq(exercises.name, exerciseName), eq(workouts.userId, userId))
          );

        // Group by date and find max topWeight per date
        const prsByDate = new Map<string, number>();

        for (const row of remainingExercises) {
          const dateStr = row.exercises.date.toString().slice(0, 10); // YYYY-MM-DD
          const weight = parseFloat(row.exercises.topWeight.toString());

          if (!prsByDate.has(dateStr) || prsByDate.get(dateStr)! < weight) {
            prsByDate.set(dateStr, weight);
          }
        }

        // Insert recalculated PRs
        for (const [dateStr, weight] of prsByDate) {
          await db.insert(prs).values({
            userId,
            exerciseName,
            weight: weight.toFixed(2),
            date: dateStr,
          });
        }
        const maxWeight = Math.max(...Array.from(prsByDate.values()));

        // Update userExercises highest weight to maxWeight
        await db
          .update(userExercises)
          .set({ highestWeight: maxWeight.toFixed(2) })
          .where(
            and(
              eq(userExercises.userId, userId),
              eq(userExercises.name, exerciseName)
            )
          );
        // Optionally, update PRs if you store only the max PR, or delete invalid PRs here as well
        // For simplicity, you can delete all PRs for that exercise and recreate them from remaining workouts,
        // or just keep PRs and handle them in a separate process.
      }
    }
  }

  // Step 4: Delete the workout itself
  await db.delete(workouts).where(eq(workouts.id, workoutId));

  return NextResponse.json({ success: true });
}
