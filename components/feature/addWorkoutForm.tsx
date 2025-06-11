"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function AddWorkoutForm({ open, setOpen }: Props) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Workout</DialogTitle>
          <DialogDescription>
            Fill in the workout details and save your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Workout type (e.g. push)"
            className="w-full p-2 border rounded"
          />
          <button className="px-4 py-2 bg-primary text-white rounded cursor-pointer">
            Save Workout
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
