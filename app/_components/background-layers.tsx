export function BackgroundLayers(): React.JSX.Element {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, #f6faf5 0%, #eef7f0 40%, #e8f3ea 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 900px 520px at 92% -8%, rgba(253,228,212,0.9) 0%, rgba(253,228,212,0) 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 700px 400px at -5% 110%, rgba(156,201,169,0.4) 0%, rgba(156,201,169,0) 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2d4a35 1px, transparent 1px), linear-gradient(to bottom, #2d4a35 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </>
  );
}
