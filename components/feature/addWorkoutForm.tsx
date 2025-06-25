"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, MinusCircle } from "lucide-react";
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
  onSuccess: () => void;
};

interface Exercise {
  id: number;
  name: string;
}

interface SelectedExercise extends Exercise {
  sets: number;
  reps: number;
  weight: number;
}

const EXERCISE_TYPES = [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "arms",
  "shoulders",
  "full",
];

// Memoized Exercise Row to prevent unnecessary re-renders
const ExerciseRow = React.memo(function ExerciseRow({
  ex,
  onUpdateField,
  onRemove,
}: {
  ex: SelectedExercise;
  onUpdateField: (
    id: number,
    field: "sets" | "reps" | "weight",
    value: number
  ) => void;
  onRemove: (id: number) => void;
}) {
  const handleChange = useCallback(
    (field: "sets" | "reps" | "weight") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        onUpdateField(ex.id, field, value);
      },
    [ex.id, onUpdateField]
  );

  const handleRemove = useCallback(() => onRemove(ex.id), [ex.id, onRemove]);

  return (
    <>
      <div className="flex items-center">{ex.name}</div>
      <div className="flex items-center justify-center">
        <Input
          type="number"
          className="w-16"
          value={ex.sets}
          onChange={handleChange("sets")}
          min={1}
        />
      </div>
      <div className="flex items-center justify-center">
        <Input
          type="number"
          className="w-16"
          value={ex.reps}
          onChange={handleChange("reps")}
          min={1}
        />
      </div>
      <div className="flex items-center justify-center">
        <Input
          type="number"
          className="w-20"
          value={ex.weight}
          onChange={handleChange("weight")}
          min={0}
        />
      </div>
      <div className="flex items-center justify-center">
        <button
          className="text-muted-foreground hover:text-destructive cursor-pointer"
          aria-label={`Remove ${ex.name}`}
          onClick={handleRemove}
          type="button"
        >
          <MinusCircle size={18} />
        </button>
      </div>
    </>
  );
});

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
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(
    null
  );

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

  useEffect(() => {
    fetchUserExercises();
  }, [fetchUserExercises]);

  const filteredExercises = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return userExercises.filter((ex) =>
      ex.name.toLowerCase().includes(lowerSearch)
    );
  }, [userExercises, searchTerm]);

  const handleSelectExercise = useCallback((exercise: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      { ...exercise, sets: 3, reps: 10, weight: 0 },
    ]);
    setUserExercises((prev) => prev.filter((ex) => ex.id !== exercise.id));
    setSearchTerm("");
    setCustomExerciseName("");
  }, []);

  const handleDeleteExercise = useCallback(async (id: number) => {
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
  }, []);

  const handleRemoveExercise = useCallback((id: number) => {
    setSelectedExercises((prevSelected) => {
      const exToRemove = prevSelected.find((ex) => ex.id === id);
      if (!exToRemove) return prevSelected;

      setUserExercises((prevUser) => {
        if (prevUser.some((ex) => ex.id === exToRemove.id)) return prevUser;
        return [...prevUser, { id: exToRemove.id, name: exToRemove.name }];
      });

      return prevSelected.filter((ex) => ex.id !== id);
    });
  }, []);

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
      const res = await fetch("/api/userExercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUserExercises((prev) => [...prev, data.exercise]);
        setCustomExerciseName("");
        toast.success(`Added ${trimmedName}`);
      } else {
        toast.error("Failed to add exercise");
      }
    } catch {
      toast.error("Failed to add exercise");
    }
  }, [customExerciseName, userExercises, selectedExercises]);

  const handleSaveWorkout = useCallback(async () => {
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
  }, [
    selectedDate,
    selectedExercises,
    type,
    setOpen,
    fetchUserExercises,
    onSuccess,
  ]);

  // Memoized DropdownMenuRadioItems for workout types to avoid recreating on every render
  const workoutTypeItems = useMemo(
    () =>
      EXERCISE_TYPES.map((t) => (
        <DropdownMenuRadioItem
          key={t}
          value={t}
          className="cursor-pointer hide-scrollbar"
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </DropdownMenuRadioItem>
      )),
    []
  );

  // Memoized filtered exercises list render
  const filteredExercisesList = useMemo(() => {
    if (filteredExercises.length === 0)
      return (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          No exercises found
        </div>
      );

    return filteredExercises.map((ex) => (
      <div
        key={ex.id}
        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md flex justify-between items-center group"
      >
        <span
          className="cursor-pointer flex-1"
          onClick={() => handleSelectExercise(ex)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSelectExercise(ex);
          }}
        >
          {ex.name}
        </span>
        <button
          onClick={() => setExerciseToDelete(ex)}
          aria-label={`Delete ${ex.name}`}
          className="text-muted-foreground hover:text-destructive cursor-pointer mr-2 mt-2"
        >
          <Trash2 size={18} />
        </button>
      </div>
    ));
  }, [filteredExercises, handleSelectExercise]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-1/3 h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add New Workout</DialogTitle>
          <DialogDescription>
            Track your workouts, gain muscle, and become stronger
          </DialogDescription>
        </DialogHeader>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full mt-4 text-black dark:text-white cursor-pointer"
            >
              Workout Type: {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[160px]">
            <DropdownMenuLabel>Select Type</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={type} onValueChange={setType}>
              {workoutTypeItems}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full my-4 justify-start text-left font-normal cursor-pointer"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Selected Exercises Grid Header */}
        <div className="grid grid-cols-5 gap-4 items-center text-center font-semibold border-b border-b-slate-700 pb-1 mb-2 mt-6">
          <div>Name</div>
          <div>Sets</div>
          <div>Reps</div>
          <div>Weight (kg)</div>
          <div>Remove</div>
        </div>

        {/* Selected Exercises */}
        <div className="max-h-64 overflow-y-auto space-y-2 hide-scrollbar">
          {selectedExercises.map((ex) => (
            <div key={ex.id} className="grid grid-cols-5 gap-4 items-center">
              <ExerciseRow
                ex={ex}
                onUpdateField={updateExerciseField}
                onRemove={handleRemoveExercise}
              />
            </div>
          ))}
        </div>

        <Input
          placeholder="Search exercises to add"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-4 mb-2"
          autoComplete="off"
          aria-label="Search exercises"
        />
        <div
          className="max-h-48 overflow-y-auto rounded-md border border-zinc-700 hide-scrollbar"
          role="listbox"
          aria-label="Filtered exercises"
        >
          {filteredExercisesList}
        </div>

        <div className="flex gap-2 mt-3">
          <Input
            placeholder="Add custom exercise"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCustomExercise();
            }}
            aria-label="Add custom exercise"
          />
          <Button
            variant="outline"
            className="min-w-[130px] cursor-pointer"
            onClick={addCustomExercise}
            type="button"
          >
            Add Exercise
          </Button>
        </div>

        {/* Save Button */}
        <Button
          className="mt-6 w-full cursor-pointer"
          onClick={handleSaveWorkout}
          type="button"
        >
          Save Workout
        </Button>
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
              Are you sure you want to delete the exercise{" "}
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
