"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type UserPR = {
  userId: string;
  weight: number;
  date: string;
};

type ExerciseLeaderboard = {
  exercise: string;
  topUsers: UserPR[];
};
type FlattenedPR = {
  exercise: string;
  userId: string;
  username: string;
  weight: number;
  date: string;
};

export function Leaderboard({ refreshKey }: { refreshKey: number }) {
  const [flattened, setFlattened] = useState<FlattenedPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/prsLeaderboard");
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        const data = await res.json();

        const flat: FlattenedPR[] = [];
        for (const { exercise, topUser } of data.leaderboard) {
          if (topUser) {
            flat.push({
              exercise,
              userId: topUser.userId,
              username: topUser.username,
              weight: topUser.weight,
              date: topUser.date,
            });
          }
        }

        setFlattened(flat);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [refreshKey]);

  if (loading)
    return (
      <p className="text-center mt-8 text-lg text-muted-foreground">
        Loading leaderboard...
      </p>
    );

  if (error)
    return (
      <p className="text-center mt-8 text-lg text-red-600">
        Error loading leaderboard: {error}
      </p>
    );

  if (flattened.length === 0)
    return (
      <p className="text-center text-muted-foreground">
        No leaderboard data yet.
      </p>
    );

  return (
    <Card className="max-w-6xl mx-auto mt-8 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">
          🏆 Exercise Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exercise</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattened.map((entry) => (
              <TableRow key={`${entry.exercise}-${entry.userId}`}>
                <TableCell className="font-medium">{entry.exercise}</TableCell>
                <TableCell>{entry.username}</TableCell>
                <TableCell className="text-right font-semibold">
                  {entry.weight} kg
                </TableCell>
                <TableCell className="text-right">
                  {new Date(entry.date).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
