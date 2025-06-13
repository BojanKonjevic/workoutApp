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
import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type AddWorkoutFormProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void; // new prop
};
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

export default function AddWorkoutForm({
  open,
  setOpen,
  onSuccess,
}: AddWorkoutFormProps) {
  const [type, setType] = useState("push");
  const [searchTerm, setSearchTerm] = useState("");
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [userExercises, setUserExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<
    SelectedExercise[]
  >([]);

  useEffect(() => {
    fetchUserExercises();
  }, []);

  const fetchUserExercises = useCallback(async () => {
    try {
      const res = await fetch("/api/userExercises");
      if (res.ok) {
        const data = await res.json();
        setUserExercises(data);
      }
    } catch {
      toast.error("Failed to load exercises");
    }
  }, []);

  const filteredExercises = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return userExercises.filter((ex) =>
      ex.name.toLowerCase().includes(lowerSearch)
    );
  }, [userExercises, searchTerm]);

  // Add exercise to selected and remove from userExercises in one functional update
  const handleSelectExercise = useCallback((exercise: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      { ...exercise, sets: 3, reps: 10, weight: 0 },
    ]);
    setUserExercises((prev) => prev.filter((ex) => ex.id !== exercise.id));
    setSearchTerm("");
    setCustomExerciseName("");
  }, []);

  async function handleDeleteExercise(id: number) {
    try {
      const res = await fetch(`/api/userExercises?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUserExercises((prev) => prev.filter((ex) => ex.id !== id));
        toast.success("Exercise deleted");
      } else {
        toast.error("Failed to delete exercise");
      }
    } catch {
      toast.error("Failed to delete exercise");
    }
  }

  const handleRemoveExercise = useCallback((id: number) => {
    setSelectedExercises((prevSelected) => {
      const exToRemove = prevSelected.find((ex) => ex.id === id);
      if (!exToRemove) return prevSelected;

      setUserExercises((prevUser) => {
        if (prevUser.some((ex) => ex.id === exToRemove.id)) {
          return prevUser;
        }
        return [...prevUser, { id: exToRemove.id, name: exToRemove.name }];
      });

      return prevSelected.filter((ex) => ex.id !== id);
    });
  }, []);

  // Update a field (sets, reps, weight) immutably but efficiently
  const updateExerciseField = useCallback(
    (id: number, field: "sets" | "reps" | "weight", value: number) => {
      setSelectedExercises((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
      );
    },
    []
  );

  const addCustomExercise = useCallback(async () => {
    const trimmedName = customExerciseName.trim();
    if (!trimmedName) {
      toast.error("Exercise name cannot be empty");
      return;
    }

    if (
      userExercises.some(
        (ex) => ex.name.toLowerCase() === trimmedName.toLowerCase()
      ) ||
      selectedExercises.some(
        (ex) => ex.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      toast.error("Exercise already exists");
      return;
    }

    try {
      // Call your API endpoint to save the custom exercise
      const res = await fetch("/api/userExercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Add the new exercise returned from backend (with ID) to state
        setUserExercises((prev) => [...prev, data.exercise]);
        setCustomExerciseName("");
        toast.success(`Added ${trimmedName}`);
      } else {
        toast.error("Failed to add exercise");
      }
    } catch (error) {
      toast.error("Failed to add exercise");
    }
  }, [customExerciseName, userExercises, selectedExercises]);

  async function handleSaveWorkout() {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    if (selectedExercises.length === 0) {
      toast.error("Please select at least one exercise");
      return;
    }

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
        exercises: selectedExercises.map(({ name, sets, reps, weight }) => ({
          name,
          sets,
          reps,
          topWeight: weight,
        })),
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
        onSuccess();
      } else {
        toast.error("Failed to add workout");
      }
    } catch {
      toast.error("Failed to add workout");
    }
  }

  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(
    null
  );

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
                  {[
                    "push",
                    "pull",
                    "legs",
                    "upper",
                    "lower",
                    "arms",
                    "shoulders",
                    "full body",
                  ].map((t) => (
                    <DropdownMenuRadioItem
                      key={t}
                      value={t}
                      className="cursor-pointer"
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </DropdownMenuRadioItem>
                  ))}
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
            <DropdownMenuContent className="w-56 max-h-80 overflow-auto flex flex-col gap-2 p-2">
              <DropdownMenuLabel>Exercises</DropdownMenuLabel>
              <Input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="mb-2"
              />
              {filteredExercises.length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  No exercises found
                </div>
              ) : (
                filteredExercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex justify-between items-center cursor-pointer px-2 py-1 hover:bg-muted rounded"
                  >
                    <DropdownMenuRadioItem
                      value={ex.name}
                      onClick={() => handleSelectExercise(ex)}
                      className="flex-grow cursor-pointer"
                    >
                      {ex.name}
                    </DropdownMenuRadioItem>
                    <button
                      className="text-xl text-red-500 hover:text-red-700 ml-auto cursor-pointer font-extrabold"
                      aria-label={`Delete ${ex.name}`}
                      onClick={() => setExerciseToDelete(ex)}
                    >
                      &times;
                    </button>
                  </div>
                ))
              )}
              <hr className="my-2 border-t border-muted-foreground" />
              <div className="flex flex-col gap-2 px-2">
                <Input
                  type="text"
                  placeholder="Add exercise"
                  value={customExerciseName}
                  onChange={(e) => setCustomExerciseName(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomExercise();
                    }
                  }}
                  className="flex-grow"
                />
                <Button
                  className="cursor-pointer"
                  size="sm"
                  onClick={addCustomExercise}
                  disabled={!customExerciseName.trim()}
                >
                  Add
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="max-h-[400px] overflow-y-auto hide-scrollbar grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-4 p-3 bg-muted rounded">
            <div className="font-semibold">Exercise</div>
            <div className="font-semibold text-center">Sets</div>
            <div className="font-semibold text-center">Reps</div>
            <div className="font-semibold text-center">Weight</div>
            <div></div>
            {selectedExercises.map((ex) => (
              <>
                <div key={`name-${ex.id}`} className="flex items-center">
                  {ex.name}
                </div>
                <div
                  key={`sets-${ex.id}`}
                  className="flex items-center justify-center"
                >
                  <Input
                    type="number"
                    className="w-16"
                    value={ex.sets}
                    onChange={(e) =>
                      updateExerciseField(ex.id, "sets", Number(e.target.value))
                    }
                    min={1}
                  />
                </div>
                <div
                  key={`reps-${ex.id}`}
                  className="flex items-center justify-center"
                >
                  <Input
                    type="number"
                    className="w-16"
                    value={ex.reps}
                    onChange={(e) =>
                      updateExerciseField(ex.id, "reps", Number(e.target.value))
                    }
                    min={1}
                  />
                </div>
                <div
                  key={`weight-${ex.id}`}
                  className="flex items-center justify-center"
                >
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
                    min={0}
                  />
                </div>
                <div
                  key={`remove-${ex.id}`}
                  className="flex items-center justify-center"
                >
                  <button
                    className="text-xl text-red-500 hover:text-red-700 cursor-pointer font-extrabold"
                    aria-label={`Remove ${ex.name}`}
                    onClick={() => handleRemoveExercise(ex.id)}
                  >
                    &times;
                  </button>
                </div>
              </>
            ))}
          </div>

          <Button className="cursor-pointer" onClick={handleSaveWorkout}>
            Save Workout
          </Button>
        </div>
      </DialogContent>
      <Dialog
        open={!!exerciseToDelete}
        onOpenChange={(open) => {
          if (!open) setExerciseToDelete(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{exerciseToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => setExerciseToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              variant="destructive"
              onClick={() => {
                if (exerciseToDelete) {
                  handleDeleteExercise(exerciseToDelete.id);
                  setExerciseToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
