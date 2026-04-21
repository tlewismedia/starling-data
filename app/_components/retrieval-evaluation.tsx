"use client";

import { CategoryBarChart } from "./category-bar-chart";
import { EvaluationSection } from "./evaluation-section";
import { MetricCard } from "./metric-card";
import {
  tierForRatio,
  type RetrievalSummary,
} from "./evaluation-types";

/**
 * Retrieval-evaluation section. Controlled by the `/evaluations` page: the
 * page owns `running`, `progress`, `summary`, and `error`, and passes them
 * in as props. The section stays pure-view so it can render either the
 * live session state or the contents of a selected saved report without
 * caring which.
 */
export function RetrievalEvaluation({
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
  summary: RetrievalSummary | null;
  error: string | null;
  onRun: () => void;
  runDisabled?: boolean;
  runDisabledReason?: string;
}): React.JSX.Element {
  const hasResults = summary !== null;

  return (
    <EvaluationSection
      title="Retrieval evaluation"
      description="Runs the benchmark through production retrieval and scores MRR, nDCG and keyword coverage. Thresholds match the eval prototype."
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
              label="MRR"
              value={summary.mrr}
              tier={tierForRatio(summary.mrr)}
              format="ratio"
              hint={`Across ${summary.total} items`}
              explanation="How high up the correct source appears in the search results, on average. Scored 0–1 — higher is better. 1.0 means the right source is always first."
            />
            <MetricCard
              label="nDCG"
              value={summary.ndcg}
              tier={tierForRatio(summary.ndcg)}
              format="ratio"
              explanation="How well the search ranks the most relevant sources near the top. Scored 0–1 — higher is better."
            />
            <MetricCard
              label="Keyword coverage"
              value={summary.keywordCoverage}
              tier={tierForRatio(summary.keywordCoverage)}
              format="percent"
              explanation="The share of expected keywords from the reference answer that appear in the retrieved sources. Scored 0–100%."
            />
          </div>
          <CategoryBarChart
            title="Average MRR by category"
            scale="0-1"
            format="ratio"
            tierFor="ratio"
            rows={summary.categories.map((c) => ({
              category: c.category,
              value: c.avgMrr,
              count: c.count,
            }))}
          />
        </>
      )}
    </EvaluationSection>
  );
}
