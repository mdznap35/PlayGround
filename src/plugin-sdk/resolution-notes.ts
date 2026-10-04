/** Format a resolved/unresolved lookup summary note. */
export function formatResolvedUnresolvedNote(params: {
  resolved?: string[];
  unresolved?: string[];
}): string {
  const resolved = params.resolved ?? [];
  const unresolved = params.unresolved ?? [];
  const lines: string[] = [];
  if (resolved.length > 0) {
    lines.push(`Resolved: ${resolved.join(", ")}`);
  }
  if (unresolved.length > 0) {
    lines.push(`Unresolved (kept as typed): ${unresolved.join(", ")}`);
  }
  return lines.join("\n");
}
