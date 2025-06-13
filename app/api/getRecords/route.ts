import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { prs } from "@/db/schema"; // adjust if different
import { auth } from "@clerk/nextjs/server";

// Define the PR row type manually if not already imported
type PR = {
  id: number;
  userId: string;
  exerciseName: string;
  weight: string;
  date: string;
  createdAt: string;
};

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Step 1: Get distinct exercise names
  const distinctExercises: { exerciseName: string }[] = await db
    .selectDistinctOn([prs.exerciseName])
    .from(prs)
    .where(eq(prs.userId, userId));

  const exerciseNames: string[] = distinctExercises.map(
    (row: { exerciseName: string }) => row.exerciseName
  );

  // Step 2: Get all PRs
  const allPrs: PR[] = (
    await db
      .select()
      .from(prs)
      .where(eq(prs.userId, userId))
      .orderBy(prs.exerciseName, prs.date)
  ).map((pr) => ({
    ...pr,
    date: pr.date.toString(),
    createdAt: pr.createdAt.toISOString(),
  }));

  // Step 3: Group them
  const grouped = exerciseNames.map((name: string) => {
    const records = allPrs
      .filter((pr: PR) => pr.exerciseName === name)
      .sort(
        (a: PR, b: PR) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );

    return {
      name,
      prs: records,
    };
  });

  return NextResponse.json(grouped);
}
