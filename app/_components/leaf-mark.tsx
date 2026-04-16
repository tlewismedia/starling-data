export function LeafMark({
  size = 18,
}: {
  size?: number;
}): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M3 14.5C3 9 7 4 13.5 3.5C14 8 11 13.5 6 14.5C5 14.7 4 14.7 3 14.5Z"
        fill="#9cc9a9"
      />
      <path
        d="M3 14.5L11 6.5"
        stroke="#2d4a35"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
