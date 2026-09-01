/** Check if a job name already has an A–D or numeric prefix (e.g. "A งาน", "1 งาน"). */
export function hasJobNumberPrefix(name: string): boolean {
  return /^([A-D]|\d+)\s/.test(name);
}
