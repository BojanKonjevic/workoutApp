"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface Exercise {
  id: number;
  name: string;
}

interface SelectedExercise extends Exercise {
  sets: number;
  reps: number;
  weight: number;
}

export default function AddWorkoutForm({ open, setOpen }: Props) {
  const [type, setType] = useState("push");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [userExercises, setUserExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<
    SelectedExercise[]
  >([]);

  async function fetchUserExercises() {
    const res = await fetch("/api/userExercises");
    if (res.ok) {
      const data = await res.json();
      setUserExercises(data);
    }
  }
  useEffect(() => {
    fetchUserExercises();
  }, []);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      { ...exercise, sets: 3, reps: 10, weight: 0 },
    ]);
    setUserExercises((prev) => prev.filter((ex) => ex.id !== exercise.id));
  };

  const handleRemoveExercise = (id: number) => {
    const toRemove = selectedExercises.find((ex) => ex.id === id);
    if (!toRemove) return;

    setSelectedExercises((prev) => prev.filter((ex) => ex.id !== id));
    setUserExercises((prev) => [
      ...prev,
      { id: toRemove.id, name: toRemove.name },
    ]);
  };

  const updateExerciseField = (
    id: number,
    field: "sets" | "reps" | "weight",
    value: number
  ) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  };

  async function handleSaveWorkout() {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    if (selectedExercises.length === 0) {
      toast.error("Please select at least one exercise");
      return;
    }

    // Validation: reps, sets, weight must be > 0 for all selected exercises
    const invalidExercise = selectedExercises.find(
      (ex) => ex.reps <= 0 || ex.sets <= 0 || ex.weight <= 0
    );
    if (invalidExercise) {
      toast.error(`All Reps, Sets, and Weight must be positive.`);
      return;
    }

    try {
      const body = {
        date: format(selectedDate, "yyyy-MM-dd"),
        type: type.toLowerCase(),
        exercises: selectedExercises.map(
          ({ id, name, sets, reps, weight }) => ({
            name,
            sets,
            reps,
            topWeight: weight,
          })
        ),
      };

      const res = await fetch("/api/addWorkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Workout Added");
        setOpen(false);
        setSelectedExercises([]);
        setSelectedDate(new Date());
        fetchUserExercises();
      } else {
        toast.error("Failed to add workout");
      }
    } catch (error) {
      toast.error("Failed to add workout");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Workout</DialogTitle>
          <DialogDescription>
            Fill in the workout details and save your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          <div className="flex w-full justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="cursor-pointer w-[45%]" variant="outline">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuRadioGroup value={type} onValueChange={setType}>
                  {["push", "pull", "legs", "upper", "lower", "full body"].map(
                    (t) => (
                      <DropdownMenuRadioItem
                        key={t}
                        value={t}
                        className="cursor-pointer"
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </DropdownMenuRadioItem>
                    )
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!selectedDate}
                  className="data-[empty=true]:text-muted-foreground w-[45%] justify-start text-left font-normal cursor-pointer"
                >
                  <CalendarIcon />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                Select Exercise
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-60 overflow-auto">
              <DropdownMenuLabel>Exercises</DropdownMenuLabel>
              {userExercises.length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  No exercises left
                </div>
              ) : (
                userExercises.map((ex) => (
                  <DropdownMenuRadioItem
                    key={ex.id}
                    value={ex.name}
                    onClick={() => handleSelectExercise(ex)}
                    className="cursor-pointer"
                  >
                    {ex.name}
                  </DropdownMenuRadioItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-col gap-4">
            {selectedExercises.map((ex) => (
              <div
                key={ex.id}
                className="bg-muted rounded p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              >
                <div className="font-medium">{ex.name}</div>

                <div className="flex gap-2 items-center">
                  <label className="text-sm">Sets</label>
                  <Input
                    type="number"
                    className="w-16"
                    value={ex.sets}
                    onChange={(e) =>
                      updateExerciseField(ex.id, "sets", Number(e.target.value))
                    }
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <label className="text-sm">Reps</label>
                  <Input
                    type="number"
                    className="w-16"
                    value={ex.reps}
                    onChange={(e) =>
                      updateExerciseField(ex.id, "reps", Number(e.target.value))
                    }
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <label className="text-sm">Weight</label>
                  <Input
                    type="number"
                    className="w-20"
                    value={ex.weight}
                    onChange={(e) =>
                      updateExerciseField(
                        ex.id,
                        "weight",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <button
                  className="text-xl text-red-500 hover:text-red-700 ml-auto cursor-pointer font-extrabold"
                  onClick={() => handleRemoveExercise(ex.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <Button
            className="px-4 py-2 bg-primary text-white rounded cursor-pointer"
            onClick={handleSaveWorkout}
          >
            Save Workout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
