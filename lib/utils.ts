/** join class names (the shadcn `cn` helper, without tailwind-merge: nothing here relies on class conflict resolution) */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
