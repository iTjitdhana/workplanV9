"use client"

import React, { useMemo, useRef, useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, X } from "lucide-react"
import { formatDateForDisplay } from "@/lib/dateUtils"
import { getOperatorsArray } from "@/lib/utils"

// ข้อมูลรูปภาพพนักงาน
const staffImages: { [key: string]: string } = {
  // ชื่อไทย
  จรัญ: "/images/staff/จรัญ.jpeg",
  แมน: "/images/staff/แมน.jpg",
  แจ็ค: "/images/staff/แจ็ค.jpg",
  ป้าน้อย: "/images/staff/ป้าน้อย.jpg",
  พี่ตุ่น: "/images/staff/พี่ตุ่น.jpg",
  เอ: "/images/staff/เอ.jpg",
  โอเล่: "/images/staff/โอเล่.jpg",
  พี่ภา: "/images/staff/พี่ภา.jpg",
  อาร์ม: "/images/staff/อาร์ม.jpg",
  สาม: "/images/staff/สาม.jpg",
  มิ้นต์: "/placeholder.svg?height=80&width=80&text=มิ้นต์",
  นิค: "/placeholder.svg?height=80&width=80&text=นิค",
  เกลือ: "/placeholder.svg?height=80&width=80&text=เกลือ",
  เป้ง: "/placeholder.svg?height=80&width=80&text=เป้ง",
  // id_code
  arm: "/images/staff/อาร์ม.jpg",
  saam: "/images/staff/สาม.jpg",
  toon: "/images/staff/พี่ตุ่น.jpg",
  man: "/images/staff/แมน.jpg",
  sanya: "/images/staff/พี่สัญญา.jpg",
  noi: "/images/staff/ป้าน้อย.jpg",
  pha: "/images/staff/พี่ภา.jpg",
  ae: "/images/staff/เอ.jpg",
  rd: "/images/staff/RD.jpg",
  Ola: "/images/staff/โอเล่.jpg",
  JJ: "/images/staff/จรัญ.jpeg",
  Jak: "/images/staff/แจ็ค.jpg",
}

// พาเลตสีแบบ tailwind ตามที่ผู้ใช้กำหนด (โทนอ่อน)
export const COLOR_PALETTE = [
  // 200 tones (very soft)
  'bg-rose-200',
  'bg-red-200',
  'bg-orange-200',
  'bg-amber-200',
  'bg-yellow-200',
  'bg-lime-200',
  'bg-green-200',
  'bg-emerald-200',
  'bg-teal-200',
  'bg-cyan-200',
  'bg-sky-200',
  'bg-blue-200',
  'bg-indigo-200',
  'bg-violet-200',
  'bg-purple-200',
  'bg-fuchsia-200',
  'bg-pink-200',
  'bg-stone-200',
  'bg-slate-200',
  'bg-zinc-200',
  // 300 tones (still soft, extend capacity)
  'bg-rose-300',
  'bg-red-300',
  'bg-orange-300',
  'bg-amber-300',
  'bg-yellow-300',
  'bg-lime-300',
  'bg-green-300',
  'bg-emerald-300',
  'bg-teal-300',
  'bg-cyan-300',
  'bg-sky-300',
  'bg-blue-300',
  'bg-indigo-300',
  'bg-violet-300',
  'bg-purple-300',
  'bg-fuchsia-300',
  'bg-pink-300',
  'bg-stone-300',
  'bg-slate-300',
  'bg-zinc-300',
]

// สีสำหรับแต่ละคน (ยังเก็บไว้สำหรับอนาคต)
const workerColors: { [key: string]: string } = {
  "ป้าน้อย": "bg-blue-400",
  "พี่ตุ่น": "bg-green-400",
  "พี่ภา": "bg-yellow-400",
  "สาม": "bg-purple-400",
  "อาร์ม": "bg-pink-400",
  "เอ": "bg-indigo-400",
  "แจ็ค": "bg-orange-400",
  "แมน": "bg-red-400",
  "โอเล่": "bg-teal-400"
}

