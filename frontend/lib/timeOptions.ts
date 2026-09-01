/**
 * Build time option strings (HH:mm) from start to end inclusive.
 */
export function generateTimeOptions(
  start = "08:00",
  end = "18:00",
  step = 15
): string[] {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const result: string[] = [];
  let [h, m] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  while (h < endH || (h === endH && m <= endM)) {
    result.push(`${pad(h)}:${pad(m)}`);
    m += step;
    if (m >= 60) {
      h++;
      m = m - 60;
    }
  }
  return result;
}
