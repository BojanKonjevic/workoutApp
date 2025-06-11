"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import AddWorkoutForm from "@/components/feature/AddWorkoutForm";

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  async function handleAddWorkout() {
    try {
      const mockData = {
        date: "2025-06-11",
        type: "push",
        exercises: [
          { name: "Bench Press", sets: 3, reps: 8, topWeight: 82.5 },
          { name: "Overhead Press", sets: 3, reps: 10, topWeight: 40 },
        ],
      };

      const res = await fetch("/api/addWorkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockData),
      });

      const data = await res.json();

      if (data.success) toast("Workout Added");
      else toast("Failed to add workout");
    } catch {
      toast("Failed to add workout");
    }
  }

  return (
    <main className="p-4">
      <SignedOut>
        <h1 className="text-2xl font-bold flex justify-center">
          Please Sign in to use the app
        </h1>
      </SignedOut>

      <Toaster />

      <SignedIn>
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">Welcome to your app</h1>

          <Button
            className="cursor-pointer"
            onClick={() => {
              // handleAddWorkout();
              setShowModal(true);
            }}
          >
            Add Workout
          </Button>

          <AddWorkoutForm open={showModal} setOpen={setShowModal} />
        </div>
      </SignedIn>
    </main>
  );
}
