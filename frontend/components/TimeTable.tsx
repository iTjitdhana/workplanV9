'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Clock } from 'lucide-react';

interface Job {
  id: string;
  job_name: string;
  start_time: string;
  end_time: string;
  user_name: string;
  operators?: string;
}

interface User {
  name: string;
  id_code: string;
}

interface TimeTableProps {
  jobs: Job[];
  users: User[];
  staffImages: Record<string, string>;
  selectedDate: string;
  formatDateForDisplay: (date: Date, format: 'full' | 'short') => string;
  isOpen: boolean;
  onClose: () => void;
}

// ฟังก์ชันสร้างช่องเวลา 30 นาที
function generateTimeSlots() {
  const slots = [];
  let currentTime = "08:00";
  
  while (currentTime < "17:00") {
    const [hours, minutes] = currentTime.split(':').map(Number);
    const nextMinutes = minutes + 30;
    const nextHours = hours + Math.floor(nextMinutes / 60);
    const finalMinutes = nextMinutes % 60;
    const nextTime = `${nextHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
    
    slots.push(`${currentTime}-${nextTime}`);
    
    currentTime = nextTime;
  }
  
  return slots;
}

// ฟังก์ชันเตรียมข้อมูลตารางเวลา
function getTimeTableData(jobs: Job[], users: User[], sortBy: 'time' | 'name' = 'time') {
  const mainUsers = users.filter(u => !["RD", "จรัญ", "พี่สัญญา"].includes(u.name));
  const timeSlots = generateTimeSlots();
  
  // เรียงลำดับพนักงาน
  const sortedUsers = mainUsers.sort((a, b) => {
    if (sortBy === 'name') {
      if (a.name === "แมน") return -1;
      if (b.name === "แมน") return 1;
      if (a.name === "แจ็ค") return 1;
      if (b.name === "แจ็ค") return -1;
      return a.name.localeCompare(b.name);
    } else {
      // เรียงตามเวลาที่เริ่มงาน
      const aJobs = jobs.filter(j => j.user_name === a.name).sort((x, y) => x.start_time.localeCompare(y.start_time));
      const bJobs = jobs.filter(j => j.user_name === b.name).sort((x, y) => x.start_time.localeCompare(y.start_time));
      
      if (aJobs.length === 0 && bJobs.length === 0) return a.name.localeCompare(b.name);
      if (aJobs.length === 0) return 1;
      if (bJobs.length === 0) return -1;
      
      const aStartTime = aJobs[0].start_time;
      const bStartTime = bJobs[0].start_time;
      
      if (aStartTime !== bStartTime) {
        return aStartTime.localeCompare(bStartTime);
      }
      
      return a.name.localeCompare(b.name);
    }
  });
  
  // สร้างข้อมูลสำหรับแต่ละคน
  const data = sortedUsers.map(user => {
    const userJobs = jobs.filter(job => job.user_name === user.name);
    const slots = timeSlots.map((slot, slotIndex) => {
      // หางานที่ตรงกับ slot นี้
      const matchingJob = userJobs.find(job => {
        const jobStartTime = job.start_time.substring(0, 5);
        const jobEndTime = job.end_time.substring(0, 5);
        const slotStart = slot.split('-')[0];
        const slotEnd = slot.split('-')[1];
        
        return slotStart >= jobStartTime && slotStart < jobEndTime;
      });
      
      if (matchingJob) {
        const jobStartTime = matchingJob.start_time.substring(0, 5);
        const jobEndTime = matchingJob.end_time.substring(0, 5);
        
        // คำนวณ colspan
        let jobStartSlotIndex = timeSlots.findIndex(s => s.split('-')[0] === jobStartTime);
        if (jobStartSlotIndex === -1) {
          jobStartSlotIndex = timeSlots.findIndex(s => s.split('-')[0] >= jobStartTime);
        }
        
        let jobEndSlotIndex = timeSlots.findIndex(s => s.split('-')[1] > jobEndTime);
        if (jobEndSlotIndex === -1) {
          jobEndSlotIndex = timeSlots.findIndex(s => s.split('-')[0] > jobEndTime);
        }
        
        const colspan = Math.max(1, jobEndSlotIndex - jobStartSlotIndex);
        
        // ตรวจสอบว่าเป็น slot แรกของงานนี้หรือไม่
        const isStart = slotIndex === jobStartSlotIndex;
        const isEnd = slotIndex === jobStartSlotIndex + colspan - 1;
        
        // ตรวจสอบว่าต้องแสดงพักเที่ยงหรือไม่
        const isLunchBreak = slotIndex >= timeSlots.findIndex(s => s.split('-')[0] === "12:30") && 
                            slotIndex <= timeSlots.findIndex(s => s.split('-')[0] === "13:30") &&
                            !userJobs.some(job => {
                              const jobStart = job.start_time.substring(0, 5);
                              const jobEnd = job.end_time.substring(0, 5);
                              return slot.split('-')[0] >= jobStart && slot.split('-')[0] < jobEnd;
                            });
        
        return {
          hasJob: true,
          jobName: matchingJob.job_name,
          jobCode: matchingJob.id,
          isStart: isStart,
          isEnd: isEnd,
          colspan: colspan,
          isLunchBreak: isLunchBreak
        };
      }
      
      // ตรวจสอบว่าต้องแสดงพักเที่ยงหรือไม่
      const isLunchBreak = slotIndex >= timeSlots.findIndex(s => s.split('-')[0] === "12:30") && 
                          slotIndex <= timeSlots.findIndex(s => s.split('-')[0] === "13:30");
      
      return {
        hasJob: false,
        jobName: "",
        jobCode: "",
        isStart: false,
        isEnd: false,
        colspan: 1,
        isLunchBreak: isLunchBreak
      };
    });
    
    return { name: user.name, slots };
  });
  
  return { timeSlots, data };
}

// ฟังก์ชันกำหนดสีให้กับงาน
const getJobColor = (jobName: string) => {
  const colorMap: Record<string, string> = {
    "ชาชูต้มซีอิ้ว": "bg-blue-400",
    "หมูปั้นก้อนนิ่ง": "bg-green-400",
    "ทำผัก": "bg-yellow-400",
    "ปลาแซลมอนสไลด์": "bg-purple-400",
    "ขนมผักกาด": "bg-pink-400",
    "ลูกรอก": "bg-indigo-400",
    "ซอส": "bg-orange-400",
    "เบิกของส่งสาขา": "bg-teal-400",
    "ตวงสูตร": "bg-cyan-400",
    "แป้งทอดมันข้าวโพด": "bg-lime-400"
  };
  
  // หาสีที่ตรงกับงาน
  for (const [key, color] of Object.entries(colorMap)) {
    if (jobName.includes(key)) {
      return color;
    }
  }
  
  // สีเริ่มต้น
  return "bg-gray-400";
};

export default function TimeTable({ 
  jobs, 
  users, 
  staffImages, 
  selectedDate, 
  formatDateForDisplay, 
  isOpen, 
  onClose 
}: TimeTableProps) {
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time');
  
  const { timeSlots, data } = useMemo(() => 
    getTimeTableData(jobs, users, sortBy), 
    [jobs, users, sortBy]
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] h-[95vh] max-w-none max-h-none overflow-hidden flex flex-col p-2">
        <DialogHeader className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle className="flex items-center space-x-2 text-sm sm:text-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <span className="truncate">ตารางเวลาการทำงาน - {formatDateForDisplay(new Date(selectedDate), 'full')}</span>
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">เรียงตาม:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'time' | 'name')}
                className="text-xs sm:text-sm border border-gray-300 rounded px-1 sm:px-2 py-1 bg-white min-w-0 flex-shrink"
              >
                <option value="time">เวลาที่เริ่มงาน</option>
                <option value="name">ชื่อพนักงาน</option>
              </select>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto mt-4">
          <div className="w-full overflow-x-auto">
            <table className="w-full border text-sm shadow-lg border-collapse table-fixed">
              <colgroup>
                <col className="w-32" />
                {timeSlots.map((slot, idx) => (
                  <col key={slot} className="w-16" />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="p-2 border bg-gray-100 text-left font-semibold text-sm sticky left-0 z-10">ชื่อ</th>
                  {timeSlots.map((slot, idx) => (
                    <th 
                      key={slot} 
                      className="p-1 sm:p-2 border text-center font-bold text-xs sm:text-sm relative bg-green-100 text-green-800"
                    >
                      <div className="hidden sm:block">
                        {slot}
                      </div>
                      <div className="sm:hidden text-xs">
                        {slot.split('-')[0]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={row.name}>
                    <td className="p-2 border bg-white whitespace-nowrap sticky left-0 z-10">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <img 
                          src={staffImages[row.name] || "/placeholder-user.jpg"} 
                          alt={row.name} 
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0" 
                        />
                        <span className="font-semibold text-xs sm:text-sm">{row.name}</span>
                      </div>
                    </td>
                    {row.slots.map((slot, i) => {
                      // ข้าม slot ที่ไม่ใช่จุดเริ่มต้นของงาน
                      if (slot.hasJob && !slot.isStart) {
                        return null;
                      }
                      
                      return (
                        <td 
                          key={i} 
                          colSpan={slot.hasJob ? slot.colspan : 1}
                          className={`border p-1 sm:p-3 relative min-h-[40px] sm:min-h-[50px] ${
                            slot.isLunchBreak 
                              ? "bg-gray-200 text-gray-600" 
                              : slot.hasJob 
                                ? getJobColor(slot.jobName) 
                                : "bg-white"
                          }`}
                        >
                          {slot.isLunchBreak && (
                            <div className="flex items-center justify-center text-xs sm:text-base font-bold min-h-[40px] sm:min-h-[50px] text-orange-800">
                              <span className="text-center leading-tight">พักเที่ยง</span>
                            </div>
                          )}
                          
                          {slot.hasJob && (
                            <div className="flex items-center justify-center text-xs sm:text-sm font-bold min-h-[40px] sm:min-h-[50px] text-white text-center leading-tight">
                              <span title={`${slot.jobName} (${slot.colspan} ช่อง x 30 นาที)`}>
                                {slot.jobName}
                              </span>
                            </div>
                          )}
                          
                          {/* เส้นแบ่งภายในแท่งงาน */}
                          {slot.hasJob && slot.colspan > 1 && (
                            <div className="absolute inset-0 flex">
                              {Array.from({ length: slot.colspan - 1 }).map((_, idx) => (
                                <div 
                                  key={idx} 
                                  className="flex-1 border-r border-white/30"
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* ข้อมูลเพิ่มเติมเกี่ยวกับโครงสร้างตาราง */}
          <div className="mt-2 sm:mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 border border-green-300"></div>
                <span className="text-xs">ช่องเวลา 30 นาที</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-200 border border-orange-300"></div>
                <span className="text-xs">เวลาพักเที่ยง</span>
              </div>
            </div>
            
            <div className="text-gray-500 text-xs">
              💡 <strong>หมายเหตุ:</strong> งานเดียวกันจะมีสีเดียวกัน | แต่ละช่องเวลา = 30 นาที | งานที่กินเวลานานจะขยายหลายช่อง
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

