import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
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

const bodyweightExercises = [
  "Pull-Up",
  "Push-Up",
  "Dips",
  "Chin-Up",
  "Inverted Row",
  "Bodyweight Squat",
];

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Get distinct exercise names
  const distinctExercises: { exerciseName: string }[] = await db
    .selectDistinctOn([prs.exerciseName])
    .from(prs)
    .where(eq(prs.userId, userId));

  const exerciseNames: string[] = distinctExercises.map(
    (row) => row.exerciseName
  );

  // Get all PRs
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

  // Group them
  const grouped = exerciseNames.map((name) => {
    const records = allPrs
      .filter((pr) => pr.exerciseName === name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      name,
      isBodyweight: bodyweightExercises.includes(name),
      prs: records,
    };
  });

  return NextResponse.json(grouped);
}