interface TimeTablePopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: string
  jobs: any[]
  users: any[]
}

// ฟังก์ชันสร้าง time slots 30 นาที
function generateTimeSlots(start = "08:00", end = "17:00", step = 30) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const result = [];
  let [h, m] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  
  // Generate start times at 30-min steps, stopping BEFORE end time (so last slot is 16:30 when end=17:00)
  let afterLunchFirstSlot = false;
  while (h < endH || (h === endH && m < endM)) {
    const timeSlot = `${pad(h)}:${pad(m)}`;
    
    // ข้ามเวลาพักเที่ยง 12:30-13:15
    if (timeSlot === "12:30") {
      result.push("12:30-13:15"); // พักเที่ยงกลับเป็น 12:30-13:15
      // ข้ามไปที่ 13:15 (คอลัมน์ถัดไปจะเป็น 13:15-14:00 ซึ่งยาว 45 นาที)
      h = 13;
      m = 15;
      afterLunchFirstSlot = true;
      continue;
    }
    
    result.push(timeSlot);
    // หลังพักเที่ยง ช่องแรก 13:15-14:00 ต้องใช้ 45 นาทีครั้งเดียว
    if (afterLunchFirstSlot) {
      m += 45;
      afterLunchFirstSlot = false;
    } else {
      m += step;
    }
    if (m >= 60) { h++; m = m - 60; }
  }
  return result;
}

