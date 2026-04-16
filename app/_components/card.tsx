const BASE =
  "rounded-2xl bg-white/80 backdrop-blur-md ring-1 ring-[#2d4a35]/[0.08] shadow-[0_2px_8px_-2px_rgba(45,74,53,0.06),0_12px_32px_-8px_rgba(45,74,53,0.08)]";

export function Card({
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: {
  as?: "div" | "article";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>): React.JSX.Element {
  return (
    <Tag className={`${BASE} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
