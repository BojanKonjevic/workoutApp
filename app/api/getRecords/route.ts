import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, desc } from "drizzle-orm";
import { prs } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";

type PR = {
  id: number;
  userId: string;
  exerciseName: string;
  weight: string;
  date: string;
  createdAt: string;
};

const bodyweightExercises = new Set([
  "Pull-Up",
  "Push-Up",
  "Dips",
  "Chin-Up",
  "Inverted Row",
  "Bodyweight Squat",
]);

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Get all PRs for the user, ordered by exerciseName, then descending date
  const allPrsRaw = await db
    .select()
    .from(prs)
    .where(eq(prs.userId, userId))
    .orderBy(prs.exerciseName, desc(prs.date));

  // Map and convert dates only once
  const allPrs: PR[] = allPrsRaw.map((pr) => ({
    ...pr,
    date: pr.date.toString(),
    createdAt: pr.createdAt.toISOString(),
  }));

  // Group PRs by exerciseName using a Map
  const prMap = new Map<string, PR[]>();
  for (const pr of allPrs) {
    prMap.has(pr.exerciseName)
      ? prMap.get(pr.exerciseName)!.push(pr)
      : prMap.set(pr.exerciseName, [pr]);
  }

  // Build grouped array with isBodyweight flag
  const grouped = Array.from(prMap.entries()).map(([name, prs]) => ({
    name,
    isBodyweight: bodyweightExercises.has(name),
    prs,
  }));

  return NextResponse.json(grouped);
}
