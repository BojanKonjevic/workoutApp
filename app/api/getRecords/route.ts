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

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const allPrsRaw = await db
    .select()
    .from(prs)
    .where(eq(prs.userId, userId))
    .orderBy(prs.exerciseName, desc(prs.date));

  const allPrs: PR[] = allPrsRaw.map((pr) => ({
    ...pr,
    date: pr.date.toString(),
    createdAt: pr.createdAt.toISOString(),
  }));

  const prMap = new Map<string, PR[]>();
  for (const pr of allPrs) {
    prMap.has(pr.exerciseName)
      ? prMap.get(pr.exerciseName)!.push(pr)
      : prMap.set(pr.exerciseName, [pr]);
  }

  const grouped = Array.from(prMap.entries()).map(([name, prs]) => ({
    name,
    prs,
  }));

  return NextResponse.json(grouped);
}
