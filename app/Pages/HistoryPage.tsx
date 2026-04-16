"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "../_components/card";
import { SERIF, confidenceTier } from "../_components/shared";
import { AnswerCard } from "../_components/answer-card";
import {
  loadHistory,
  type HistoryEntry,
} from "../_components/history-store";

export function HistoryPage(): React.JSX.Element {
  const [entries, setEntries] = useState<readonly HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read from localStorage once on mount. We keep this inside useEffect
    // (rather than useState initializer) to avoid SSR/hydration mismatch:
    // server renders the empty-state, client swaps in real history after
    // hydration. One-shot hydration read of a client-only external source
    // (localStorage); not a candidate for the subscribe-and-setState
    // pattern react-hooks/set-state-in-effect is designed to enforce.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(loadHistory());
    setHydrated(true);
  }, []);

  return (
    <main className="relative mx-auto w-full max-w-[1360px] flex-1 px-8 pb-24 pt-4">
      <div className="mb-6">
        <h1
          className="text-[28px] tracking-tight text-[#1f2a23]"
          style={SERIF}
        >
          History
        </h1>
        <p className="mt-1 text-[13px] text-[#6b7a70]">
          Recently asked questions, answers, and the runs behind them.
        </p>
      </div>

      {hydrated && entries.length === 0 && (
        <Card className="p-8">
          <p className="text-[13px] text-[#6b7a70]">
            No questions asked yet. Head to the{" "}
            <Link
              href="/"
              className="text-[#2d4a35] underline underline-offset-2 hover:text-[#1f3526]"
            >
              Dashboard
            </Link>{" "}
            to start.
          </p>
        </Card>
      )}

      {entries.length > 0 && (
        <div className="space-y-6">
          {entries.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }): React.JSX.Element {
  const tier = confidenceTier(entry.response.retrievals);
  const formattedDate = formatAskedAt(entry.askedAt);
  return (
    <div className="space-y-3">
      <Card className="p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          {formattedDate}
        </div>
        <p
          className="mt-3 text-[18px] leading-[1.5] text-[#1f2a23]"
          style={SERIF}
        >
          {entry.query}
        </p>
      </Card>
      <AnswerCard
        answer={entry.response.answer}
        citations={entry.response.citations}
        retrievals={entry.response.retrievals}
        tier={tier}
        onCitationClick={undefined}
      />
    </div>
  );
}

function formatAskedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
