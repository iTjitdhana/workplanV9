"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
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

// สีสำหรับแต่ละงาน (ใช้สีตามงาน แทนสีตามคน)
const jobColors = [
  "bg-blue-400",
  "bg-green-400",
  "bg-yellow-400",
  "bg-purple-400",
  "bg-pink-400",
  "bg-indigo-400",
  "bg-orange-400",
  "bg-red-400",
  "bg-teal-400",
  "bg-cyan-400",
  "bg-lime-400",
  "bg-amber-400",
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
  
  while (h < endH || (h === endH && m <= endM)) {
    const timeSlot = `${pad(h)}:${pad(m)}`;
    
    // ข้ามเวลาพักเที่ยง 12:30-13:15
    if (timeSlot === "12:30") {
      result.push("12:30-13:15"); // เพิ่มคอลัมน์เวลาพักเที่ยง
      // ข้ามไปที่ 13:15
      h = 13;
      m = 15;
      continue;
    }
    
    result.push(timeSlot);
    m += step;
    if (m >= 60) { h++; m = m - 60; }
  }
  return result;
}

// ฟังก์ชันเตรียมข้อมูล Time Table แบบ Group by Job
function getTimeTableData(jobs: any[], users: any[]) {
  const timeSlots = generateTimeSlots();
  
  // 1. กรองเฉพาะงานที่ไม่ใช่ draft (workflow_status_id !== 1)
  const workPlanJobs = jobs.filter(job => {
    // ตรวจสอบว่าไม่ใช่ draft
    const isDraft = job.workflow_status_id === 1 || job.workflow_status_id === "1" || job.isDraft === true;
    return !isDraft && job.operators && job.start_time && job.end_time;
  });
  
  // 2. เรียงลำดับงานตามเวลาเริ่ม แล้วตามชื่องาน
  const sortedJobs = workPlanJobs.sort((a, b) => {
    const timeCompare = (a.start_time || "").localeCompare(b.start_time || "");
    if (timeCompare !== 0) return timeCompare;
    return (a.job_name || "").localeCompare(b.job_name || "");
  });
  
  // 3. สร้างข้อมูลแถวตาม Job และ Worker
  const data: any[] = [];
  const jobColorMap: { [key: string]: string } = {};
  let colorIndex = 0;
  
  sortedJobs.forEach((job) => {
    const operators = getOperatorsArray(job.operators);
    const jobKey = `${job.job_code}_${job.start_time}_${job.end_time}`;
    
    // กำหนดสีให้กับงานนี้ (ถ้ายังไม่มี)
    if (!jobColorMap[jobKey]) {
      jobColorMap[jobKey] = jobColors[colorIndex % jobColors.length];
      colorIndex++;
    }
    
    // กรองเฉพาะคนที่ไม่ใช่ RD, จรัญ, พี่สัญญา
    const validOperators = operators.filter(name => !["RD", "จรัญ", "พี่สัญญา"].includes(name));
    
    // สร้างแถวสำหรับแต่ละคนที่ทำงานนี้
    validOperators.forEach((workerName, workerIndex) => {
      const slots = timeSlots.map((slot, slotIndex) => {
        // ตรวจสอบว่าเป็นเวลาพักเที่ยงหรือไม่
        if (slot === "12:30-13:15") {
          // แสดงช่องพักเที่ยงเฉพาะเมื่องานนี้ครอบคลุมช่วงเวลาพักเที่ยง
          const jobCoversLunch = job.start_time <= "12:30" && job.end_time > "12:30";
          
          if (jobCoversLunch) {
            return {
              hasJob: false,
              jobName: "",
              jobCode: "",
              isStart: false,
              isEnd: false,
              colspan: 1,
              isLunchBreak: true
            };
          } else {
            // ถ้างานไม่ครอบคลุมช่วงพักเที่ยง ให้เป็นช่องว่างธรรมดา
            return {
              hasJob: false,
              jobName: "",
              jobCode: "",
              isStart: false,
              isEnd: false,
              colspan: 1,
              isLunchBreak: false
            };
          }
        }
        
        // ตรวจสอบว่า slot นี้อยู่ในช่วงเวลางานนี้หรือไม่
        if (slot >= job.start_time && slot < job.end_time) {
          // คำนวณ colspan
          const jobStartSlotIndex = timeSlots.findIndex(s => s >= job.start_time);
          const jobEndSlotIndex = timeSlots.findIndex(s => s >= job.end_time);
          const colspan = jobEndSlotIndex > jobStartSlotIndex ? jobEndSlotIndex - jobStartSlotIndex : 1;
          
          const isStart = slotIndex === jobStartSlotIndex;
          
          return {
            hasJob: true,
            jobName: job.job_name,
            jobCode: job.job_code,
            isStart,
            isEnd: false,
            colspan: isStart ? colspan : 1,
            isLunchBreak: false
          };
        }
        
        // ไม่มีงานใน slot นี้
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
        jobName: job.job_name,
        jobCode: job.job_code,
        startTime: job.start_time,
        endTime: job.end_time,
        jobColor: jobColorMap[jobKey],
        isFirstWorkerInJob: workerIndex === 0,
        workersInJob: validOperators.length
      });
    });
  });
  
  return { timeSlots, data, jobColorMap };
}