// ฟังก์ชันเตรียมข้อมูล Time Table แบบ Group by Person (จัดกลุ่มตามคน)
function getTimeTableData(jobs: any[], users: any[]) {
  const timeSlots = generateTimeSlots();
  
  // 1. กรองงานที่แสดงใน TimeTable (ต้องมี operators_from_join และเวลา)
  const workPlanJobs = jobs.filter(job => {
    // ✅ กรองงาน A, B, C, D ออก
    const isDefaultJob = job.job_code === 'A' || job.job_code === 'B' || job.job_code === 'C' || job.job_code === 'D';
    if (isDefaultJob) return false;
    
    // ✅ แสดงเฉพาะงานที่มี operators_from_join (จาก work_plan_operators) และมีเวลา
    const hasOperatorsFromJoin = job.operators_from_join && job.start_time && job.end_time;
    return hasOperatorsFromJoin;
  });
  
  // 2. รวบรวมคนทั้งหมดและงานที่แต่ละคนทำ
  const personJobMap: { [key: string]: any[] } = {};
  const jobColorMap: { [key: string]: string } = {};
  let colorIndex = 0;
  
  // Normalize เวลาให้เป็น HH:mm
  const normalizeTime = (t: string) => {
    if (!t) return '';
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
  };
  
  // Fixed pastel-like palette (provided by user)
  const pastelByIndex = (idx: number) => COLOR_PALETTE[idx % COLOR_PALETTE.length];

  // Generate pastel HSL deterministically from job key, with minimum hue separation
  const MIN_HUE_GAP = 38; // degrees – force larger separation between colors
  const colorCache = new Map<string, string>();
  const usedHues: number[] = [];
  const hslFromKey = (key: string) => {
    if (colorCache.has(key)) return colorCache.get(key)!;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    // base hue from hash, then spread with golden angle for better dispersion
    let hue = (hash % 360);
    const golden = 137.508;
    let attempt = 0;
    const dist = (a:number,b:number)=> Math.min(Math.abs(a-b), 360 - Math.abs(a-b));
    while (usedHues.some(h => dist(h, hue) < MIN_HUE_GAP) && attempt < 720) {
      // jump by golden angle, and occasionally jump 180° to escape clusters
      hue = (hue + (attempt % 2 === 0 ? golden : 180)) % 360;
      attempt++;
    }
    usedHues.push(hue);
    // Alternate S/L to increase perceived difference even when hue distance passes threshold
    const satOptions = [60, 68, 72];
    const lightOptions = [82, 76, 70];
    const saturation = satOptions[usedHues.length % satOptions.length];
    const lightness = lightOptions[usedHues.length % lightOptions.length];
    const hsl = `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
    colorCache.set(key, hsl);
    return hsl;
  };

  workPlanJobs.forEach((job) => {
    // ✅ ใช้เฉพาะ operators_from_join (จาก work_plan_operators)
    const operators = getOperatorsArray(job.operators_from_join);
    // กรอง RD, พี่สัญญา ออก
    const validOperators = operators.filter(name => !["RD", "พี่สัญญา"].includes(name));
    // Use job identifier only (same job gets same color everywhere)
    const jobKeySimple = String(job.job_code || job.job_name || "unknown");
    
    // กำหนดสีให้กับงานนี้
    if (!jobColorMap[jobKeySimple]) {
      // Prefer deterministic HSL with separation; fallback to palette if needed
      jobColorMap[jobKeySimple] = hslFromKey(jobKeySimple) || pastelByIndex(colorIndex++);
    }
    
    // เพิ่มงานเข้าไปในแต่ละคน
    validOperators.forEach(workerName => {
      if (!personJobMap[workerName]) {
        personJobMap[workerName] = [];
      }
      personJobMap[workerName].push({
        ...job,
        jobColor: jobColorMap[jobKeySimple],
        start_time: normalizeTime(job.start_time),
        end_time: normalizeTime(job.end_time),
      });
    });
  });
  
  // 3. เรียงลำดับคนตามเวลางานแรก แล้วสร้างข้อมูลแถว
  const sortedWorkers = Object.keys(personJobMap).sort((a, b) => {
    const aJobs = personJobMap[a].sort((x, y) => x.start_time.localeCompare(y.start_time));
    const bJobs = personJobMap[b].sort((x, y) => x.start_time.localeCompare(y.start_time));
    
    if (aJobs.length === 0 && bJobs.length === 0) return a.localeCompare(b);
    if (aJobs.length === 0) return 1;
    if (bJobs.length === 0) return -1;
    
    const timeCompare = aJobs[0].start_time.localeCompare(bJobs[0].start_time);
    if (timeCompare !== 0) return timeCompare;
    return a.localeCompare(b);
  });
  
  // 4. สร้างข้อมูลแถวสำหรับแต่ละคน
  const data: any[] = [];
  
  sortedWorkers.forEach(workerName => {
    const workerJobs = (personJobMap[workerName] || []).sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );
    
    const slots = timeSlots.map((slot, slotIndex) => {
      // ตรวจสอบว่าเป็นเวลาพักเที่ยงหรือไม่
      if (slot === "12:30-13:15") {
        // แสดงพักเที่ยงถ้ามีงานที่ครอบคลุมช่วงนี้
        const jobCoversLunch = workerJobs.some(j => 
          j.start_time <= "12:30" && j.end_time > "12:30"
        );
        return {
          hasJob: false,
          jobName: "",
          jobCode: "",
          isStart: false,
          isEnd: false,
          colspan: 1,
          isLunchBreak: jobCoversLunch
        };
      }
      
      // หางานที่ตรงกับ slot นี้
      const matchingJob = workerJobs.find(job => {
        const slotStart = slot;
        return slotStart >= job.start_time && slotStart < job.end_time;
      });
      
      if (matchingJob) {
        // คำนวณ colspan
        const jobStartSlotIndex = timeSlots.findIndex(s => {
          if (s === "12:30-13:15") return false;
          return s >= matchingJob.start_time;
        });
        const jobEndSlotIndex = timeSlots.findIndex(s => {
          if (s === "12:30-13:15") return false;
          return s >= matchingJob.end_time;
        });
        const colspan = jobEndSlotIndex > jobStartSlotIndex 
          ? jobEndSlotIndex - jobStartSlotIndex 
          : 1;
        
        const isStart = slotIndex === jobStartSlotIndex;
        
        return {
          hasJob: true,
          jobName: matchingJob.job_name,
          jobCode: matchingJob.job_code,
          jobColor: matchingJob.jobColor,
          isStart,
          isEnd: false,
          colspan: isStart ? colspan : 1,
          isLunchBreak: false
        };
      }
      
      return {
        hasJob: false,
        jobName: "",
        jobCode: "",
        isStart: false,
        isEnd: false,
        colspan: 1,
        isLunchBreak: false
      };
    });
    
    data.push({
      name: workerName,
      slots,
      jobs: workerJobs
    });
  });
  
  return { timeSlots, data, jobColorMap };
}

// คอมโพเนนต์ TimeTable แบบ Group by Person (จัดกลุ่มตามคน)
function TimeTable({ jobs, users }: { jobs: any[], users: any[] }) {
  const { timeSlots, data } = getTimeTableData(jobs, users);

  // Helper: map time string HH:mm or special slot to slot index
  const isLunch = (s: string) => s === "12:30-13:15"
  const slotIndexForTime = (t: string) => {
    for (let i = 0; i < timeSlots.length; i++) {
      const s = timeSlots[i]
      if (isLunch(s)) continue
      if (s >= t) return i
    }
    return timeSlots.length - 1
  }

  // Build lanes for overlapping jobs per person
  const buildLanes = (workerJobs: any[]) => {
    type Block = { startIdx: number; endIdx: number; lane: number; jobName: string; color: string; startStr: string; endStr: string; durationStr: string }
    const jobsByStart = [...workerJobs].sort((a, b) => a.start_time.localeCompare(b.start_time))
    const lanesEnd: number[] = [] // end index per lane
    const blocks: Block[] = []

    const lunchIndex = timeSlots.findIndex(s => isLunch(s));
    
    for (const j of jobsByStart) {
      const startIdx = slotIndexForTime(j.start_time)
      let endIdx = (j.end_time === '12:30' && lunchIndex !== -1)
        ? lunchIndex
        : timeSlots.findIndex(s => !isLunch(s) && s >= j.end_time)
      
      // ✅ แก้ไข: ถ้า end_time >= 17:00 ให้จบที่ขอบขวาของ slot สุดท้าย (ไม่ให้เลยตาราง)
      if (j.end_time >= '17:00') {
        endIdx = timeSlots.length; // จบที่ขอบขวาของ slot สุดท้าย (16:30-17:00)
      } else if (endIdx === -1) {
        // ถ้าไม่เจอ slot (กรณีพิเศษอื่นๆ) ให้จบที่ slot สุดท้าย
        endIdx = timeSlots.length;
      }
      
      // ✅ ตรวจสอบว่า endIdx ไม่เกิน timeSlots.length (ไม่ให้เลยตาราง)
      if (endIdx > timeSlots.length) {
        endIdx = timeSlots.length;
      }

      // assign lane
      let lane = 0
      for (; lane < lanesEnd.length; lane++) {
        if (startIdx >= lanesEnd[lane]) break
      }
      if (lane === lanesEnd.length) lanesEnd.push(endIdx); else lanesEnd[lane] = endIdx
      const pad = (n:number)=> n.toString().padStart(2,'0')
      const [sh, sm] = (j.start_time || '00:00').split(':').map(Number)
      const [eh, em] = (j.end_time || '00:00').split(':').map(Number)
      const startDate = new Date(2000,0,1,sh,sm)
      const endDate = new Date(2000,0,1,eh,em)
      const diffMin = Math.max(0, Math.round((endDate.getTime() - startDate.getTime())/60000))
      const h = Math.floor(diffMin/60)
      const m = diffMin%60
      let durationStr = ''
      if (h > 0 && m > 0) {
        durationStr = `${h} ชั่วโมง ${m} นาที`
      } else if (h > 0) {
        durationStr = `${h} ชั่วโมง`
      } else {
        durationStr = `${m} นาที`
      }
      const startStr = `${pad(sh)}:${pad(sm)}`
      const endStr = `${pad(eh)}:${pad(em)}`
      blocks.push({ startIdx, endIdx, lane, jobName: j.job_name, color: j.jobColor || 'hsl(210, 20%, 85%)', startStr, endStr, durationStr })
    }
    const laneCount = lanesEnd.length || 1
    return { blocks, laneCount }
  }

  // Responsive measurements using ResizeObserver
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(1200)
  const [containerHeight, setContainerHeight] = useState<number>(600)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        setContainerWidth(cr.width)
        setContainerHeight(cr.height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const nameColPx = Math.round(Math.min(260, Math.max(160, containerWidth * 0.16)))
  const slotPx = Math.round(Math.min(160, Math.max(120, (containerWidth - nameColPx) / Math.max(1, timeSlots.length))))
  const tableMinWidth = nameColPx + timeSlots.length * slotPx;

  return (
    <div ref={containerRef} className="rounded-lg border-2 border-gray-200 shadow-xl w-full h-full" style={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'auto', width: '100%'}}>
      <div style={{width: '100%', minHeight: '100%', overflowX: 'auto', overflowY: 'auto'}}>
        <table className="border-collapse bg-white" style={{ minWidth: tableMinWidth, width: '100%', maxWidth: '100%', tableLayout: 'auto' }}>
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="sticky left-0 z-20 px-3 py-2 leading-tight bg-gradient-to-r from-gray-100 to-gray-50 text-left font-bold text-base md:text-lg text-gray-800 border-r-2 border-gray-300 h-9" style={{ minWidth: nameColPx }}>
              <div className="flex items-center space-x-2">
                <span>👤</span>
                <span>ชื่อผู้ปฏิบัติงาน</span>
              </div>
            </th>
            {timeSlots.map((slot, idx) => (
              <th 
                key={slot} 
                className={`px-2 py-1 leading-tight text-center font-semibold text-base md:text-xl border-r border-gray-200 h-9 whitespace-nowrap ${
                  slot === "12:30-13:15" 
                    ? "bg-gradient-to-b from-orange-200 to-orange-100 text-orange-900" 
                    : "bg-gradient-to-b from-green-100 to-green-50 text-green-900"
                }`}
                style={{ minWidth: slotPx }}
              >
                <div className="flex flex-col items-center">
                  {slot === "12:30-13:15" ? (
                    <>
                      <span className="text-xs">🍴</span>
                      <span className="font-bold whitespace-nowrap">พักเที่ยง</span>
                      <span className="text-[10px] md:text-xs">12:30-13:15</span>
                    </>
                  ) : (
                    (() => {
                      const [hh, mm] = slot.split(":").map(Number);
                      const start = new Date(2000,0,1,hh,mm,0,0);
                      const pad = (n:number) => n.toString().padStart(2,"0");
                      const plus = (hh === 13 && mm === 15) ? 45 : 30;
                      const end = new Date(start.getTime() + plus*60000);
                      const label = `${pad(start.getHours())}:${pad(start.getMinutes())}-${pad(end.getHours())}:${pad(end.getMinutes())}`;
                      return <span className="whitespace-nowrap">{label}</span>;
                    })()
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={timeSlots.length + 1} className="text-center py-12 text-gray-500">
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-4xl">📅</span>
                  <span className="text-lg">ไม่มีข้อมูลงานในวันนี้</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const jobCount = row.jobs?.length || 0;
              const { blocks, laneCount } = buildLanes(row.jobs || [])
              const baseLane = Math.round(Math.min(80, Math.max(40, containerHeight / Math.max(10, data.length))))
              const laneHeight = baseLane
              const rowHeight = Math.max(laneHeight * laneCount, baseLane + 16)

              return (
                <tr key={`person-${row.name}-${idx}`} className="border-b-2 border-gray-300">
                  <td className="sticky left-0 z-10 px-4 py-3 bg-white border-r-2 border-b border-gray-300 whitespace-nowrap align-top text-2xl md:text-4xl">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={staffImages[row.name] || "/placeholder-user.jpg"} 
                        alt={row.name} 
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-gray-300 shadow-sm" 
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-xl md:text-2xl text-gray-900">{row.name}</span>
                        {jobCount > 0 && (
                          <span className="text-base md:text-xl text-gray-600">{jobCount} งาน</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td colSpan={timeSlots.length} className="p-0 border-b border-gray-300">
                    <div className="relative border-y border-gray-200" style={{ height: rowHeight }}>
                      {/* vertical guides (background grid) */}
                      <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, minmax(0, 1fr))` }}>
                        {timeSlots.map((slot, i) => (
                          <div
                            key={`bg-${i}`}
                            className={`border-r ${isLunch(slot) ? 'bg-gray-200' : 'bg-white'}`}
                          />
                        ))}
                      </div>

                      {/* interactive time cells */}
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, minmax(0, 1fr))` }}>
                        {timeSlots.map((slot, i) => {
                          let label = ''
                          let startStr = ''
                          let endStr = ''
                          if (slot === '12:30-13:15') {
                            label = '12:30-13:15'
                            startStr = '12:30'
                            endStr = '13:15'
                          } else {
                            const [hh, mm] = slot.split(':').map(Number)
                            const start = new Date(2000,0,1,hh,mm)
                            const pad = (n:number)=> n.toString().padStart(2,'0')
                            startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`
                            const plus = (hh === 13 && mm === 15) ? 45 : 30
                            const end = new Date(start.getTime() + plus*60000)
                            endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`
                            label = `${startStr}-${endStr}`
                          }
                          return (
                            <div
                              key={`cell-${row.name}-${i}`}
                              role="gridcell"
                              tabIndex={0}
                              aria-label={`เวลา ${label}`}
                              title={label}
                              data-start={startStr}
                              data-end={endStr}
                              className="relative border-r border-transparent hover:bg-green-50/60 focus:bg-green-100/60 focus:outline-none"
                            />
                          )
                        })}
                      </div>
                      {/* blocks */}
                      {blocks.map((b, i) => {
                        // support 15-min granularity inside a 30-min column
                        const [sH, sM] = (b.startStr || '00:00').split(':').map(Number)
                        const [eH, eM] = (b.endStr || '00:00').split(':').map(Number)
                        let leftCols = b.startIdx
                        let widthCols = (b.endIdx - b.startIdx)
                        
                        // ✅ ตรวจสอบว่า widthCols ไม่เกินจำนวน slots (ไม่ให้เลยตาราง)
                        if (widthCols > timeSlots.length - b.startIdx) {
                          widthCols = timeSlots.length - b.startIdx;
                        }
                        
                        // if starts at :15 inside a normal 30-min cell
                        if (sM % 30 === 15) {
                          if (b.startStr === '13:15') {
                            // special 45-min slot: expand width by 0.5 but don't shift left
                            widthCols += 0.5
                          } else {
                            leftCols += 0.5
                            widthCols -= 0.5
                          }
                        }
                        // if ends at :15 reduce width by half a column
                        if (eM % 30 === 15) {
                          widthCols -= 0.5
                        }
                        
                        // ✅ ตรวจสอบอีกครั้งหลังปรับ widthCols
                        if (widthCols > timeSlots.length - leftCols) {
                          widthCols = timeSlots.length - leftCols;
                        }
                        if (widthCols < 0) widthCols = 0;
                        
                        const left = (leftCols / timeSlots.length) * 100
                        const width = (widthCols / timeSlots.length) * 100
                        
                        // ✅ ตรวจสอบว่า width + left ไม่เกิน 100% (ไม่ให้เลยตาราง)
                        const maxWidth = 100 - left;
                        const finalWidth = Math.min(width, maxWidth);
                        const tooltipPosClass = idx === 0 ? 'top-full mt-2' : 'bottom-full mb-2';
                        return (
                          <div
                            key={i}
                            className={`group absolute rounded text-base md:text-lg leading-tight flex items-center justify-start ring-1 ring-black/5`}
                            style={{ left: `${left}%`, width: `${finalWidth}%`, top: (b.lane * laneHeight) + 3, height: Math.max(12, laneHeight - 6), background: b.color }}
                          >
                            <span className="px-3 overflow-hidden text-ellipsis whitespace-nowrap text-black font-bold">{b.jobName}</span>
                            {/* Hover card tooltip (white card like example) */}
                            <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${tooltipPosClass} bg-white text-base md:text-lg text-gray-800 rounded-md px-4 py-3 shadow-xl border border-black/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50`}>
                              <div className="font-semibold">{b.jobName}</div>
                              <div className="text-gray-600">ระยะเวลา: {b.durationStr}</div>
                              <div className="text-gray-600">เวลา: {b.startStr} - {b.endStr}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// Component หลัก TimeTablePopup
