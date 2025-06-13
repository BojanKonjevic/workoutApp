import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  decimal,
  date,
  pgEnum,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const workoutTypeEnum = pgEnum("workout_type", [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "arms",
  "shoulders",
  "full",
]);

export const userExercises = pgTable("user_exercises", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  highestWeight: decimal("highest_weight", {
    precision: 5,
    scale: 2,
  }).notNull(),
  firstPrDate: date("first_pr_date").notNull(),
  lastPrDate: date("last_pr_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  date: date("date").notNull(),
  type: workoutTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id),
  name: varchar("name", { length: 255 }).notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  topWeight: decimal("top_weight", { precision: 5, scale: 2 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prs = pgTable(
  "prs",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    exerciseName: varchar("exercise_name", { length: 255 }).notNull(),
    weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
    date: date("date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniquePrPerDay: uniqueIndex("prs_user_exercise_date_unique").on(
      table.userId,
      table.exerciseName,
      table.date
    ),
  })
);