// คอมโพเนนต์ TimeTable แบบ Group by Job
function TimeTable({ jobs, users }: { jobs: any[], users: any[] }) {
  const { timeSlots, data } = getTimeTableData(jobs, users);
  
  return (
    <div className="overflow-x-auto rounded-lg border-2 border-gray-200 shadow-xl">
      <table className="min-w-full border-collapse bg-white">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="sticky left-0 z-20 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 text-left font-bold text-sm text-gray-700 border-r-2 border-gray-300 min-w-[180px]">
              <div className="flex items-center space-x-2">
                <span>👤</span>
                <span>ชื่อผู้ปฏิบัติงาน</span>
              </div>
            </th>
            {timeSlots.map((slot, idx) => (
              <th 
                key={slot} 
                className={`px-3 py-3 text-center font-bold text-sm min-w-[90px] border-r border-gray-200 ${
                  slot === "12:30-13:15" 
                    ? "bg-gradient-to-b from-orange-200 to-orange-100 text-orange-900" 
                    : "bg-gradient-to-b from-green-100 to-green-50 text-green-900"
                }`}
              >
                <div className="flex flex-col items-center">
                  {slot === "12:30-13:15" ? (
                    <>
                      <span className="text-xs">🍴</span>
                      <span className="font-bold">พักเที่ยง</span>
                    </>
                  ) : (
                    <span>{slot}</span>
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
              // แสดง Job Header สำหรับคนแรกในแต่ละงาน
              const showJobHeader = row.isFirstWorkerInJob;
              
              return (
                <React.Fragment key={`group-${row.jobCode}-${row.name}-${idx}`}>
                  {showJobHeader && (
                    <tr className="bg-gradient-to-r from-gray-50 to-white border-t-4 border-gray-300">
                      <td 
                        colSpan={timeSlots.length + 1} 
                        className="px-4 py-3 font-bold text-base"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-5 h-5 rounded-md shadow-md ${row.jobColor} border-2 border-white`}></div>
                          <span className="text-gray-800 text-base">
                            📋 {row.jobName}
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {row.startTime} - {row.endTime}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            👥 {row.workersInJob} คน
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                    <td className="sticky left-0 z-10 px-4 py-3 bg-white border-r-2 border-gray-200 whitespace-nowrap">
                      <div className="flex items-center space-x-3 pl-6">
                        <img 
                          src={staffImages[row.name] || "/placeholder-user.jpg"} 
                          alt={row.name} 
                          className="w-8 h-8 rounded-full object-cover border-2 border-gray-300 shadow-sm" 
                        />
                        <span className="font-semibold text-base text-gray-800">{row.name}</span>
                      </div>
                    </td>
                    {row.slots.map((slot: any, i: number) => {
                      // ข้าม slot ที่ไม่ใช่จุดเริ่มต้นของงาน
                      if (slot.hasJob && !slot.isStart) {
                        return null;
                      }
                      
                      return (
                        <td 
                          key={i} 
                          colSpan={slot.hasJob ? slot.colspan : 1}
                          className={`border-r border-gray-200 p-0 align-middle ${
                            slot.isLunchBreak 
                              ? "bg-gradient-to-b from-gray-200 to-gray-100" 
                              : slot.hasJob 
                                ? row.jobColor
                                : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          {slot.isLunchBreak && (
                            <div className="flex items-center justify-center py-4 px-2">
                              <span className="text-center leading-tight text-gray-700 font-bold text-sm">
                                🍴 พักเที่ยง
                              </span>
                            </div>
                          )}
                          {slot.hasJob && (
                            <div className="flex items-center justify-center py-4 px-2 min-h-[60px]">
                              <span 
                                className="text-center leading-tight text-white font-bold text-sm drop-shadow-sm px-2" 
                                title={slot.jobName}
                              >
                                {slot.jobName}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// Component หลัก TimeTablePopup
export function TimeTablePopup({ open, onOpenChange, selectedDate, jobs, users }: TimeTablePopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <DialogTitle className="flex items-center space-x-3 text-xl">
            <div className="p-2 bg-green-600 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-800">ตารางเวลาการทำงาน</div>
              <div className="text-sm font-normal text-gray-600 mt-1">
                {formatDateForDisplay(new Date(selectedDate), 'full')}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6 py-4" style={{ maxHeight: 'calc(95vh - 180px)' }}>
          <TimeTable
            jobs={jobs}
            users={users}
          />
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              📊 จำนวนงานทั้งหมด: <span className="font-semibold text-gray-800">{jobs.filter(j => {
                const isDraft = j.workflow_status_id === 1 || j.workflow_status_id === "1" || j.isDraft === true;
                return !isDraft;
              }).length} งาน</span>
            </div>
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-green-600 hover:bg-green-700 px-6"
            >
              ปิด
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

