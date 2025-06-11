import { NextResponse } from "next/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";

export async function POST() {
  try {
    await db.insert(workouts).values({
      name: "Bench Press",
      sets: 4,
      reps: 10,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
