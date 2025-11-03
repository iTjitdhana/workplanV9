"use client";
import React, { useEffect, useState, useRef } from "react";
import { Noto_Sans_Thai } from "next/font/google";
import { translations, Language } from "@/lib/translations";
import { debugLog, debugError, getApiUrl } from "@/lib/config";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

function formatUsedTime(sec: number) {
  if (sec == null) return "–";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TrackerPage() {
  const [date, setDate] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  // แก้ไข hydration error
  useEffect(() => {
    setIsClient(true);
    // ตั้งค่าวันที่ปัจจุบันหลังจาก component mount
    const today = new Date();
    setDate(today.toISOString().slice(0, 10));
  }, []);
  const [workplans, setWorkplans] = useState<any[]>([]);
  const [selectedWorkplan, setSelectedWorkplan] = useState<any>(null);
  const [processSteps, setProcessSteps] = useState<any[]>([]);
  const [processLogs, setProcessLogs] = useState<any[]>([]);
  const [selectedProcessIndex, setSelectedProcessIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [usedSec, setUsedSec] = useState<number | null>(null);
  const [statusType, setStatusType] = useState<"success"|"fail"|"info">("info");
  const [language, setLanguage] = useState<Language>('thai');
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  


  // สร้างงานตวงสูตรแบบ virtual (ไม่บันทึกลง database)
  const createVirtualWeighingJob = () => {
    return [{
      id: 'virtual_weighing_job',
      job_code: 'WEIGHING',
      job_name: 'งานตวงสูตร',
      production_date: date,
      operators: 'พี่ภา',
      isWeighingJob: true // flag สำหรับระบุว่าเป็นงานตวงสูตร
    }];
  };

  // สร้างขั้นตอนการผลิตสำหรับงานตวงสูตร
  const createWeighingProcessSteps = (jobCode: string) => {
    return [
      { process_number: 1, process_description: 'ตวงสูตรรอบที่ 1' },
      { process_number: 2, process_description: 'ตวงสูตรรอบที่ 2' },
      { process_number: 3, process_description: 'ตวงสูตรรอบที่ 3' },
      { process_number: 4, process_description: 'ตวงสูตรรอบที่ 4' }
    ];
  };

  // สร้างขั้นตอนการผลิตสำหรับงานปกติ (new หรือ 1)
  const createNormalProcessSteps = () => {
    return [
      { process_number: 1, process_description: 'เริ่มต้นผลิต-สิ้นสุดการผลิต' }
    ];
  };

  // Load workplans by date
  useEffect(() => {
    setIsLoading(true);
    debugLog('Starting to load workplans for date:', date);
    
    fetch(getApiUrl(`/api/work-plans?date=${date}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
      .then(res => {
        debugLog('API Response status:', res.status);
        debugLog('API Response headers:', res.headers);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        debugLog('Raw API response:', data);
        
        // ตรวจสอบว่า response มี success field และเป็น false หรือไม่
        if (data.success === false) {
          throw new Error(data.message || 'Backend returned error');
        }
        
        // ตรวจสอบว่า data.data มีอยู่และเป็น array
        if (!data.data || !Array.isArray(data.data)) {
          debugLog('No data or data is not array:', data);
          return { ...data, data: [] };
        }
        
        return data;
      })
      .then(data => {
        debugLog('Loaded workplans (processed):', data);
        debugLog('Workplans count:', data.data.length);
        debugLog('Requested date (from state):', date);
        
        if (data.data && data.data.length > 0) {
          debugLog('First workplan sample:', data.data[0]);
          debugLog('All workplans production dates:', data.data.map((wp: any) => wp.production_date));
        } else {
          debugLog('No workplans found for date:', date);
        }
        const filteredWorkplans = (data.data || []).filter((wp: any) => {
          // กรองงานที่ถูกยกเลิก
          if (wp.status_name === 'งานผลิตถูกยกเลิก') {
            debugLog('Filtering out cancelled workplan:', wp.job_name);
            return false;
          }
          // กรองเฉพาะงานของวันที่เลือก
          const wpDate = wp.production_date; // อาจเป็น ISO string หรือ 'YYYY-MM-DD' string
          // แปลง wpDate เป็นรูปแบบ 'YYYY-MM-DD' เพื่อเปรียบเทียบ
          let wpDateFormatted = wpDate;
          if (wpDate && typeof wpDate === 'string') {
            // ถ้าเป็น ISO string ให้ตัดเอาเฉพาะวันที่
            if (wpDate.includes('T')) {
              wpDateFormatted = wpDate.split('T')[0];
            }
          }
          debugLog('Comparing dates:', { 
            originalWpDate: wpDate, 
            formattedWpDate: wpDateFormatted, 
            requestedDate: date, 
            isEqual: wpDateFormatted === date 
          });
          if (wpDateFormatted !== date) {
            debugLog('Filtering out workplan with different date:', wpDateFormatted, 'vs', date);
            return false;
          }
          debugLog('Keeping workplan:', wp.job_name, 'with date:', wpDate);
          return true;
        });

        // เพิ่มงานตวงสูตรเข้าไปในรายการ
        const weighingJobs = createVirtualWeighingJob();
        const allWorkplans = [...filteredWorkplans, ...weighingJobs];
        
        debugLog('[DEBUG] All workplans including weighing jobs:', allWorkplans);
        setWorkplans(allWorkplans);
        
        // ไม่เลือกงานตวงสูตรโดยอัตโนมัติ เพื่อให้ผู้ใช้เลือกเอง
        // if (!selectedWorkplan && weighingJobs.length > 0) {
        //   debugLog('[DEBUG] Auto-selecting weighing job:', weighingJobs[0]);
        //   setSelectedWorkplan(weighingJobs[0]);
        // }
        
        // อัปเดตเวลาล่าสุดเมื่อโหลดข้อมูลครั้งแรก
        setLastUpdateTime(new Date().toLocaleTimeString('th-TH'));
       })
                       .catch((error: any) => {
          debugError('[DEBUG] Error loading workplans:', error);
          setWorkplans([]);
          
          // จัดการ HTTP 429 error โดยเฉพาะ
          if (error.message && error.message.includes('429')) {
            debugLog('[DEBUG] Rate limit exceeded on initial load');
            // เพิ่มเวลารอสำหรับการ refresh ครั้งถัดไป
            (window as any).lastRefreshTime = Date.now() + 60000; // รอ 1 นาที
            
            if (!isAutoRefreshing) {
              setMessage('เซิร์ฟเวอร์กำลังรับคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่');
              setStatusType('fail');
              setTimeout(() => setMessage(''), 5000);
            }
            return;
          }
          
          // แสดงข้อความ error เฉพาะเมื่อเป็น initial load (ไม่ใช่ auto-refresh)
          // ไม่แสดง error message สำหรับ auto-refresh เพื่อไม่รบกวนผู้ใช้
          if (!isAutoRefreshing) {
            let errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลงานผลิต';
            if (error.message && error.message.includes('Too many requests')) {
              errorMessage = 'เซิร์ฟเวอร์กำลังรับคำขอมากเกินไป กรุณาลองใหม่อีกครั้ง';
            } else if (error.message && error.message.includes('Backend error')) {
              errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: ' + error.message;
            } else if (error.message && error.message.includes('Failed to fetch')) {
              errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
            }
            
            setMessage(errorMessage);
            setStatusType('fail');
            
            // ลบข้อความหลังจาก 5 วินาที
            setTimeout(() => {
              setMessage('');
            }, 5000);
          }
        })
       .finally(() => setIsLoading(false));
     
     // รีเซ็ต state เมื่อโหลดหน้าใหม่ (เมื่อ date เปลี่ยน)
     setSelectedWorkplan(null);
     setProcessSteps([]);
     setProcessLogs([]);
     setSelectedProcessIndex(0);
     setUsedSec(null);
   }, [date]);

     // Manual refresh functionality
   const refreshWorkplans = async () => {
     debugLog('[DEBUG] refreshWorkplans called, isLoading:', isLoading, 'isAutoRefreshing:', isAutoRefreshing);
     if (isLoading) return; // Don't refresh if already loading
     
     // เพิ่มการป้องกัน Rate Limiting - ตรวจสอบว่าการ refresh ครั้งล่าสุดห่างกันอย่างน้อย 30 วินาที
     const now = Date.now();
     const lastRefreshTime = (window as any).lastRefreshTime || 0;
     const timeSinceLastRefresh = now - lastRefreshTime;
     
     if (timeSinceLastRefresh < 30000) { // 30 วินาที
       debugLog('[DEBUG] Skipping refresh - too soon since last refresh:', timeSinceLastRefresh, 'ms');
       return;
     }
     
     (window as any).lastRefreshTime = now;
    
    try {
      const response = await fetch(getApiUrl(`/api/work-plans?date=${date}`));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // ตรวจสอบว่า response มี success field และเป็น false หรือไม่
      if (data.success === false) {
        throw new Error(data.message || 'Backend returned error');
      }
      
      const filteredWorkplans = (data.data || []).filter((wp: any) => {
        if (wp.status_name === 'งานผลิตถูกยกเลิก') {
          return false;
        }
        const wpDate = wp.production_date;
        let wpDateFormatted = wpDate;
        if (wpDate && typeof wpDate === 'string') {
          if (wpDate.includes('T')) {
            wpDateFormatted = wpDate.split('T')[0];
          }
        }
        return wpDateFormatted === date;
      });
      
      // เพิ่มงานตวงสูตรเข้าไปในรายการ
      const weighingJobs = createVirtualWeighingJob();
      const allWorkplans = [...filteredWorkplans, ...weighingJobs];
      
      setWorkplans(allWorkplans);
      
      // เก็บ selectedWorkplan ไว้หลัง refresh เสมอ
      if (selectedWorkplan) {
        const updatedSelectedWorkplan = filteredWorkplans.find((wp: any) => wp.id === selectedWorkplan.id);
        if (updatedSelectedWorkplan) {
          debugLog('[DEBUG] Found updated workplan, keeping selection:', updatedSelectedWorkplan.job_name);
          setSelectedWorkplan(updatedSelectedWorkplan);
        } else {
          // ถ้าไม่เจอ workplan เดิม (อาจถูกลบหรือยกเลิก) ให้รีเซ็ต
          debugLog('[DEBUG] Workplan not found after refresh, resetting selection');
          setSelectedWorkplan(null);
          setProcessSteps([]);
          setProcessLogs([]);
          setSelectedProcessIndex(0);
          setUsedSec(null);
        }
      }
      
      // อัปเดตเวลาล่าสุด
      setLastUpdateTime(new Date().toLocaleTimeString('th-TH'));
      debugLog('[DEBUG] Refresh completed successfully');
         } catch (error: any) {
       debugError('Refresh failed:', error);
       
       // จัดการ HTTP 429 error โดยเฉพาะ
       if (error.message && error.message.includes('429')) {
         debugLog('[DEBUG] Rate limit exceeded, increasing refresh interval');
         // เพิ่มเวลารอสำหรับการ refresh ครั้งถัดไป
         (window as any).lastRefreshTime = Date.now() + 60000; // รอ 1 นาที
         
         if (!isAutoRefreshing) {
           setMessage('เซิร์ฟเวอร์กำลังรับคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่');
           setStatusType('fail');
           setTimeout(() => setMessage(''), 5000);
         }
         return;
       }
       
       // ไม่ต้องแสดง error message สำหรับ auto-refresh
       if (!isAutoRefreshing) {
         // แสดงข้อความ error ที่ชัดเจนขึ้น
         let errorMessage = 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล';
         if (error.message && error.message.includes('Too many requests')) {
           errorMessage = 'เซิร์ฟเวอร์กำลังรับคำขอมากเกินไป กรุณาลองใหม่อีกครั้ง';
         } else if (error.message && error.message.includes('Backend error')) {
           errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: ' + error.message;
         } else if (error.message && error.message.includes('Failed to fetch')) {
           errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
         }
         
         setMessage(errorMessage);
         setStatusType('fail');
         
         // ลบข้อความหลังจาก 5 วินาที
         setTimeout(() => {
           setMessage('');
         }, 5000);
       }
     }
  };

  // Load auto refresh setting function
  const loadAutoRefreshSetting = async () => {
    try {
      const response = await fetch(getApiUrl('/api/settings/auto-refresh'));
      const data = await response.json();
      if (data.success) {
        const newValue = data.autoRefreshEnabled;
        debugLog('[DEBUG] Auto refresh setting loaded:', newValue, 'current:', autoRefreshEnabled);
        if (newValue !== autoRefreshEnabled) {
          debugLog('[DEBUG] Auto refresh setting changed from', autoRefreshEnabled, 'to', newValue);
          setAutoRefreshEnabled(newValue);
        }
      }
          } catch (error) {
        debugError('Error loading auto refresh setting:', error);
        setAutoRefreshEnabled(false); // default to false on error
      }
  };

  // Load auto refresh setting on mount
  useEffect(() => {
    loadAutoRefreshSetting();
  }, []);

  // Reload auto refresh setting when page becomes visible (for real-time updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        debugLog('[DEBUG] Page became visible, reloading auto refresh setting');
        loadAutoRefreshSetting();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Check auto refresh setting every 5 seconds for real-time updates (เฉพาะเมื่อ Auto Refresh เปิด)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefreshEnabled) {
      debugLog('[DEBUG] Starting auto refresh setting check interval');
      interval = setInterval(() => {
        loadAutoRefreshSetting();
      }, 5000); // Check every 5 seconds
    } else {
      debugLog('[DEBUG] Auto refresh disabled, not starting setting check interval');
    }

    return () => {
      if (interval) {
        debugLog('[DEBUG] Clearing auto refresh setting check interval');
        clearInterval(interval);
      }
    };
  }, [autoRefreshEnabled]);

  // Force reload auto refresh setting when component mounts or date changes
  useEffect(() => {
    debugLog('[DEBUG] Component mounted or date changed, reloading auto refresh setting');
    loadAutoRefreshSetting();
  }, [date]);

  // Reload auto refresh setting when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      debugLog('[DEBUG] Window gained focus, reloading auto refresh setting');
      loadAutoRefreshSetting();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Auto-refresh workplans (เฉพาะเมื่อเปิดใช้งาน)
  useEffect(() => {
    // Auto-refresh workplans every 120 seconds for real-time updates (เฉพาะเมื่อเปิดใช้งาน)
    let autoRefreshInterval: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled) {
      debugLog('[DEBUG] Auto refresh is ENABLED, starting interval');
      autoRefreshInterval = setInterval(async () => {
        if (!isLoading) {
          debugLog('[DEBUG] Auto-refreshing workplans...');
          setIsAutoRefreshing(true);
          await refreshWorkplans();
          setIsAutoRefreshing(false);
        }
      }, 120000); // 120 seconds (2 นาที)
    } else {
      debugLog('[DEBUG] Auto refresh is DISABLED, not starting interval');
    }

    return () => {
      if (autoRefreshInterval) {
        debugLog('[DEBUG] Clearing auto refresh interval');
        clearInterval(autoRefreshInterval);
      }
    };
  }, [date, isLoading, autoRefreshEnabled]);

  // Load process steps & logs when select workplan
  useEffect(() => {
    if (!selectedWorkplan) return;
    setIsLoading(true);
    
    const loadProcessData = async () => {
      try {
        let processSteps = [];
        let processLogs = [];
        
        // ตรวจสอบว่าเป็นงานตวงสูตรหรือไม่
        if (selectedWorkplan.isWeighingJob) {
          // งานตวงสูตร - ใช้ขั้นตอนที่กำหนดไว้
          processSteps = createWeighingProcessSteps(selectedWorkplan.job_code);
          debugLog('[DEBUG] Using weighing process steps:', processSteps);
        } else {
          // งานปกติ - ตรวจสอบ job_code
          if (selectedWorkplan.job_code === 'new' || selectedWorkplan.job_code === '1') {
            // งาน new หรือ 1 - ใช้ขั้นตอนเริ่มต้นผลิต-สิ้นสุดการผลิต
            processSteps = createNormalProcessSteps();
            debugLog('[DEBUG] Using normal process steps for new/1 job:', processSteps);
          } else {
            // งานอื่นๆ - โหลดจาก API
            const stepsRes = await fetch(getApiUrl(`/api/process-steps?job_code=${selectedWorkplan.job_code}`));
            if (!stepsRes.ok) {
              throw new Error(`Process steps API error: ${stepsRes.status}`);
            }
            const steps = await stepsRes.json();
            processSteps = steps.data || [];
            debugLog('[DEBUG] Loaded process steps from API:', processSteps);
          }
          
          // โหลด logs (สำหรับงานตวงสูตรจะไม่มี logs เริ่มต้น)
          const logsRes = await fetch(getApiUrl(`/api/logs/work-plan/${selectedWorkplan.id}`));
          if (!logsRes.ok) {
            throw new Error(`Logs API error: ${logsRes.status}`);
          }
          const logs = await logsRes.json();
          processLogs = logs.data || [];
        }
        
        debugLog('[DEBUG] Final process steps:', processSteps);
        debugLog('[DEBUG] Final process logs:', processLogs);
        
        setProcessSteps(processSteps);
        setProcessLogs(processLogs);
        setSelectedProcessIndex(0);
        setUsedSec(null);
      } catch (error) {
        debugError('[DEBUG] Error loading process data:', error);
        setProcessSteps([]);
        setProcessLogs([]);
        setSelectedProcessIndex(0);
        setUsedSec(null);
        
        // Show error message
        setMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลกระบวนการ');
        setStatusType('fail');
        setTimeout(() => setMessage(''), 5000);
      } finally {
        setIsLoading(false);
      }
    };

    loadProcessData();
  }, [selectedWorkplan]);

  // Auto-refresh logs every 10 seconds for real-time updates
  useEffect(() => {
    if (!selectedWorkplan) return;

         const refreshLogs = async () => {
       try {
         const logsResponse = await fetch(getApiUrl(`/api/logs/work-plan/${selectedWorkplan.id}`));
         
         // ตรวจสอบ HTTP status
         if (!logsResponse.ok) {
           debugError('[DEBUG] Logs refresh failed with status:', logsResponse.status);
           return; // ไม่แสดง error message สำหรับ auto-refresh
         }
         
         const logsData = await logsResponse.json();
         debugLog('[DEBUG] Auto-refreshing logs...');
         setProcessLogs(logsData.data || []);
       } catch (error) {
         debugError('Error auto-refreshing logs:', error);
         // ไม่แสดง error message สำหรับ auto-refresh
       }
     };

         // Refresh logs every 30 seconds (ลดความถี่ลง)
     const logsInterval = setInterval(refreshLogs, 30000);

    return () => {
      if (logsInterval) {
        clearInterval(logsInterval);
      }
    };
  }, [selectedWorkplan]);



  // Update timer when processLogs or selectedProcessIndex change
  useEffect(() => {
    if (!processSteps[selectedProcessIndex]) {
      setUsedSec(null);
      if (timer) clearInterval(timer);
      return;
    }
    const step = processSteps[selectedProcessIndex];
    const log = processLogs.find((l: any) => l.process_number === step.process_number) || {};
    
    debugLog('[DEBUG] Timer update:', {
      step: step.process_number,
      log: log,
      start_time: log.start_time,
      stop_time: log.stop_time,
      used_time: log.used_time
    });
    
    if (log.start_time && !log.stop_time) {
      // running - เริ่ม timer
      const start = new Date(log.start_time);
      if (timer) clearInterval(timer);
      const t = setInterval(() => {
        const currentSec = Math.floor((Date.now() - start.getTime()) / 1000);
        setUsedSec(currentSec);
        debugLog('[DEBUG] Timer tick:', currentSec);
      }, 1000);
      setTimer(t);
      setUsedSec(Math.floor((Date.now() - start.getTime()) / 1000));
    } else if (log.used_time != null) {
      // finished - แสดงเวลาจาก database
      setUsedSec(log.used_time);
      if (timer) clearInterval(timer);
    } else {
      // not started - รีเซ็ต timer
      setUsedSec(null);
      if (timer) clearInterval(timer);
    }
    
    return () => { 
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    };
  }, [processLogs, selectedProcessIndex]);

  // Scroll to active step in process list
  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector('.process-item-active');
      if (active && active instanceof HTMLElement) {
        active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedProcessIndex]);

  // Handle finish production
  const handleFinishProduction = async () => {
    if (!selectedWorkplan) return;
    setIsLoading(true);
    setMessage("");
    setStatusType("info");
    
    debugLog("[DEBUG] handleFinishProduction called for workplan:", selectedWorkplan.id);
    
    try {
      debugLog("[DEBUG] Workplan ID:", selectedWorkplan.id);
      debugLog("[DEBUG] Full URL:", `/api/work-plans/${selectedWorkplan.id}/status`);
      
      // อัปเดตสถานะงานเป็น "เสร็จสิ้น" (status_id = 4)
      const res = await fetch(getApiUrl(`/api/work-plans/${selectedWorkplan.id}/status`), {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ status_id: 4 }) // 4 = เสร็จสิ้น
      });
      
      const result = await res.json();
      debugLog("[DEBUG] Finish production response:", result);
      
      if (!res.ok || !result.success) {
        debugError("[DEBUG] API error:", result);
        throw new Error(result.message || "API error");
      }

      // เรียก finish flag โดยตรงเพื่ออัปเดตตาราง finished_flags ให้แน่นอน
      try {
        const finishRes = await fetch(getApiUrl(`/api/work-plans/${selectedWorkplan.id}/finish`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        });
        const finishResult = await finishRes.json().catch(() => ({}));
        debugLog("[DEBUG] Mark as finished response:", finishResult);
      } catch (finishErr) {
        console.warn("[DEBUG] Finish flag update failed (non-blocking):", finishErr);
      }
      
             setMessage("จบงานผลิตแล้ว");
       setStatusType("success");
       
       // ลบข้อความหลังจาก 2 วินาที
       setTimeout(() => {
         setMessage('');
       }, 2000);
      
      // Reload workplans เพื่ออัปเดตสถานะ
      debugLog("[DEBUG] Reloading workplans...");
      const workplansRes = await fetch(getApiUrl(`/api/work-plans?date=${date}`));
      const workplansData = await workplansRes.json();
      setWorkplans((workplansData.data || []).filter((wp: any) => wp.status_name !== 'งานผลิตถูกยกเลิก'));
      
      // อัปเดต selectedWorkplan ด้วยสถานะใหม่
      const updatedWorkplan = workplansData.data?.find((wp: any) => wp.id === selectedWorkplan.id);
      if (updatedWorkplan) {
        setSelectedWorkplan(updatedWorkplan);
      }
      
    } catch (e: any) {
      debugError("[DEBUG] Error in handleFinishProduction:", e);
      debugError("[DEBUG] Error name:", e.name);
      debugError("[DEBUG] Error message:", e.message);
      debugError("[DEBUG] Error stack:", e.stack);
      
      let errorMessage = "เกิดข้อผิดพลาดในการจบงานผลิต";
      if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
        errorMessage = "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ";
      } else if (e.message) {
        errorMessage += ": " + e.message;
      }
      
             setMessage(errorMessage);
       setStatusType("fail");
       
       // ลบข้อความหลังจาก 3 วินาที
       setTimeout(() => {
         setMessage('');
       }, 3000);
    }
    setIsLoading(false);
  };

  // Get current language translations
  const t = translations[language];

  // Handle start/stop
  const handleLog = async (isStart: boolean) => {
    if (!selectedWorkplan || !processSteps[selectedProcessIndex]) return;
    setIsLoading(true);
    setMessage("");
    setStatusType("info");
    const step = processSteps[selectedProcessIndex];
    const status = isStart ? "start" : "stop";
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    
    debugLog("[DEBUG] handleLog called:", {
      isStart,
      workplan: selectedWorkplan.id,
      step: step.process_number,
      status,
      timestamp,
      isWeighingJob: selectedWorkplan.isWeighingJob
    });
    
    try {
      // สำหรับงานตวงสูตร virtual ส่ง work_plan_id = 4 (backend จะ map เป็น NULL)
      const logData = selectedWorkplan.isWeighingJob ? 
        {
          work_plan_id: 4,
          process_number: step.process_number,
          status,
          timestamp
        } : 
        {
          work_plan_id: selectedWorkplan.id,
          process_number: step.process_number,
          status,
          timestamp
        };
      
      debugLog("[DEBUG] ส่ง log ไป backend:", logData);
      
      const res = await fetch(getApiUrl('/api/logs'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData)
      });
      
      const result = await res.json().catch(() => ({}));
      debugLog("[DEBUG] log response:", result);
      
      if (!res.ok || !result.success) {
        debugError("[DEBUG] API error:", result);
        throw new Error(result.message || "API error");
      }
      
      setMessage(isStart ? "เริ่มขั้นตอนแล้ว" : "หยุดขั้นตอนแล้ว");
      setStatusType("success");
      
      // ลบข้อความหลังจาก 2 วินาที
      setTimeout(() => {
        setMessage('');
      }, 2000);
      
      // อัปเดต processLogs จาก response ทันทีถ้ามี
      if (result.data && result.data.process_number) {
        debugLog("[DEBUG] Updating processLogs with response data:", result.data);
        setProcessLogs((prevLogs: any[]) => {
          const existingIndex = prevLogs.findIndex(
            (l: any) => l.process_number === result.data.process_number
          );
          
          if (existingIndex >= 0) {
            // อัปเดต log ที่มีอยู่
            const updated = [...prevLogs];
            updated[existingIndex] = result.data;
            return updated;
          } else {
            // เพิ่ม log ใหม่
            return [...prevLogs, result.data];
          }
        });
      }
      
      // reload logs เพื่อให้แน่ใจว่าข้อมูลตรงกับ database
      debugLog("[DEBUG] Reloading logs...");
      const fetchUrl = selectedWorkplan.isWeighingJob
        ? getApiUrl('/api/logs/work-plan/4')
        : getApiUrl(`/api/logs/work-plan/${selectedWorkplan.id}`);
      const logs = await fetch(fetchUrl).then(r => r.json());
      debugLog("[DEBUG] Reloaded logs:", logs);
      
      // อัปเดต logs ทั้งหมดหลังจาก reload
      if (logs.data && Array.isArray(logs.data)) {
        setProcessLogs(logs.data);
      }
      
    } catch (e: any) {
      debugError("[DEBUG] Error in handleLog:", e);
             setMessage("เกิดข้อผิดพลาดในการบันทึก: " + (e?.message || ""));
       setStatusType("fail");
       
       // ลบข้อความหลังจาก 3 วินาที
       setTimeout(() => {
         setMessage('');
       }, 3000);
    }
    setIsLoading(false);
  };

  // เวลารวมของงาน
  const totalJobTime = (() => {
    const starts = processLogs.map(l => l.start_time).filter(Boolean).map((t: string) => new Date(t));
    const stops = processLogs.map(l => l.stop_time).filter(Boolean).map((t: string) => new Date(t));
    if (starts.length === 0 || stops.length === 0) return "–";
    const minStart = new Date(Math.min(...starts.map(d => d.getTime())));
    const maxStop = new Date(Math.max(...stops.map(d => d.getTime())));
    const sec = Math.floor((maxStop.getTime() - minStart.getTime()) / 1000);
    return formatUsedTime(sec);
  })();

  // แก้ไข hydration error - รอให้ client-side render เสร็จก่อน
  if (!isClient) {
    return (
      <div className={`min-h-screen bg-gray-50 py-4 px-2 sm:px-4 text-base sm:text-lg ${notoSansThai.className}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-4 px-2 sm:px-4 text-base sm:text-lg ${notoSansThai.className}`}>
      <div className="max-w-7xl mx-auto">
                 <div className="flex flex-row justify-between items-center mb-4">
                      <h1 className="text-3xl font-bold text-black">{t.title}</h1>
                      <div className="flex flex-row items-center gap-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1" />
                            <button 
                 onClick={() => setLanguage(language === 'thai' ? 'myanmar' : 'thai')}
                 className="border rounded px-3 py-1 text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors"
               >
                 {language === 'thai' ? t.myanmar : t.thai}
               </button>
              

              
              <button className="border rounded px-3 py-1 text-gray-700 bg-white shadow-sm flex items-center gap-1">
                <span className="hidden sm:inline">เมนู</span>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
            </div>
                   </div>
          



                                   <div className="text-gray-500 mb-4 text-lg">{t.subtitle}</div>
                          <div className="flex flex-col lg:flex-row gap-6 items-start">
           {/* กล่องเลือกงานผลิต - แยกออกมาบนมือถือ */}
           <div className="w-full lg:w-2/5 order-1 lg:order-2 lg:hidden">
             <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4">
               <div className="flex flex-row items-center gap-3 mb-2">
                 <div className="font-semibold whitespace-nowrap">{t.workPlan}</div>
                 <select
                   className="border rounded px-2 py-1 min-w-[180px]"
                   value={isClient ? (selectedWorkplan?.id || "") : ""}
                   onChange={e => {
                     const wp = workplans.find(w => w.id == e.target.value);
                     setSelectedWorkplan(wp || null);
                   }}
                 >
                   <option value="">{t.pleaseSelect}</option>
                   {workplans.map(wp => (
                     <option key={wp.id} value={wp.id}>
                       {wp.job_name || wp.job_code || 'ไม่ระบุชื่อ'}
                     </option>
                   ))}
                 </select>
               </div>
               {selectedWorkplan && (
                 <>
                   {(selectedWorkplan.operators || selectedWorkplan.operators_from_join) && (
                     <div className="mt-2 text-gray-700 text-xl">
                       <span className="font-semibold">{t.operator}</span> <span className="font-bold">{(() => {
                        try {
                          // ใช้ operators_from_join ก่อน (ข้อมูลจาก JOIN)
                          if (selectedWorkplan.operators_from_join) {
                            return selectedWorkplan.operators_from_join;
                          }
                          // ถ้าไม่มี ให้ใช้ operators จาก field เดิม
                          if (typeof selectedWorkplan.operators === 'string') {
                            return selectedWorkplan.operators;
                          } else if (Array.isArray(selectedWorkplan.operators)) {
                            return selectedWorkplan.operators.map((op: any) => 
                              typeof op === 'string' ? op : op.name || op.id_code || 'Unknown'
                            ).join(", ");
                          } else {
                            return 'ไม่ระบุ';
                          }
                                                 } catch (e) {
                          return 'ไม่ระบุ';
                        }
                      })()}</span>
                     </div>
                   )}
                   {selectedWorkplan.notes && (
                     <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                       <div className="text-red-700 text-base font-bold">
                         <span className="font-semibold">{t.notes}</span> {selectedWorkplan.notes}
                       </div>
                     </div>
                   )}
                 </>
               )}
             </div>
           </div>

           {/* กล่องจับเวลา */}
           <div className="w-full lg:w-3/5 order-2 lg:order-1">
             <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4">
               {/* Header */}
               <div className="text-center text-lg font-semibold mb-2">
                 {selectedWorkplan ? selectedWorkplan.job_name : t.productionPlan}
               </div>
               {/* เลขขั้นตอน + ปุ่มลูกศร + ชื่อขั้นตอน */}
               <div className="flex flex-col items-center mb-2">
                 <div className="text-2xl font-bold mb-2 text-center min-h-[2.5rem] flex items-center justify-center">{processSteps[selectedProcessIndex]?.process_description || "-"}</div>
                 <div className="flex flex-row items-center justify-center gap-6 w-full">
                   <button
                     className="bg-gray-300 rounded-full w-12 h-12 flex items-center justify-center text-2xl"
                     onClick={() => setSelectedProcessIndex(i => Math.max(0, i - 1))}
                     disabled={selectedProcessIndex === 0}
                   >&lt;</button>
                   <div className="flex flex-col items-center min-w-[120px]">
                     <div className="number-display text-6xl font-mono bg-black text-white rounded-lg px-10 py-4 mb-2">
                       {processSteps[selectedProcessIndex]?.process_number?.toString().padStart(2, "0") || "--"}
                     </div>
                     <div className="text-base font-bold mb-1">{t.stepNumber}</div>
                   </div>
                   <button
                     className="bg-gray-300 rounded-full w-12 h-12 flex items-center justify-center text-2xl"
                     onClick={() => setSelectedProcessIndex(i => Math.min(processSteps.length - 1, i + 1))}
                     disabled={selectedProcessIndex === processSteps.length - 1}
                   >&gt;</button>
                 </div>
               </div>
               {/* กล่องเวลา */}
               <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
                 <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                   <div className="text-xs text-gray-500">{t.startTime}</div>
                   <div className="font-bold text-lg">
                     {(() => {
                       const log = processLogs.find((l: any) => l.process_number === processSteps[selectedProcessIndex]?.process_number) || {};
                       return log.start_time ? new Date(log.start_time).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" }) : "–";
                     })()}
                   </div>
                 </div>
                 <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                   <div className="text-xs text-gray-500">{t.endTime}</div>
                   <div className="font-bold text-lg text-red-600">
                     {(() => {
                       const log = processLogs.find((l: any) => l.process_number === processSteps[selectedProcessIndex]?.process_number) || {};
                       return log.stop_time ? new Date(log.stop_time).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" }) : "–";
                     })()}
                   </div>
                 </div>
                 <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                   <div className="text-xs text-gray-500">{t.usedTime}</div>
                   <div className="font-bold text-lg">{(() => {
                     const log = processLogs.find((l: any) => l.process_number === processSteps[selectedProcessIndex]?.process_number) || {};
                     // ใช้ usedSec ถ้ามี (timer กำลังทำงาน) หรือใช้ log.used_time จาก database
                     if (usedSec !== null) {
                       return formatUsedTime(usedSec);
                     } else if (log.used_time != null) {
                       return formatUsedTime(log.used_time);
                     } else {
                       return "–";
                     }
                   })()}</div>
                 </div>
               </div>
               {/* ปุ่ม */}
               <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-2">
                 <button
                   className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 sm:py-3 px-4 rounded-lg text-xl sm:text-lg disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 min-h-[60px] sm:min-h-[48px]"
                   onClick={() => handleLog(true)}
                   disabled={isLoading || !selectedWorkplan}
                 >{t.startStep}</button>
                 <button
                   className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 sm:py-3 px-4 rounded-lg text-xl sm:text-lg disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 min-h-[60px] sm:min-h-[48px]"
                   onClick={() => handleLog(false)}
                   disabled={isLoading || !selectedWorkplan}
                 >{t.stopStep}</button>
                 <button
                   className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 sm:py-3 px-4 rounded-lg text-xl sm:text-lg disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 min-h-[60px] sm:min-h-[48px]"
                   onClick={() => handleFinishProduction()}
                   disabled={isLoading || !selectedWorkplan}
                 >{t.finishProduction}</button>
               </div>
             </div>
           </div>

           {/* กล่องรายการขั้นตอนการผลิต - แยกออกมาบนมือถือ */}
           <div className="w-full lg:w-2/5 order-3 lg:order-3 lg:hidden">
             <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-lg font-semibold"><i className="bi bi-clock mr-2" />รายการขั้นตอนการผลิต</span>
               </div>
               <div ref={scrollRef} className="process-scroll max-h-[400px] overflow-y-auto divide-y divide-gray-100">
                 {processSteps.length === 0 && <div className="text-center text-gray-400 py-4">ไม่มีขั้นตอนการผลิต</div>}
                 {processSteps.map((step, idx) => {
                   const log = processLogs.find((l: any) => l.process_number === step.process_number) || {};
                   return (
                     <div
                       key={step.process_number}
                       className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 px-3 cursor-pointer ${idx === selectedProcessIndex ? "bg-green-50 process-item-active" : "hover:bg-gray-50"}`}
                       onClick={() => setSelectedProcessIndex(idx)}
                     >
                       <div className="font-bold text-xl w-10 text-center">{step.process_number}.</div>
                       <div className="flex-1 font-semibold text-gray-900 text-lg">{step.process_description}</div>
                       <div className="flex flex-col text-base text-right min-w-[110px] gap-0.5">
                         <span>เริ่ม: <span className="text-green-700 font-bold">{log.start_time ? new Date(log.start_time).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" }) : "–"}</span></span>
                         <span>สิ้นสุด: <span className="text-red-600 font-bold">{log.stop_time ? new Date(log.stop_time).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" }) : "–"}</span></span>
                         <span>ใช้เวลา: <span className="text-blue-700 font-bold">{(() => {
                           // ถ้าเป็นขั้นตอนที่กำลังทำงาน ให้ใช้ usedSec
                           if (idx === selectedProcessIndex && usedSec !== null) {
                             return formatUsedTime(usedSec);
                           } else if (log.used_time != null) {
                             return formatUsedTime(log.used_time);
                           } else {
                             return "–";
                           }
                         })()}</span></span>
                       </div>
                     </div>
                   );
                 })}
               </div>
               <div className="text-right mt-2 text-sm text-gray-600">เวลารวมของงาน: <span className="font-bold">{totalJobTime}</span></div>
             </div>
           </div>

           {/* กล่องขวา: กล่องเลือกงานผลิต + กล่องรายการขั้นตอน - เฉพาะบนหน้าจอใหญ่ */}
           <div className="hidden lg:flex w-full lg:w-2/5 order-1 lg:order-2 flex-col gap-4">
             {/* กล่องเลือกงานผลิต */}
             <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
               <div className="flex flex-row items-center gap-3 mb-2">
                 <div className="font-semibold whitespace-nowrap">{t.workPlan}</div>
                 <select
                   className="border rounded px-2 py-1 min-w-[180px]"
                   value={isClient ? (selectedWorkplan?.id || "") : ""}
                   onChange={e => {
                     const wp = workplans.find(w => w.id == e.target.value);
                     setSelectedWorkplan(wp || null);
                   }}
                 >
                   <option value="">{t.pleaseSelect}</option>
                   {workplans.map(wp => (
                     <option key={wp.id} value={wp.id}>
                       {wp.job_name || wp.job_code || 'ไม่ระบุชื่อ'}
                     </option>
                   ))}
                 </select>
               </div>
               {selectedWorkplan && (
                 <>
                   {(selectedWorkplan.operators || selectedWorkplan.operators_from_join) && (
                     <div className="mt-2 text-gray-700 text-xl">
                       <span className="font-semibold">{t.operator}</span> <span className="font-bold">{(() => {
                        try {
                          // ใช้ operators_from_join ก่อน (ข้อมูลจาก JOIN)
                          if (selectedWorkplan.operators_from_join) {
                            return selectedWorkplan.operators_from_join;
                          }
                          // ถ้าไม่มี ให้ใช้ operators จาก field เดิม
                          if (typeof selectedWorkplan.operators === 'string') {
                            return selectedWorkplan.operators;
                          } else if (Array.isArray(selectedWorkplan.operators)) {
                            return selectedWorkplan.operators.map((op: any) => 
                              typeof op === 'string' ? op : op.name || op.id_code || 'Unknown'
                            ).join(", ");
                          } else {
                            return 'ไม่ระบุ';
                          }
                                                 } catch (e) {
                          return 'ไม่ระบุ';
                        }
                      })()}</span>
                     </div>
                   )}
                   {selectedWorkplan.notes && (
                     <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                       <div className="text-red-700 text-base font-bold">
                         <span className="font-semibold">{t.notes}</span> {selectedWorkplan.notes}
                       </div>
                     </div>
                   )}
                 </>
               )}
             </div>

             {/* กล่องรายการขั้นตอนการผลิต */}
             <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 flex-1">
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-lg font-semibold"><i className="bi bi-clock mr-2" />รายการขั้นตอนการผลิต</span>
               </div>
               <div ref={scrollRef} className="process-scroll max-h-[400px] overflow-y-auto divide-y divide-gray-100">
                 {processSteps.length === 0 && <div className="text-center text-gray-400 py-4">ไม่มีขั้นตอนการผลิต</div>}
                 {processSteps.map((step, idx) => {
                   const log = processLogs.find((l: any) => l.process_number === step.process_number) || {};
                   return (
                     <div
                       key={step.process_number}
                       className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 px-3 cursor-pointer ${idx === selectedProcessIndex ? "bg-green-50 process-item-active" : "hover:bg-gray-50"}`}
                       onClick={() => setSelectedProcessIndex(idx)}
                     >
                       <div className="font-bold text-xl w-10 text-center">{step.process_number}.</div>
                       <div className="flex-1 font-semibold text-gray-900 text-lg">{step.process_description}</div>
                       <div className="flex flex-col text-base text-right min-w-[110px] gap-0.5">
                         <span>เริ่ม: <span className="text-green-700 font-bold">{log.start_time ? new Date(log.start_time).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" }) : "–"}</span></span>
                         <span>สิ้นสุด: <span className="text-red-600 font-bold">{log.stop_time ? new Date(log.stop_time).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" }) : "–"}</span></span>
                         <span>ใช้เวลา: <span className="text-blue-700 font-bold">{(() => {
                           // ถ้าเป็นขั้นตอนที่กำลังทำงาน ให้ใช้ usedSec
                           if (idx === selectedProcessIndex && usedSec !== null) {
                             return formatUsedTime(usedSec);
                           } else if (log.used_time != null) {
                             return formatUsedTime(log.used_time);
                           } else {
                             return "–";
                           }
                         })()}</span></span>
                       </div>
                     </div>
                   );
                 })}
               </div>
               <div className="text-right mt-2 text-sm text-gray-600">เวลารวมของงาน: <span className="font-bold">{totalJobTime}</span></div>
             </div>
           </div>
                   </div>
          
                     {/* ข้อความแจ้งเตือน */}
           {message && (
             <div className={`flex items-center justify-center mb-2 p-2 rounded-lg ${
               statusType === 'success' ? 'bg-green-100 text-green-800' :
               statusType === 'fail' ? 'bg-red-100 text-red-800' :
               'bg-blue-100 text-blue-800'
             }`}>
               <div className="flex items-center gap-2">
                 <span className="text-sm font-medium">{message}</span>
                 {statusType === 'fail' && (
                   <button
                     onClick={() => {
                       setMessage('');
                       // ลองโหลดข้อมูลใหม่
                       const today = new Date();
                       const currentDate = today.toISOString().slice(0, 10);
                       setDate(currentDate);
                     }}
                     className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50"
                   >
                     ลองใหม่
                   </button>
                 )}
               </div>
             </div>
           )}
          
                     {/* ซ่อนการ์ด Auto-refresh ตามคำขอผู้ใช้ */}
       </div>
     </div>
   );
 }
