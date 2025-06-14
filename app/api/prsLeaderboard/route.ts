import { db } from "@/db";
import { and, sql, eq, inArray } from "drizzle-orm";
import { prs } from "@/db/schema";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

const basicExercises = [
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

export async function GET() {
  try {
    const leaderboardPromises = basicExercises.map(async (exerciseName) => {
      const maxWeights = await db
        .select({
          userId: prs.userId,
          maxWeight: sql`MAX(${prs.weight})`.as("maxWeight"),
        })
        .from(prs)
        .where(eq(prs.exerciseName, exerciseName))
        .groupBy(prs.userId);

      if (maxWeights.length === 0) {
        return { exercise: exerciseName, topUser: null };
      }

      const userIds = maxWeights.map((row) => row.userId);
      const weights = maxWeights.map((row) => row.maxWeight);
      const weightStrings = weights.map(String);

      const prRecords = await db
        .select({
          userId: prs.userId,
          weight: prs.weight,
          date: prs.date,
        })
        .from(prs)
        .where(
          and(
            eq(prs.exerciseName, exerciseName),
            inArray(prs.userId, userIds),
            inArray(prs.weight, weightStrings)
          )
        );

      const userPRMap = new Map<string, { weight: number; date: string }>();
      for (const pr of prRecords) {
        const existing = userPRMap.get(pr.userId);
        const weightNum = Number(pr.weight);
        if (
          !existing ||
          weightNum > existing.weight ||
          (weightNum === existing.weight &&
            new Date(pr.date) > new Date(existing.date))
        ) {
          userPRMap.set(pr.userId, { weight: weightNum, date: pr.date });
        }
      }

      const sorted = Array.from(userPRMap.entries())
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => {
          if (b.weight === a.weight) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return b.weight - a.weight;
        });

      const top = sorted[0];
      if (!top) return { exercise: exerciseName, topUser: null };
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(top.userId);
      return {
        exercise: exerciseName,
        topUser: {
          userId: top.userId, // add this line
          username:
            user.username ||
            `${user.firstName} ${user.lastName}`.trim() ||
            user.emailAddresses[0]?.emailAddress ||
            "Unknown",
          weight: top.weight,
          date: top.date,
        },
      };
    });

    const leaderboard = await Promise.all(leaderboardPromises);
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
