import { NextResponse } from "next/server";
import { eq, and, not } from "drizzle-orm";
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
  const workoutId = Number(idParam);

  if (isNaN(workoutId)) {
    return NextResponse.json({ error: "Invalid workout ID" }, { status: 400 });
  }

  // Verify workout exists and belongs to user
  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, workoutId),
  });

  if (!workout || workout.userId !== userId) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  // Fetch all exercises linked to this workout
  const workoutExercises = await db.query.exercises.findMany({
    where: eq(exercises.workoutId, workoutId),
  });
  const exerciseNames = [...new Set(workoutExercises.map((e) => e.name))];

  // Delete exercises from this workout
  await db.delete(exercises).where(eq(exercises.workoutId, workoutId));

  // Process each exerciseName related to this workout
  await Promise.all(
    exerciseNames.map(async (exerciseName) => {
      // Check if this exercise exists in other workouts for this user
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
        // No other workouts have this exercise, delete PRs and userExercises
        await Promise.all([
          db
            .delete(prs)
            .where(
              and(eq(prs.userId, userId), eq(prs.exerciseName, exerciseName))
            ),
          db
            .delete(userExercises)
            .where(
              and(
                eq(userExercises.userId, userId),
                eq(userExercises.name, exerciseName)
              )
            ),
        ]);
      } else {
        // There are other exercises, recalculate PRs

        // Delete existing PRs for this exercise and user
        await db
          .delete(prs)
          .where(
            and(eq(prs.userId, userId), eq(prs.exerciseName, exerciseName))
          );

        // Group exercises by date and find max topWeight per date
        const prsByDate = new Map<string, number>();

        for (const row of otherExercises) {
          const dateStr = row.exercises.date.toString().slice(0, 10); // YYYY-MM-DD
          const weight = parseFloat(row.exercises.topWeight.toString());

          if (!prsByDate.has(dateStr) || prsByDate.get(dateStr)! < weight) {
            prsByDate.set(dateStr, weight);
          }
        }

        // Insert recalculated PRs
        const newPRs = Array.from(prsByDate.entries()).map(
          ([dateStr, weight]) => ({
            userId,
            exerciseName,
            weight: weight.toFixed(2),
            date: dateStr,
          })
        );

        if (newPRs.length > 0) {
          await db.insert(prs).values(newPRs);
        }

        // Update userExercises highestWeight to max PR weight
        const maxWeight = Math.max(...Array.from(prsByDate.values()));

        await db
          .update(userExercises)
          .set({ highestWeight: maxWeight.toFixed(2) })
          .where(
            and(
              eq(userExercises.userId, userId),
              eq(userExercises.name, exerciseName)
            )
          );
      }
    })
  );

  // Finally delete the workout itself
  await db.delete(workouts).where(eq(workouts.id, workoutId));

  return NextResponse.json({ success: true });
}
