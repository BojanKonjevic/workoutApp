"use client";

import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useState, useEffect } from "react";
import AddWorkoutForm from "@/components/feature/AddWorkoutForm";
import PersonalRecords from "@/components/feature/PersonalRecords";
import WorkoutsList from "@/components/feature/WorkoutsList";
import Leaderboard from "@/components/feature/LeaderBoard";
import WorkoutCalendar from "@/components/feature/WorkoutsCalendar";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useUser();
  const [workoutsExist, setWorkoutsExist] = useState<boolean | null>(null); // null = loading

  const refreshRecords = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    async function checkWorkouts() {
      try {
        const res = await fetch("/api/getWorkouts");
        if (!res.ok) {
          setWorkoutsExist(false);
          return;
        }
        const data = await res.json();
        setWorkoutsExist(data.length > 0);
      } catch {
        setWorkoutsExist(false);
      }
    }
    checkWorkouts();
  }, [refreshKey]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (workoutsExist === null) {
    // Loading state, optionally show spinner or blank
    return (
      <main className="p-4 text-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-4">
      <SignedOut>
        <h1 className="text-2xl font-bold text-center">
          Please sign in to use the app
        </h1>
      </SignedOut>

      <Toaster />

      <SignedIn>
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold capitalize">
            {`${getTimeBasedGreeting()}, ${user?.username ?? "User"} 👋`}
          </h1>

          <Button className="cursor-pointer" onClick={() => setShowModal(true)}>
            Add Workout
          </Button>

          <AddWorkoutForm
            open={showModal}
            setOpen={setShowModal}
            onSuccess={refreshRecords}
          />

          {!workoutsExist ? (
            <p className="mt-8 text-center text-muted-foreground">
              Add your first workout!
            </p>
          ) : (
            <>
              <div className="w-full flex justify-around">
                <WorkoutsList
                  refreshKey={refreshKey}
                  onSuccess={refreshRecords}
                />
                <PersonalRecords refreshKey={refreshKey} />
              </div>
              <div className="w-full flex justify-around">
                <Leaderboard refreshKey={refreshKey} />
                <WorkoutCalendar refreshKey={refreshKey} />
              </div>
            </>
          )}
        </div>
      </SignedIn>
    </main>
  );
}
