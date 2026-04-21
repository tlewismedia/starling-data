"use client";

/**
 * Save-report button used on `/evaluations`. Disabled unless at least one
 * of the current summaries is populated. Behaviour lives in the parent;
 * this file owns presentation and the disabled/saving states only.
 */
export function SaveReportButton({
  onClick,
  disabled,
  saving,
}: {
  onClick: () => void;
  disabled: boolean;
  saving: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      aria-busy={saving}
      aria-label="Save report"
      title={
        disabled && !saving
          ? "Run at least one evaluation to save a report"
          : undefined
      }
      className="inline-flex items-center gap-2 rounded-xl border border-[#2d4a35]/30 bg-white/80 px-4 py-1.5 text-[13px] font-medium text-[#2d4a35] shadow-sm transition-colors hover:bg-[#dfeee3]/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/80"
    >
      {saving ? "Saving…" : "Save report"}
    </button>
  );
}
