/**
 * Type definitions for TimeTable components
 */

import { ProductionItem, User } from '@/types/production';

/**
 * Extended ProductionItem with timetable-specific properties
 */
export interface TimeTableJob extends ProductionItem {
  operators_from_join?: string;
  jobColor?: string;
}

/**
 * Time slot data structure
 */
export interface TimeSlot {
  hasJob: boolean;
  jobName: string;
  jobCode: string;
  jobColor?: string;
  isStart: boolean;
  isEnd: boolean;
  colspan: number;
  isLunchBreak: boolean;
}

/**
 * Worker row data structure
 */
export interface WorkerRowData {
  name: string;
  slots: TimeSlot[];
  jobs: TimeTableJob[];
}

/**
 * Block data for rendering job blocks in lanes
 */
export interface JobBlock {
  startIdx: number;
  endIdx: number;
  lane: number;
  jobName: string;
  color: string;
  startStr: string;
  endStr: string;
  durationStr: string;
}

/**
 * Lanes data structure
 */
export interface LanesData {
  blocks: JobBlock[];
  laneCount: number;
}

/**
 * TimeTable data structure
 */
export interface TimeTableData {
  timeSlots: string[];
  data: WorkerRowData[];
  jobColorMap: Record<string, string>;
}

