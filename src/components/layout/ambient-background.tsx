/** Slow-moving colour fields behind the glass. Pure CSS (transform-only animation), paused for reduced motion. */
export function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden>
      <span className="b1" />
      <span className="b2" />
      <span className="b3" />
      <span className="b4" />
      <div className="grain" />
    </div>
  );
}
