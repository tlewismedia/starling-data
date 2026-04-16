"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { QueryResponse } from "../shared/types";
import { CARD, confidenceTier, shortHex } from "./_components/shared";
import { BackgroundLayers } from "./_components/background-layers";
import { Header } from "./_components/header";
import { QuestionCard } from "./_components/question-card";
import { AnswerCard } from "./_components/answer-card";
import { TraceSection } from "./_components/trace-section";
import { CitationsPanel } from "./_components/citations-panel";
import type { RunMeta } from "./_components/shared";

export default function HomePage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [runMeta, setRunMeta] = useState<RunMeta | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    const startedAt = Date.now();
    const startedAtIso = new Date(startedAt).toISOString();
    const askedQuery = query;
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: askedQuery }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong.");
        return;
      }
      setResult(data as QueryResponse);
      setSubmittedQuery(askedQuery);
      setRunMeta({
        run: shortHex(),
        when: startedAtIso,
        durationMs: Date.now() - startedAt,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  const tier = useMemo(
    () => confidenceTier(result?.retrievals ?? []),
    [result],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundLayers />
      <Header />
      <main className="relative mx-auto max-w-[1360px] px-8 pb-24 pt-4">
        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-12 space-y-6 lg:col-span-8">
            <QuestionCard
              query={query}
              setQuery={setQuery}
              onSubmit={() => void handleSubmit()}
              onKeyDown={handleKeyDown}
              loading={loading}
              textareaRef={textareaRef}
            />

            {error && (
              <div className={`${CARD} p-5 text-[13px] text-[#8b3a2f]`}>
                {error}
              </div>
            )}

            {result && (
              <AnswerCard
                answer={result.answer}
                citations={result.citations}
                retrievals={result.retrievals}
                tier={tier}
              />
            )}

            {result && runMeta && (
              <TraceSection
                runMeta={runMeta}
                query={submittedQuery}
                retrievals={result.retrievals}
                citations={result.citations}
                tier={tier}
              />
            )}
          </section>

          <aside className="col-span-12 lg:col-span-4">
            <CitationsPanel result={result} />
          </aside>
        </div>
      </main>
    </div>
  );
}
