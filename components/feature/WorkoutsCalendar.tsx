"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";

type Exercise = {
  id: number;
  name: string;
  sets: number;
  reps: number;
  topWeight: number;
  isPR?: boolean;
};

type Workout = {
  id: number;
  date: string;
  type: string;
  exercises: Exercise[];
  workoutHasPR?: boolean;
};

type WorkoutCalendarProps = {
  refreshKey: number;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
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
    });
}

export default function WorkoutCalendar({ refreshKey }: WorkoutCalendarProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const prWorkoutDates = workouts
    .filter((w) => w.workoutHasPR)
    .map((w) => new Date(w.date));

  const regularWorkoutDates = workouts
    .filter((w) => !w.workoutHasPR)
    .map((w) => new Date(w.date));

  useEffect(() => {
    async function fetchWorkouts() {
      const res = await fetch("/api/getWorkouts");
      if (!res.ok) return;
      const data = await res.json();
      const marked = markHistoricalPRs(data);
      setWorkouts(marked);
    }

    fetchWorkouts();
  }, [refreshKey]);

  // Extract dates of workouts for calendar modifiers
  const workoutDates = workouts.map((w) => new Date(w.date));

  // On calendar day click, find workout for that day and open dialog if found
  const onDayClick = (day: Date) => {
    const clickedDateStr = day.toDateString();

    const workoutForDay = workouts.find(
      (w) => new Date(w.date).toDateString() === clickedDateStr
    );

    if (workoutForDay) {
      setSelectedWorkout(workoutForDay);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Workout Calendar</h2>

      <Calendar
        mode="single"
        selected={undefined}
        modifiers={{
          workout: regularWorkoutDates,
          prWorkout: prWorkoutDates,
        }}
        modifiersClassNames={{
          workout: "text-green-600 font-extrabold",
          prWorkout: "text-yellow-500",
        }}
        onDayClick={onDayClick}
      />

      <Dialog
        open={!!selectedWorkout}
        onOpenChange={(open) => {
          if (!open) setSelectedWorkout(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkout?.type
                ? selectedWorkout.type.charAt(0).toUpperCase() +
                  selectedWorkout.type.slice(1)
                : ""}
              , {selectedWorkout ? formatDate(selectedWorkout.date) : ""}
              {selectedWorkout?.workoutHasPR && (
                <span className="ml-2 text-lg px-1 py-0.5">🥇</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-1 text-sm font-semibold text-muted-foreground mb-2 border-b pb-1">
              <span>Exercise</span>
              <span>Volume</span>
              <span>Top Set</span>
            </div>
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {selectedWorkout?.exercises.map(
                ({ id, name, sets, reps, topWeight, isPR }) => (
                  <li
                    key={id}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 px-1"
                  >
                    <p className="font-medium flex items-center gap-2">
                      {name}
                      {isPR && <span className="text-lg px-1 py-0.5">🥇</span>}
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
          </div>

          <div className="flex justify-end mt-6">
            <Button
              className="cursor-pointer"
              onClick={() => setSelectedWorkout(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
