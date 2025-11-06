/**
 * Utility functions for TimeTable component
 */

import { TIMETABLE_CONSTANTS } from './constants';
import { TimeTableJob, TimeSlot, WorkerRowData, TimeTableData, JobBlock } from './types';
import { getOperatorsArray } from '@/lib/utils';

/**
 * Check if a job code is a default job (A, B, C, D)
 */
export const isDefaultJob = (jobCode: string): boolean => {
  return (TIMETABLE_CONSTANTS.DEFAULT_JOB_CODES as readonly string[]).includes(jobCode);
};

/**
 * Check if a job is valid for display in timetable
 */
export const isValidWorkPlanJob = (job: TimeTableJob): boolean => {
  return (
    !isDefaultJob(job.job_code) &&
    !!job.operators_from_join &&
    !!job.start_time &&
    !!job.end_time
  );
};

/**
 * Pad number to 2 digits with leading zero
 */
export const padTime = (n: number): string => n.toString().padStart(2, '0');

/**
 * Normalize time string to HH:mm format
 */
export const normalizeTime = (t: string | undefined | null): string => {
  if (!t) return '';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

/**
 * Generate time slots for the timetable
 */
export function generateTimeSlots(
  start = TIMETABLE_CONSTANTS.WORK_HOURS.START,
  end = TIMETABLE_CONSTANTS.WORK_HOURS.END,
  step = TIMETABLE_CONSTANTS.WORK_HOURS.STEP
): string[] {
  const result: string[] = [];
  let [h, m] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let afterLunchFirstSlot = false;
  while (h < endH || (h === endH && m < endM)) {
    const timeSlot = `${padTime(h)}:${padTime(m)}`;

    // Handle lunch break
    if (timeSlot === TIMETABLE_CONSTANTS.LUNCH_BREAK.START) {
      result.push(TIMETABLE_CONSTANTS.LUNCH_BREAK.LABEL);
      h = 13;
      m = 15;
      afterLunchFirstSlot = true;
      continue;
    }

    result.push(timeSlot);
    
    // After lunch, first slot is 45 minutes
    if (afterLunchFirstSlot) {
      m += 45;
      afterLunchFirstSlot = false;
    } else {
      m += step;
    }
    
    if (m >= 60) {
      h++;
      m = m - 60;
    }
  }
  
  return result;
}

/**
 * Format time slot label
 */
export const formatTimeSlotLabel = (slot: string): string => {
  if (slot === TIMETABLE_CONSTANTS.LUNCH_BREAK.LABEL) {
    return slot;
  }
  
  const [hh, mm] = slot.split(':').map(Number);
  const start = new Date(2000, 0, 1, hh, mm, 0, 0);
  const plus = hh === 13 && mm === 15 ? 45 : 30;
  const end = new Date(start.getTime() + plus * 60000);
  
  return `${padTime(start.getHours())}:${padTime(start.getMinutes())}-${padTime(end.getHours())}:${padTime(end.getMinutes())}`;
};

/**
 * Calculate duration string from start and end times
 */
export const calculateDuration = (startTime: string, endTime: string): string => {
  const [sh, sm] = (startTime || '00:00').split(':').map(Number);
  const [eh, em] = (endTime || '00:00').split(':').map(Number);
  const startDate = new Date(2000, 0, 1, sh, sm);
  const endDate = new Date(2000, 0, 1, eh, em);
  const diffMin = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  
  if (h > 0 && m > 0) {
    return `${h} ชั่วโมง ${m} นาที`;
  } else if (h > 0) {
    return `${h} ชั่วโมง`;
  } else {
    return `${m} นาที`;
  }
};

/**
 * Check if slot is lunch break
 */
export const isLunchSlot = (slot: string): boolean => {
  return slot === TIMETABLE_CONSTANTS.LUNCH_BREAK.LABEL;
};

