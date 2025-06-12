"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import AddWorkoutForm from "@/components/feature/addWorkoutForm";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
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

          <Button className="cursor-pointer" onClick={() => setShowModal(true)}>
            Add Workout
          </Button>

          <AddWorkoutForm open={showModal} setOpen={setShowModal} />
        </div>
      </SignedIn>
    </main>
  );
}
