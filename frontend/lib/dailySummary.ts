import { TIMETABLE_CONSTANTS } from "@/components/timetable/constants";
import { getOperatorsArray } from "@/lib/utils";

type UserLite = { name: string };

export type WorkerDetail = {
  name: string;
  hours: number;
  quota: number;
  remaining: number;
  status: string;
  displayHours: number;
  displayText: string;
};

export type DailySummary = {
  totalWorkers: number;
  totalWorkHours: number;
  totalUsedTime: number;
  capacityPercentage: number;
  validJobsCount: number;
  uniqueWorkers: string[];
  lunchBreakDeduction: number;
  availableWorkers: string[];
  availableSupportStaff: string[];
  workerDetails: WorkerDetail[];
};

export function calculateDailySummary(jobs: any[], users: UserLite[] = []) {
    // กรองเฉพาะงานที่มีผู้ปฏิบัติงานและเวลา
    const validJobs = jobs.filter(job => 
      job.operators && 
      job.operators.length > 0 && 
      job.start_time && 
      job.end_time
    );

    // รวบรวมผู้ปฏิบัติงานทั้งหมดที่ไม่ซ้ำในวันนั้น
    const allWorkers = new Set<string>();
    
    // คำนวณเวลาที่ใช้จริง (คน-ชั่วโมง)
    let totalUsedTime = 0;
    let totalWorkHours = 0;

    // สร้าง Map สำหรับเก็บช่วงเวลาทำงานของแต่ละคน (เพื่อคำนวณเวลาจริงโดยไม่นับซ้ำ)
    const workerTimeIntervals = new Map<string, Array<{ start: Date; end: Date }>>();

    // รวบรวมช่วงเวลาทำงานของแต่ละคน
    validJobs.forEach(job => {
      const workers = getOperatorsArray(job.operators);
      workers.forEach((worker: string) => {
        allWorkers.add(worker);
        
        const startTime = new Date(`2000-01-01 ${job.start_time}`);
        const endTime = new Date(`2000-01-01 ${job.end_time}`);
        
        if (!workerTimeIntervals.has(worker)) {
          workerTimeIntervals.set(worker, []);
        }
        workerTimeIntervals.get(worker)!.push({ start: startTime, end: endTime });
      });
    });

    // ฟังก์ชันรวมช่วงเวลาที่ทับซ้อนกัน (merge overlapping intervals)
    const mergeIntervals = (intervals: Array<{ start: Date; end: Date }>): Array<{ start: Date; end: Date }> => {
      if (intervals.length === 0) return [];
      
      // เรียงตามเวลาเริ่มต้น
      const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
      const merged: Array<{ start: Date; end: Date }> = [sorted[0]];
      
      for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const last = merged[merged.length - 1];
        
        // ถ้าช่วงเวลาทับซ้อนหรือต่อกัน ให้รวมเข้าด้วยกัน
        if (current.start.getTime() <= last.end.getTime()) {
          last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
        } else {
          merged.push(current);
        }
      }
      
      return merged;
    };

    // ฟังก์ชันคำนวณเวลาจริงจากช่วงเวลา (หักเวลาพักเที่ยง)
    const calculateActualHours = (intervals: Array<{ start: Date; end: Date }>): number => {
      const lunchStart = new Date(`2000-01-01 ${TIMETABLE_CONSTANTS.LUNCH_BREAK.START}`);
      const lunchEnd = new Date(`2000-01-01 ${TIMETABLE_CONSTANTS.LUNCH_BREAK.END}`);
      
      let totalHours = 0;
      
      intervals.forEach(interval => {
        let durationHours = (interval.end.getTime() - interval.start.getTime()) / (1000 * 60 * 60);
        
        // หักเวลาพักเที่ยงถ้ามีส่วนทับ
        if (interval.start < lunchEnd && interval.end > lunchStart) {
          const overlapStart = interval.start > lunchStart ? interval.start : lunchStart;
          const overlapEnd = interval.end < lunchEnd ? interval.end : lunchEnd;
          const overlapHours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
          durationHours -= overlapHours;
        }
        
        totalHours += durationHours;
      });
      
      return totalHours;
    };

    // คำนวณเวลาจริงของแต่ละคน (รวมช่วงเวลาที่ทับซ้อน)
    const workerHours = new Map<string, number>();
    workerTimeIntervals.forEach((intervals, worker) => {
      const merged = mergeIntervals(intervals);
      const actualHours = calculateActualHours(merged);
      workerHours.set(worker, actualHours);
      totalUsedTime += actualHours; // สำหรับ totalUsedTime ใช้เวลาจริงของแต่ละคน
    });

    // จำนวนผู้ปฏิบัติงานที่ไม่ซ้ำในวันนั้น
    const totalWorkers = allWorkers.size;

    // คำนวณเวลาพักเที่ยงจาก TIMETABLE_CONSTANTS (12:30-13:15 = 45 นาที)
    const lunchStartTime = new Date(`2000-01-01 ${TIMETABLE_CONSTANTS.LUNCH_BREAK.START}`);
    const lunchEndTime = new Date(`2000-01-01 ${TIMETABLE_CONSTANTS.LUNCH_BREAK.END}`);
    const lunchBreakMinutes = (lunchEndTime.getTime() - lunchStartTime.getTime()) / (1000 * 60);
    const lunchBreakHours = lunchBreakMinutes / 60; // 45 นาที = 0.75 ชั่วโมง

    // คำนวณชั่วโมงงาน (จำนวนผู้ปฏิบัติงาน × เวลาทำงานจริงต่อวัน)
    // เวลาทำงานจริง = (17:00 - 8:00) - เวลาพักเที่ยง = 9 - 0.75 = 8.25 ชั่วโมง
    const workStartTime = new Date(`2000-01-01 ${TIMETABLE_CONSTANTS.WORK_HOURS.START}`);
    const workEndTime = new Date(`2000-01-01 ${TIMETABLE_CONSTANTS.WORK_HOURS.END}`);
    const totalWorkMinutes = (workEndTime.getTime() - workStartTime.getTime()) / (1000 * 60);
    const totalWorkHoursPerDay = totalWorkMinutes / 60; // 9 ชั่วโมง
    const workHoursPerDay = totalWorkHoursPerDay - lunchBreakHours; // 9 - 0.75 = 8.25 ชั่วโมง
    totalWorkHours = totalWorkers * workHoursPerDay;

    // คำนวณ Capacity (%)
    const capacityPercentage = totalWorkHours > 0 ? (totalUsedTime / totalWorkHours) * 100 : 0;

    // สร้างรายการข้อมูลของแต่ละคน
    const workerDetails = Array.from(allWorkers).map(worker => {
      const hours = workerHours.get(worker) || 0;
      const quota = workHoursPerDay; // โคต้าเวลาทำงานจริงต่อวัน (8 ชั่วโมง - เวลาพักเที่ยงจาก TIMETABLE_CONSTANTS)
      const maxQuota = 7.5; // เกิน 7.5 ชั่วโมง ให้ถือว่าเต็มเวลา (7.25 + buffer 15 นาที)
      const remaining = Math.max(0, quota - hours);
      
      // ใช้ threshold เล็กน้อยเพื่อจัดการปัญหา floating point precision
      const EPSILON = 0.001; // 0.001 ชั่วโมง = 0.06 นาที
      
      let status, displayHours, displayText;
      
      // ฟังก์ชันแปลงเวลาจากทศนิยมเป็นรูปแบบที่อ่านง่าย
      const formatRemainingTime = (hours: number) => {
        // ปัดเศษเพื่อหลีกเลี่ยงปัญหา floating point
        const roundedHours = Math.round(hours * 60) / 60; // ปัดเศษเป็นนาทีแล้วแปลงกลับ
        
        if (roundedHours <= EPSILON) return '0 ชั่วโมง';
        
        // ใช้ Math.floor เพื่อหลีกเลี่ยงปัญหา rounding ที่อาจทำให้ได้ 60 นาที
        const totalMinutes = Math.round(roundedHours * 60); // แปลงเป็นนาทีทั้งหมดแล้วปัดเศษ
        const wholeHours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (wholeHours === 0) {
          return `ว่าง ${minutes} นาที`;
        } else if (minutes === 0) {
          return `ว่าง ${wholeHours} ชั่วโมง`;
        } else {
          return `ว่าง ${wholeHours} ชั่วโมง ${minutes} นาที`;
        }
      };
      
      // ตรวจสอบสถานะ: ใช้ EPSILON เพื่อจัดการปัญหา floating point precision
      if (hours >= maxQuota || remaining <= EPSILON) {
        // เกิน 7.5 ชั่วโมง (maxQuota) หรือเหลือน้อยมาก (<= 0.001 ชั่วโมง) ให้แสดงว่าเต็มเวลา
        status = 'full';
        displayHours = quota;
        displayText = 'ได้รับงานเต็มเวลา';
      } else if (remaining > EPSILON && remaining <= 2) {
        // เหลือมากกว่า 0.001 ชั่วโมง แต่ไม่เกิน 2 ชั่วโมง
        status = 'limited';
        displayHours = hours;
        displayText = formatRemainingTime(remaining);
      } else {
        // เหลือมากกว่า 2 ชั่วโมง
        status = 'available';
        displayHours = hours;
        displayText = formatRemainingTime(remaining);
      }
      
      return {
        name: worker,
        hours: hours,
        quota: quota,
        remaining: remaining,
        status: status,
        displayHours: displayHours,
        displayText: displayText
      };
    }).sort((a, b) => b.remaining - a.remaining); // เรียงตามเวลาว่างจากมากไปน้อย (ว่างมากขึ้นก่อน)

    return {
      totalWorkers,
      totalWorkHours,
      totalUsedTime,
      capacityPercentage,
      validJobsCount: validJobs.length,
      uniqueWorkers: Array.from(allWorkers), // เพิ่มรายชื่อผู้ปฏิบัติงานที่ไม่ซ้ำ
      lunchBreakDeduction: lunchBreakHours, // ข้อมูลเวลาพักเที่ยงที่หัก (คำนวณจาก TIMETABLE_CONSTANTS)
      availableWorkers: users
        .filter(user => !allWorkers.has(user.name)) // คนที่ไม่ได้ทำงาน
        .filter(user => !['RD', 'พี่สัญญา'].includes(user.name)) // กรองพนักงานเสริมออก
        .map(user => user.name), // คนที่ยังรับงานได้ (เฉพาะผู้ปฏิบัติงานหลัก)
      availableSupportStaff: users
        .filter(user => !allWorkers.has(user.name)) // คนที่ไม่ได้ทำงาน
        .filter(user => ['RD', 'พี่สัญญา'].includes(user.name)) // เฉพาะพนักงานเสริม
        .map(user => user.name), // พนักงานเสริมที่ว่าง
      workerDetails: workerDetails // รายละเอียดของแต่ละคน
    };
}
