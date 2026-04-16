import type { Citation, ChunkMetadata, Retrieval } from "../../shared/types";

// ── visual tokens ─────────────────────────────────────────────────────────

export const SERIF = { fontFamily: "var(--font-serif)" };

export const CARD =
  "rounded-2xl bg-white/80 backdrop-blur-md ring-1 ring-[#2d4a35]/[0.08] shadow-[0_2px_8px_-2px_rgba(45,74,53,0.06),0_12px_32px_-8px_rgba(45,74,53,0.08)]";

// ── authority styles ──────────────────────────────────────────────────────

export type Authority = ChunkMetadata["authority"];

export interface AuthorityStyle {
  strip: string;
  chip: string;
  label: string;
}

const AUTHORITY_STYLES: Record<Authority, AuthorityStyle> = {
  FINRA: {
    strip: "bg-[#9cc9a9]",
    chip: "bg-[#dfeee3] text-[#2d4a35]",
    label: "FINRA",
  },
  SEC: {
    strip: "bg-[#94a3b0]",
    chip: "bg-[#e4e9ee] text-[#394956]",
    label: "SEC",
  },
  MSRB: {
    strip: "bg-[#b3a98b]",
    chip: "bg-[#ede8dc] text-[#4a4433]",
    label: "MSRB",
  },
  FinCEN: {
    strip: "bg-[#c5a0a5]",
    chip: "bg-[#efdfe2] text-[#54383d]",
    label: "FinCEN",
  },
  Kestrel: {
    strip: "bg-[#fab89a]",
    chip: "bg-[#fde4d4] text-[#8b4a2f]",
    label: "Kestrel",
  },
};

const NEUTRAL_AUTHORITY_STYLE: AuthorityStyle = {
  strip: "bg-[#cfd4d1]",
  chip: "bg-[#e9ece9] text-[#435048]",
  label: "Source",
};

export function authorityStyle(
  authority: Authority | undefined,
): AuthorityStyle {
  if (authority && AUTHORITY_STYLES[authority]) return AUTHORITY_STYLES[authority];
  return NEUTRAL_AUTHORITY_STYLE;
}

// ── pipeline constants ────────────────────────────────────────────────────
// Keep in sync with pipeline/nodes/retrieve.ts.

export const RETRIEVE_THRESHOLD = 0.35;
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const GENERATE_MODEL = "gpt-4o-mini";

// ── confidence ────────────────────────────────────────────────────────────

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

export function confidenceTier(
  retrievals: readonly Retrieval[],
): ConfidenceTier {
  if (retrievals.length === 0) return "LOW";
  const top = Math.max(...retrievals.map((r) => r.score));
  if (top >= 0.8) return "HIGH";
  if (top >= 0.55) return "MEDIUM";
  return "LOW";
}

// ── answer parsing ────────────────────────────────────────────────────────
// Generator emits [^N] markers (see pipeline/nodes/generate.ts).

export type AnswerPart =
  | { kind: "text"; text: string }
  | { kind: "cite"; n: number };

export function parseAnswerParts(answer: string): AnswerPart[] {
  const parts: AnswerPart[] = [];
  const regex = /\[\^(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(answer)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: "text", text: answer.slice(lastIndex, match.index) });
    }
    parts.push({ kind: "cite", n: parseInt(match[1], 10) });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < answer.length) {
    parts.push({ kind: "text", text: answer.slice(lastIndex) });
  }
  return parts;
}

// ── helpers ───────────────────────────────────────────────────────────────

export function citationMarkerNumber(marker: string): number | null {
  const m = marker.match(/\[\^(\d+)\]/);
  return m ? parseInt(m[1], 10) : null;
}

export function findRetrievalForCitation(
  citation: Citation,
  retrievals: readonly Retrieval[],
): Retrieval | undefined {
  return retrievals.find((r) => r.chunkId === citation.chunkId);
}

export function shortHex(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  }
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ── types ─────────────────────────────────────────────────────────────────

export interface RunMeta {
  readonly run: string;
  readonly when: string;
  readonly durationMs: number;
}
