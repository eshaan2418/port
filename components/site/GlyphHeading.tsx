/**
 * A section heading: real text in Inter, sentence case, with an optional hint
 * beside it (right-aligned on the heading's baseline; under it on narrow
 * screens). The hint has a pointer wording and a touch wording; both are in
 * the HTML and CSS shows the one that fits the device.
 */
export function GlyphHeading({ id, text, hint }: { id: string; text: string; hint?: { mouse: string; touch: string; icon?: boolean } }) {
  const title = text.charAt(0).toUpperCase() + text.slice(1);
  if (!hint)
    return (
      <div className="sh-row">
        <h2 id={id} className="sh">
          {title}
        </h2>
      </div>
    );
  const icon = hint.icon ? <PointerIcon /> : null;
  return (
    <div className="sh-row">
      <h2 id={id} className="sh">
        {title}
      </h2>
      <p className="sh-hint sh-hint-mouse">
        {icon}
        {hint.mouse}
      </p>
      <p className="sh-hint sh-hint-touch">
        {icon}
        {hint.touch}
      </p>
    </div>
  );
}

/** a small hand pointer */
function PointerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2" />
      <path d="M15 10.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.9-2.5L4.3 14.4a1.5 1.5 0 0 1 2.3-1.9L9 15" />
    </svg>
  );
}
