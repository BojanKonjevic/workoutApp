"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  async function handleAddWorkout() {
    try {
      const res = await fetch("/api/addWorkout", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast("Workout Added");
      } else {
        toast("Failed to add workout" + data.error);
      }
    } catch (error) {
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
          <Button onClick={() => handleAddWorkout()} className="cursor-pointer">
            Add Workout
          </Button>
        </div>
      </SignedIn>
    </main>
  );
}
