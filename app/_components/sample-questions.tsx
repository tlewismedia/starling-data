// TEMP_SAMPLE_QUESTIONS: Temporary dev affordance (issue #37).
// Delete this file and its imports when no longer needed.
// Grep for `TEMP_SAMPLE_QUESTIONS` to find all references.
"use client";

import { Card } from "./card";

const TEMP_SAMPLE_QUESTIONS: ReadonlyArray<{
  topic: string;
  question: string;
}> = [
  {
    topic: "Reg SHO",
    question:
      "When can a broker-dealer skip the locate requirement for a short sale?",
  },
  {
    topic: "FINRA 3110",
    question:
      "How often do branch offices need to be inspected under FINRA 3110?",
  },
  {
    topic: "CIP",
    question:
      "What documents count for verifying a new individual customer's identity under the CIP rule?",
  },
  {
    topic: "Marketing Rule",
    question:
      "Can we show a gross-return figure in an ad without also showing net returns?",
  },
  {
    topic: "Rule 15c3-1",
    question:
      "What's the lowest our net capital can go after we pay a dividend out to the parent?",
  },
];

export function SampleQuestions({
  onSelect,
}: {
  onSelect: (question: string) => void;
}): React.JSX.Element {
  return (
    <Card className="p-5" data-testid="sample-questions">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          Sample Questions
        </span>
        <span className="text-[11px] text-[#8a968f]">Click to use</span>
      </div>
      <ul className="mt-3 grid gap-2">
        {TEMP_SAMPLE_QUESTIONS.map((item) => (
          <li key={item.topic}>
            <button
              type="button"
              onClick={() => onSelect(item.question)}
              aria-label={`Use sample question for ${item.topic}`}
              className="group flex w-full items-start gap-3 rounded-xl border border-[#2d4a35]/10 bg-white/70 px-4 py-3 text-left transition-all hover:border-[#6ea580]/40 hover:bg-white focus:border-[#6ea580] focus:outline-none focus:ring-2 focus:ring-[#9cc9a9]/40"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-[#2d4a35]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#2d4a35]">
                {item.topic}
              </span>
              <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#1f2a23]">
                {item.question}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
