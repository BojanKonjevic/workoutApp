"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { workouts } from "@/db/schema";
import { InferModel } from "drizzle-orm";

// Types
type Exercise = {
  id: number;
  name: string;
  sets: number;
  reps: number;
  topWeight: number;
  isPR?: boolean;
};

type Workout = InferModel<typeof workouts> & {
  exercises: Exercise[];
  workoutHasPR?: boolean;
};

type WorkoutsListProps = {
  refreshKey: number;
  onSuccess: () => void;
};

// Helpers
function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function getOrdinalSuffix(day: number) {
  if (day > 3 && day < 21) return "th";
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

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const options: Intl.DateTimeFormatOptions = { month: "long" };
  const month = date.toLocaleString("en-US", options);
  const day = date.getDate();
  return `${month} ${day}${getOrdinalSuffix(day)}`;
}

function markHistoricalPRs(workouts: Workout[]): Workout[] {
  const maxMap = new Map<string, number>();

  return workouts
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // chronological
    .map((workout) => {
      let workoutHasPR = false;
      const updatedExercises = workout.exercises.map((ex) => {
        const normalized = normalizeName(ex.name);
        const weight = Number(ex.topWeight);
        const currentMax = maxMap.get(normalized) ?? 0;
        const isPR = !isNaN(weight) && weight > currentMax;

        if (isPR) {
          maxMap.set(normalized, weight);
          workoutHasPR = true;
        }

        return { ...ex, isPR };
      });

      return { ...workout, exercises: updatedExercises, workoutHasPR };
    })
    .reverse();
}

// Component
export default function WorkoutsList({
  refreshKey,
  onSuccess,
}: WorkoutsListProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        const res = await fetch(`/api/deleteWorkout?id=${id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setWorkouts((prev) => prev.filter((w) => w.id !== id));
          toast.success("Workout deleted");
          onSuccess();
        } else {
          const data = await res.json();
          toast.error(data.error || "Failed to delete workout");
        }
      } catch {
        toast.error("Network error while deleting workout");
      }
    },
    [onSuccess]
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchWorkouts() {
      setLoading(true);
      try {
        const res = await fetch("/api/getWorkouts");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const marked = markHistoricalPRs(data);
            setWorkouts(marked);
          }
        } else {
          toast.error("Failed to fetch workouts");
        }
      } catch {
        toast.error("Network error while fetching workouts");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchWorkouts();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  if (loading) return <p>Loading workouts...</p>;

  return (
    <div className="max-w-xl w-full mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-4 text-center">Your Workouts</h1>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto hide-scrollbar">
        {workouts.map((workout, index) => (
          <Accordion
            key={workout.id}
            type="single"
            collapsible
            className="w-full border rounded-2xl shadow-sm hover:shadow-md transition"
          >
            <AccordionItem value={String(index)}>
              <AccordionTrigger className="p-4">
                <div className="flex justify-between w-full items-center">
                  <h2 className="capitalize font-semibold text-lg flex items-center gap-2">
                    {workout.type}
                    {workout.workoutHasPR && (
                      <span className="text-lg px-1 py-0.5">🥇</span>
                    )}
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
                  {workout.exercises.map(
                    ({ id, name, sets, reps, topWeight, isPR }) => (
                      <li
                        className="grid grid-cols-[1fr_auto_auto] gap-4 px-1"
                        key={id}
                      >
                        <p className="font-medium flex items-center gap-2">
                          {name}
                          {isPR && (
                            <span className="text-lg px-1 py-0.5">🥇</span>
                          )}
                        </p>
                        <p className="whitespace-nowrap text-right">
                          {sets}x{reps}
                        </p>
                        <p className="whitespace-nowrap text-right">
                          {topWeight}kg
                        </p>
                      </li>
                    )
                  )}
                </ul>
                <div className="flex justify-end pt-4">
                  <Button
                    className="cursor-pointer bg-red-600"
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
        ))}
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
                {workoutToDelete?.createdAt
                  ? new Date(workoutToDelete.createdAt).toLocaleDateString()
                  : ""}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setWorkoutToDelete(null)}>
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
