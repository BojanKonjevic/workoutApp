"use client";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "../ui/button";
import { toast } from "sonner";
type Exercise = {
  id: number;
  name: string;
  sets: number;
  reps: number;
  topWeight: number;
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { workouts } from "@/db/schema";
import { InferModel } from "drizzle-orm";

const workoutColors: Record<string, string> = {
  push: "text-red-500",
  pull: "text-blue-500",
  legs: "text-green-600",
  upper: "text-purple-600",
  lower: "text-yellow-600",
  arms: "text-pink-500",
  shoulders: "text-indigo-500",
  full: "text-teal-600",
};

// Helper to get ordinal suffix for a day number
function getOrdinalSuffix(day: number) {
  if (day > 3 && day < 21) return "th"; // 11th to 20th
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

type workoutsListProps = {
  refreshKey: number;
  onSuccess: () => void;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const options: Intl.DateTimeFormatOptions = { month: "long" };
  const month = date.toLocaleString("en-US", options);
  const day = date.getDate();

  const ordinal = getOrdinalSuffix(day);

  return `${month} ${day}${ordinal}`;
}
type Workout = InferModel<typeof workouts>;
export default function WorkoutsList({
  refreshKey,
  onSuccess,
}: workoutsListProps) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/deleteWorkout?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workout deleted");
      onSuccess();
    } else {
      const data = await res.json();
      toast(data.error || "Failed to delete workout");
    }
  };

  useEffect(() => {
    const fetchWorkouts = async () => {
      const res = await fetch("/api/getWorkouts");
      if (res.ok) {
        const data = await res.json();
        setWorkouts(data);
      }
      setLoading(false);
    };
    fetchWorkouts();
  }, [refreshKey]);

  if (loading) {
    return <p>Loading workouts...</p>;
  }

  if (!workouts.length) {
    return <h1>No workouts found.</h1>;
  }

  return (
    <div className="max-w-xl w-full mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-4 text-center">Your Workouts</h1>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto hide-scrollbar">
        {workouts.map((workout, index) => {
          const exercises: Exercise[] = workout.exercises || [];
          const colorClass =
            workoutColors[workout.type?.toLowerCase()] || "text-gray-700";

          return (
            <Accordion
              key={workout.id}
              type="single"
              collapsible
              className="w-full border rounded-2xl shadow-sm hover:shadow-md transition"
            >
              <AccordionItem value={String(index)}>
                <AccordionTrigger className="p-4">
                  <div className="flex justify-between w-full items-center">
                    <h2
                      className={`capitalize font-semibold text-lg ${colorClass}`}
                    >
                      {workout.type}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workout.date)}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-1 text-sm font-semibold text-muted-foreground mb-2 border-b pb-1">
                    <span>Exercise</span>
                    <span>Volume</span>
                    <span>Top Set</span>
                  </div>
                  <ul className="space-y-2">
                    {exercises.map((exercise) => (
                      <li
                        className="grid grid-cols-[1fr_auto_auto] gap-4 px-1"
                        key={exercise.id}
                      >
                        <p className="font-medium">{exercise.name}</p>
                        <p className="whitespace-nowrap text-right">
                          {exercise.sets}x{exercise.reps}
                        </p>
                        <p className="whitespace-nowrap text-right">
                          {exercise.topWeight}kg
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-end pt-4">
                    <Button
                      className="cursor-pointer"
                      variant="destructive"
                      size="sm"
                      onClick={() => setWorkoutToDelete(workout)}
                    >
                      Delete Workout
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        })}
      </div>
      <Dialog
        open={!!workoutToDelete}
        onOpenChange={(open) => {
          if (!open) setWorkoutToDelete(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the workout on{" "}
              <strong>
                {workoutToDelete?.createdAt &&
                  new Date(workoutToDelete.createdAt).toLocaleDateString()}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => setWorkoutToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              variant="destructive"
              onClick={() => {
                if (workoutToDelete) {
                  handleDelete(workoutToDelete.id);
                  setWorkoutToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
