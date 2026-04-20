"use client";

import { CategoryBarChart } from "./category-bar-chart";
import { EvaluationSection } from "./evaluation-section";
import { MetricCard } from "./metric-card";
import {
  tierForJudge,
  type AnswerSummary,
} from "./evaluation-types";

/**
 * Answer-evaluation section. Controlled by the `/evaluations` page: the
 * page owns `running`, `progress`, `summary`, and `error`, and passes them
 * in as props. The section stays pure-view so it can render either the
 * live session state or the contents of a selected saved report without
 * caring which.
 */
export function AnswerEvaluation({
  running,
  progress,
  summary,
  error,
  onRun,
  runDisabled = false,
  runDisabledReason,
}: {
  running: boolean;
  progress: { index: number; total: number } | null;
  summary: AnswerSummary | null;
  error: string | null;
  onRun: () => void;
  runDisabled?: boolean;
  runDisabledReason?: string;
}): React.JSX.Element {
  const hasResults = summary !== null;

  return (
    <EvaluationSection
      title="Answer evaluation"
      description="Runs the benchmark through the full pipeline and uses an LLM-as-judge to score accuracy, completeness and relevance on a 1–5 scale."
      running={running}
      progress={progress}
      hasResults={hasResults}
      error={error}
      onRun={onRun}
      runDisabled={runDisabled}
      runDisabledReason={runDisabledReason}
    >
      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="Accuracy"
              value={summary.accuracy}
              tier={tierForJudge(summary.accuracy)}
              format="judge"
              hint={`Across ${summary.total} items`}
              explanation="How factually correct the answer is, judged by an LLM on a 1–5 scale. Higher is better."
            />
            <MetricCard
              label="Completeness"
              value={summary.completeness}
              tier={tierForJudge(summary.completeness)}
              format="judge"
              explanation="How thoroughly the answer covers what was asked, judged by an LLM on a 1–5 scale."
            />
            <MetricCard
              label="Relevance"
              value={summary.relevance}
              tier={tierForJudge(summary.relevance)}
              format="judge"
              explanation="How closely the answer sticks to the question, judged by an LLM on a 1–5 scale."
            />
          </div>
          <CategoryBarChart
            title="Average accuracy by category"
            scale="1-5"
            format="judge"
            tierFor="judge"
            rows={summary.categories.map((c) => ({
              category: c.category,
              value: c.avgAccuracy,
              count: c.count,
            }))}
          />
        </>
      )}
    </EvaluationSection>
  );
}
