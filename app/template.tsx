// Re-mounts on navigation between top-level routes, so the fade-up animation
// below replays on each page switch while the layout shell stays in place.
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-page-fade-in motion-reduce:animate-none">
      {children}
    </div>
  );
}
