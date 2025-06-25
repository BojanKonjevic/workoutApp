"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type PR = {
  id: number;
  userId: string;
  exerciseName: string;
  weight: string;
  date: string;
  createdAt: string;
};

type GroupedPRs = {
  name: string;
  prs: PR[];
};

const getOrdinalSuffix = (day: number) => {
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
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  return `${month} ${day}${getOrdinalSuffix(day)}`;
};

function PRGroup({ group }: { group: GroupedPRs }) {
  const currentPR = useMemo(() => {
    const maxWeight = group.prs.reduce((max, pr) => {
      const weightNum = parseFloat(pr.weight);
      return weightNum > max ? weightNum : max;
    }, 0);
    return `${maxWeight} kg`;
  }, [group.prs]);

  const sortedPRs = useMemo(
    () =>
      [...group.prs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [group.prs]
  );

  const chartData = useMemo(
    () =>
      sortedPRs.map((pr) => ({
        date: formatDate(pr.date),
        weight: parseFloat(pr.weight),
      })),
    [sortedPRs]
  );

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full border rounded-2xl shadow-sm hover:shadow-md transition"
      key={group.name}
    >
      <AccordionItem value={`item-${group.name}`}>
        <AccordionTrigger className="p-4">
          <div className="flex justify-between w-full items-center">
            <h2 className="capitalize font-semibold text-lg">{group.name}</h2>
            <p className="text-sm text-muted-foreground">{currentPR}</p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <div className="grid grid-cols-[1fr_auto] gap-4 px-1 text-sm font-semibold text-muted-foreground mb-2 border-b pb-1">
            <span>First Achieved</span>
            <span>Weight (kg)</span>
          </div>
          <ul className="space-y-2">
            {sortedPRs.map((pr) => (
              <li
                className="grid grid-cols-[1fr_auto] gap-4 px-1"
                key={pr.id}
                aria-label={`${group.name} PR on ${formatDate(pr.date)}`}
              >
                <p>{formatDate(pr.date)}</p>
                <p className="text-right">{pr.weight}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["auto", "auto"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default function PersonalRecords({
  refreshKey,
}: {
  refreshKey: number;
}) {
  const [data, setData] = useState<GroupedPRs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchPRs() {
      setLoading(true);
      try {
        const res = await fetch("/api/getRecords");
        if (!res.ok) throw new Error("Failed to fetch PRs");
        const json = await res.json();

        const cleanedData: GroupedPRs[] = json.map(
          ({ name, prs }: { name: string; prs: PR[] }) => ({ name, prs })
        );

        cleanedData.sort((a, b) => {
          const latestA = a.prs.reduce(
            (latest, pr) =>
              new Date(pr.date) > latest ? new Date(pr.date) : latest,
            new Date(0)
          );
          const latestB = b.prs.reduce(
            (latest, pr) =>
              new Date(pr.date) > latest ? new Date(pr.date) : latest,
            new Date(0)
          );
          return latestB.getTime() - latestA.getTime();
        });

        if (isMounted) setData(cleanedData);
      } catch (error) {
        console.error(error);
        if (isMounted) setData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchPRs();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  if (loading) return <p>Loading PRs...</p>;
  if (!data.length) return <p>No personal records found.</p>;

  return (
    <div className="max-w-xl w-full mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Your Personal Records
      </h1>
      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto hide-scrollbar">
        {data.map((group) => (
          <PRGroup key={group.name} group={group} />
        ))}
      </div>
    </div>
  );
}
