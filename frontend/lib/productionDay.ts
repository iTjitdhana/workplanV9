import { formatDateForAPI } from "@/lib/dateUtils";
import { getOperatorsArray, isSpecialItem } from "@/lib/utils";

const DEFAULT_CODES = ["A", "B", "C", "D"];

export type DayProductionItem = {
  id?: number | string;
  job_code: string;
  job_name?: string;
  production_date: string;
  is_special?: number | boolean;
  workflow_status_id?: number;
  [key: string]: unknown;
};

/**
 * Split day's production into default (ABCD) → normal → special, sorted stably.
 */
export function getSelectedDayProduction(
  productionData: DayProductionItem[],
  options: {
    viewMode: "daily" | "weekly";
    selectedDate: string;
    selectedWeekDay: string | null;
  }
): DayProductionItem[] {
  const targetDate =
    options.viewMode === "daily" ? options.selectedDate : options.selectedWeekDay;
  if (!targetDate) return [];

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return "";
    return formatDateForAPI(dateStr);
  };

  const dayData = productionData.filter(
    (item) => normalizeDate(item.production_date) === normalizeDate(targetDate)
  );

  const defaultDrafts = dayData
    .filter((item) => DEFAULT_CODES.includes(item.job_code))
    .sort(
      (a, b) => DEFAULT_CODES.indexOf(a.job_code) - DEFAULT_CODES.indexOf(b.job_code)
    );

  const normalJobs = dayData.filter(
    (item) => !DEFAULT_CODES.includes(item.job_code) && !isSpecialItem(item as any)
  );
  const specialJobs = dayData.filter(
    (item) => !DEFAULT_CODES.includes(item.job_code) && isSpecialItem(item as any)
  );

  const sortFn = (a: DayProductionItem, b: DayProductionItem) =>
    (Number(a.id) || 0) - (Number(b.id) || 0);

  normalJobs.sort(sortFn);
  specialJobs.sort(sortFn);

  return [...defaultDrafts, ...normalJobs, ...specialJobs];
}

/** Normalize time to HH:mm for form selects (matches prior planner behavior). */
export function normalizeTimeForForm(t: string): string {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  return `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`;
}

export function sortJobsForDisplay(jobs: any[]) {
  return [...jobs].sort((a, b) => {
    const timeA = a.start_time || "00:00";
    const timeB = b.start_time || "00:00";
    const timeComparison = timeA.localeCompare(timeB);
    if (timeComparison !== 0) return timeComparison;
    const opA = (typeof a.operators === "string" ? a.operators : "").split(", ")[0] || "";
    const opB = (typeof b.operators === "string" ? b.operators : "").split(", ")[0] || "";
    const indexA = opA.indexOf("อ");
    const indexB = opB.indexOf("อ");
    if (indexA === 0 && indexB !== 0) return -1;
    if (indexB === 0 && indexA !== 0) return 1;
    return opA.localeCompare(opB);
  });
}

/** Daily View: default → normal by time → special */
export function getSortedDailyProduction(jobs: any[]) {
  const defaultCodes = ["A", "B", "C", "D"];

  const defaultDrafts = jobs.filter((j) => defaultCodes.includes(j.job_code));
  const normalJobs = jobs.filter((j) => !defaultCodes.includes(j.job_code) && j.is_special !== 1);
  const specialJobs = jobs.filter((j) => j.is_special === 1 && !defaultCodes.includes(j.job_code));

  const normalDrafts = normalJobs.filter((j) => j.isDraft);
  const normalCompleted = normalJobs.filter((j) => !j.isDraft);
  const specialDrafts = specialJobs.filter((j) => j.isDraft);
  const specialCompleted = specialJobs.filter((j) => !j.isDraft);

  defaultDrafts.sort((a, b) => defaultCodes.indexOf(a.job_code) - defaultCodes.indexOf(b.job_code));

  const getSortTime = (item: any, emptyLast = false): string => {
    const t = item?.start_time;
    const empty = emptyLast ? "99:99" : "00:00";
    if (t == null || t === "") return empty;
    if (typeof t === "string") {
      const s = t.trim().substring(0, 5);
      return s && s !== "--:--" ? s : empty;
    }
    if (typeof t === "object" && typeof (t as Date).getHours === "function") {
      const h = (t as Date).getHours(),
        m = (t as Date).getMinutes();
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return empty;
  };

  const sortFn = (a: any, b: any) => {
    const timeA = getSortTime(a, false);
    const timeB = getSortTime(b, false);
    const timeComparison = timeA.localeCompare(timeB);
    if (timeComparison !== 0) return timeComparison;
    const opA = String(getOperatorsArray(a.operators)[0] || "");
    const opB = String(getOperatorsArray(b.operators)[0] || "");
    const indexA = opA.indexOf("อ");
    const indexB = opB.indexOf("อ");
    if (indexA === 0 && indexB !== 0) return -1;
    if (indexB === 0 && indexA !== 0) return 1;
    return opA.localeCompare(opB);
  };

  const sortFnDraftsByTime = (a: any, b: any) => {
    const timeA = getSortTime(a, true);
    const timeB = getSortTime(b, true);
    const timeComparison = timeA.localeCompare(timeB);
    if (timeComparison !== 0) return timeComparison;
    const opA = String(getOperatorsArray(a.operators)[0] || "");
    const opB = String(getOperatorsArray(b.operators)[0] || "");
    const indexA = opA.indexOf("อ");
    const indexB = opB.indexOf("อ");
    if (indexA === 0 && indexB !== 0) return -1;
    if (indexB === 0 && indexA !== 0) return 1;
    return opA.localeCompare(opB);
  };

  specialCompleted.sort(sortFn);

  const normalJobsByTime = [...normalCompleted, ...normalDrafts];
  normalJobsByTime.sort(sortFnDraftsByTime);

  const sortDraftsByCreatedAt = (a: any, b: any) => {
    const createdAtA = new Date(a.created_at || a.updated_at || 0);
    const createdAtB = new Date(b.created_at || b.updated_at || 0);
    return createdAtA.getTime() - createdAtB.getTime();
  };
  specialDrafts.sort(sortDraftsByCreatedAt);

  return [...defaultDrafts, ...normalJobsByTime, ...specialCompleted, ...specialDrafts];
}
