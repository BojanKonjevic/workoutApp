"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import AddWorkoutForm from "@/components/feature/AddWorkoutForm";
import PersonalRecords from "@/components/feature/PersonalRecords";
import WorkoutsList from "@/components/feature/WorkoutsList";
import { getTime } from "date-fns";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function refreshRecords() {
    setRefreshKey((prev) => prev + 1);
  }
  function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
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
          <h1 className="text-2xl font-bold">{`${getTimeBasedGreeting()}, ${
            useUser().user?.username
          } 👋`}</h1>
          <Button className="cursor-pointer" onClick={() => setShowModal(true)}>
            Add Workout
          </Button>
          <AddWorkoutForm
            open={showModal}
            setOpen={setShowModal}
            onSuccess={refreshRecords}
          />
          <div className="w-full flex justify-around">
            <WorkoutsList refreshKey={refreshKey} onSuccess={refreshRecords} />
            <PersonalRecords refreshKey={refreshKey} />
          </div>
        </div>
      </SignedIn>
    </main>
  );
}
