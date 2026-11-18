/** Re-mounts on every navigation, giving each page a short fade-and-rise entrance. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out motion-reduce:animate-none">
      {children}
    </div>
  );
}
