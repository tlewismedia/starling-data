/**
 * Unit test for `selectEvaluationView` — the pure data-flow helper that
 * the `/evaluations` page uses to reconcile live session state against a
 * currently-selected saved report.
 *
 * This is the dropdown-switch assertion called out in issue #74 AC9(b):
 * selecting a saved report should replace the cards with the saved data,
 * and selecting `Current` again should restore the live session state.
 */

import { describe, it, expect } from "vitest";
import {
  selectEvaluationView,
  type AnswerSummary,
  type RetrievalSummary,
  type SavedReport,
} from "../../app/_components/evaluation-types";

const liveRetrieval: RetrievalSummary = {
  total: 5,
  mrr: 0.6,
  ndcg: 0.7,
  keywordCoverage: 0.5,
  pinpointPrecision: 0.4,
  categories: [{ category: "live-cat", avgMrr: 0.6, count: 5 }],
};

const liveAnswer: AnswerSummary = {
  total: 5,
  accuracy: 3.9,
  completeness: 3.5,
  relevance: 4.2,
  categories: [{ category: "live-cat", avgAccuracy: 3.9, count: 5 }],
};

const savedRetrieval: RetrievalSummary = {
  total: 10,
  mrr: 0.95,
  ndcg: 0.92,
  keywordCoverage: 0.88,
  pinpointPrecision: 0.7,
  categories: [{ category: "saved-cat", avgMrr: 0.95, count: 10 }],
};

const savedAnswer: AnswerSummary = {
  total: 10,
  accuracy: 4.8,
  completeness: 4.7,
  relevance: 4.9,
  categories: [{ category: "saved-cat", avgAccuracy: 4.8, count: 10 }],
};

const savedReport: SavedReport = {
  id: "abc123",
  savedAt: "2026-04-20T18:23:11.000Z",
  retrieval: savedRetrieval,
  answer: savedAnswer,
};

describe("selectEvaluationView", () => {
  it("returns live session state when `Current` is selected", () => {
    const view = selectEvaluationView({
      selectedId: "",
      liveRetrieval,
      liveAnswer,
      loadedReport: null,
    });
    expect(view.viewingSaved).toBe(false);
    expect(view.retrieval).toBe(liveRetrieval);
    expect(view.answer).toBe(liveAnswer);
  });

  it("returns the saved report's summaries when a saved id is selected", () => {
    const view = selectEvaluationView({
      selectedId: "abc123",
      liveRetrieval,
      liveAnswer,
      loadedReport: savedReport,
    });
    expect(view.viewingSaved).toBe(true);
    expect(view.retrieval).toBe(savedRetrieval);
    expect(view.answer).toBe(savedAnswer);
  });

  it("dropdown switch Current → saved → Current restores live state", () => {
    // Starting state: user ran evaluations this session.
    const atCurrentBefore = selectEvaluationView({
      selectedId: "",
      liveRetrieval,
      liveAnswer,
      loadedReport: null,
    });
    expect(atCurrentBefore.retrieval).toBe(liveRetrieval);
    expect(atCurrentBefore.answer).toBe(liveAnswer);

    // User selects a saved report — page fetches it, state updates.
    const atSaved = selectEvaluationView({
      selectedId: "abc123",
      liveRetrieval,
      liveAnswer,
      loadedReport: savedReport,
    });
    expect(atSaved.retrieval).toBe(savedRetrieval);
    expect(atSaved.answer).toBe(savedAnswer);

    // User toggles back to Current — live state must still be there.
    const atCurrentAfter = selectEvaluationView({
      selectedId: "",
      liveRetrieval,
      liveAnswer,
      loadedReport: savedReport, // stale loaded report shouldn't leak through
    });
    expect(atCurrentAfter.viewingSaved).toBe(false);
    expect(atCurrentAfter.retrieval).toBe(liveRetrieval);
    expect(atCurrentAfter.answer).toBe(liveAnswer);
  });

  it("falls back to null (empty-state cards) for null sections in a saved report", () => {
    const retrievalOnly: SavedReport = {
      id: "r1",
      savedAt: "2026-04-20T18:00:00.000Z",
      retrieval: savedRetrieval,
      answer: null,
    };
    const view = selectEvaluationView({
      selectedId: "r1",
      liveRetrieval,
      liveAnswer,
      loadedReport: retrievalOnly,
    });
    expect(view.retrieval).toBe(savedRetrieval);
    expect(view.answer).toBeNull();
  });

  it("does not leak live state through while the saved report is still loading", () => {
    // `selectedId` has changed to a new id, but the fetch is in-flight
    // and `loadedReport` is still null (or points to the previous id).
    const view = selectEvaluationView({
      selectedId: "abc123",
      liveRetrieval,
      liveAnswer,
      loadedReport: null,
    });
    expect(view.viewingSaved).toBe(true);
    expect(view.retrieval).toBeNull();
    expect(view.answer).toBeNull();
  });

  it("does not leak a stale loaded report from a prior selection", () => {
    // User selected `abc123`, then switched to `xyz789` before `xyz789`
    // finished loading. The page may still be holding onto the `abc123`
    // SavedReport. We must not show abc123's numbers under the xyz789 label.
    const view = selectEvaluationView({
      selectedId: "xyz789",
      liveRetrieval,
      liveAnswer,
      loadedReport: savedReport, // id `abc123`
    });
    expect(view.retrieval).toBeNull();
    expect(view.answer).toBeNull();
  });
});
