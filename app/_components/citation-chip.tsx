export function CitationChip({ n }: { n: number }): React.JSX.Element {
  return (
    <span className="mx-[2px] inline-flex h-5 min-w-[22px] -translate-y-[1px] items-center justify-center rounded-full bg-[#dfeee3] px-1.5 font-mono text-[11px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40 transition-all hover:bg-[#c4e0cd] hover:ring-[#9cc9a9]">
      {n}
    </span>
  );
}