export function TimeTablePopup({ open, onOpenChange, selectedDate, jobs, users }: TimeTablePopupProps) {
  // คำนวณจำนวนคนและงาน (ใช้ useMemo เพื่อ cache)
  const { data: timetableData } = useMemo(() => getTimeTableData(jobs, users), [jobs, users]);
  const workPlanJobs = useMemo(() => {
    return jobs.filter(j => {
      // ✅ กรองงาน A, B, C, D ออก
      const isDefaultJob = j.job_code === 'A' || j.job_code === 'B' || j.job_code === 'C' || j.job_code === 'D';
      if (isDefaultJob) return false;
      
      // ✅ แสดงเฉพาะงานที่มี operators_from_join (จาก work_plan_operators) และมีเวลา
      const hasOperatorsFromJoin = j.operators_from_join && j.start_time && j.end_time;
      return hasOperatorsFromJoin;
    });
  }, [jobs]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-full h-full max-w-full max-h-full p-0 gap-0 rounded-md [&>button]:hidden !grid-cols-none" 
        style={{
          height: '100vh',
          width: '100vw',
          maxWidth: '100vw',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          transform: 'none',
          margin: 0,
          padding: 0
        }}
      >
        <DialogHeader className="px-1 py-0 border-b bg-gradient-to-r from-green-50 to-blue-50 flex-none relative" style={{height: 'calc(100vh * 0.08)', flexShrink: 0, flexGrow: 0}}>
          {/* Large top-right close button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
            style={{ 
              position: 'absolute', 
              top: '8px', 
              right: '8px', 
              zIndex: 1000, 
              pointerEvents: 'auto',
              width: '48px',
              height: '48px'
            }}
            className="rounded-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 flex items-center justify-center shadow-lg cursor-pointer transition-colors border-2 border-gray-300"
            aria-label="ปิด"
          >
            <X className="w-7 h-7 pointer-events-none font-bold" />
          </button>
          <DialogTitle className="flex items-center space-x-2 text-2xl md:text-4xl h-full">
            <div className="p-0.5 bg-green-600 rounded">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-800 text-2xl md:text-4xl">ตารางเวลาการทำงานของผู้ปฏิบัติงาน</span>
              <span className="text-2xl md:text-4xl text-gray-700 font-semibold">{formatDateForDisplay(new Date(selectedDate), 'full')}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto px-2 py-2 w-full" style={{height: 'calc(100vh * 0.87)', minHeight: 0, flexShrink: 0, flexGrow: 1, overflow: 'auto', width: '100%'}}>
          <TimeTable
            jobs={jobs}
            users={users}
          />
        </div>
        <DialogFooter className="px-2 py-0.5 border-t bg-gray-50 flex-none w-full" style={{height: 'calc(100vh * 0.05)', flexShrink: 0, flexGrow: 0, width: '100%'}}>
          <div className="flex items-center justify-between w-full">
            <div className="text-base md:text-2xl text-gray-700">
              👥 จำนวนผู้ปฏิบัติงาน: <span className="font-semibold text-gray-800">{timetableData.length} คน</span>
              {' | '}
              📊 จำนวนงานทั้งหมด: <span className="font-semibold text-gray-800">{workPlanJobs.length} งาน</span>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

