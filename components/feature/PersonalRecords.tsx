"use client";

import { useEffect, useState } from "react";
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
  weight: string; // weight is string, so we parseFloat to compare
  date: string;
  createdAt: string;
};

type GroupedPRs = {
  name: string;
  isBodyweight: boolean;
  prs: PR[];
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

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const options: Intl.DateTimeFormatOptions = { month: "long" };
  const month = date.toLocaleString("en-US", options);
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);

  return `${month} ${day}${ordinal}`;
}

export default function PersonalRecords({
  refreshKey,
}: {
  refreshKey: number;
}) {
  const [data, setData] = useState<GroupedPRs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPRs() {
      const res = await fetch("/api/getRecords");
      if (res.ok) {
        const json = await res.json();
        json.sort((a: GroupedPRs, b: GroupedPRs) => {
          const latestDateA = a.prs.reduce((latest, pr) => {
            const d = new Date(pr.date);
            return d > latest ? d : latest;
          }, new Date(0));

          const latestDateB = b.prs.reduce((latest, pr) => {
            const d = new Date(pr.date);
            return d > latest ? d : latest;
          }, new Date(0));

          return latestDateB.getTime() - latestDateA.getTime();
        });
        setData(json);
      }
      setLoading(false);
    }
    fetchPRs();
  }, [refreshKey]);

  if (loading) {
    return <p>Loading PRs...</p>;
  }

  if (!data.length) {
    return <p>No personal records found.</p>;
  }

  return (
    <div className="max-w-xl w-full mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Your Personal Records
      </h1>
      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto hide-scrollbar">
        {data.map((group, idx) => {
          const isBodyweight = ["Pull-Up", "Push-Up", "Dips"].includes(
            group.name
          );

          const currentPR = group.isBodyweight
            ? `${group.prs.length} record${group.prs.length > 1 ? "s" : ""}`
            : `${group.prs.reduce((max, pr) => {
                const weightNum = parseFloat(pr.weight);
                return weightNum > max ? weightNum : max;
              }, 0)} kg`;

          return (
            <Accordion
              key={group.name}
              type="single"
              collapsible
              className="w-full border rounded-2xl shadow-sm hover:shadow-md transition"
            >
              <AccordionItem value={`item-${idx}`}>
                <AccordionTrigger className="p-4">
                  <div className="flex justify-between w-full items-center">
                    <h2 className="capitalize font-semibold text-lg">
                      {group.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{currentPR}</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-1 text-sm font-semibold text-muted-foreground mb-2 border-b pb-1">
                    <span>First Achieved</span>
                    <span>Weight (kg)</span>
                  </div>
                  <ul className="space-y-2">
                    {group.prs.map((pr) => (
                      <li
                        className="grid grid-cols-[1fr_auto] gap-4 px-1"
                        key={pr.id}
                      >
                        <p>{formatDate(pr.date)}</p>
                        <p className="text-right">{pr.weight}</p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...group.prs]
                          .sort(
                            (a, b) =>
                              new Date(a.date).getTime() -
                              new Date(b.date).getTime()
                          )
                          .map((pr) => ({
                            date: formatDate(pr.date),
                            weight: parseFloat(pr.weight),
                          }))}
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
        })}
      </div>
    </div>
  );
}
