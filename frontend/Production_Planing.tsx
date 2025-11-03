"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Clock,
  Edit,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  User as UserIcon,
  XCircle,
  BarChart3,
  ChevronDown as ChevronDownIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AutosizeTextarea from "@/components/AutosizeTextarea"
import dynamic from "next/dynamic"
const RichNoteEditor = dynamic(() => import("@/components/RichNoteEditor"), { ssr: false })
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Noto_Sans_Thai } from "next/font/google"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SearchBox, SearchOption } from "./components/SearchBox";
import { JobSearchSelect } from "./components/JobSearchSelect";
import { SimpleDatePicker } from "./components/SimpleDatePicker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TableSkeletonLoader, CardSkeletonLoader } from "@/components/SkeletonLoader";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { TimeTablePopup } from "@/components/TimeTablePopup";
import { ProductionTask } from "@/lib/types/weekly-calendar";
import { arrayMove } from "@dnd-kit/sortable";
import { createSafeDate, formatDateForDisplay, formatDateForAPI, formatDateThaiShort } from "@/lib/dateUtils";
import { config, debugLog, debugError, getApiUrl as getApiUrlFromConfig } from "@/lib/config";
import { api, handleApiError, createAbortController } from "@/lib/api";
import { getOperatorsArray, getOperatorsString, isDraftItem, isSpecialItem } from "@/lib/utils";
import { clientCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import type { 
  User, 
  Machine, 
  ProductionRoom, 
  ProductionItem, 
  ProductionLog, 
  DraftWorkPlan,
  JobOption 
} from "@/types/production";
import Link from "next/link";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
})

// ===== ฟังก์ชันช่วยเช็ค prefix เลขงาน (ต้องอยู่บนสุดของไฟล์) =====
const hasJobNumberPrefix = (name: string) => /^([A-D]|\d+)\s/.test(name);

export default function MedicalAppointmentDashboard() {
  // ===== ALL STATE DECLARATIONS FIRST (ป้องกัน hooks order error) =====
  // Client-side check สำหรับแก้ไข hydration error
  const [isClient, setIsClient] = useState(false);
  
  // เปลี่ยน default selectedDate เป็นวันที่ปัจจุบัน (แก้ไข hydration error)
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState("")
  const [currentWeek, setCurrentWeek] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily")
  const [isFormCollapsed, setIsFormCollapsed] = useState(false)
  const [selectedWeekDay, setSelectedWeekDay] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // เพิ่ม state สำหรับฟอร์ม
  const [operators, setOperators] = useState(["", "", "", ""]); // 4 ตำแหน่ง
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // เพิ่ม state สำหรับ job search (ใช้ react-select แล้ว)
  const [jobQuery, setJobQuery] = useState("");
  const [jobCode, setJobCode] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [rooms, setRooms] = useState<ProductionRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const jobInputRef = useRef<HTMLInputElement>(null);
  const [jobName, setJobName] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const justSelectedFromDropdownRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false); // flag เพื่อป้องกัน race condition
  const hasInitializedDateRef = useRef(false); // flag เพื่อป้องกันการ set selectedDate ซ้ำ
  const [showWorkerDetails, setShowWorkerDetails] = useState(false); // เพิ่ม state สำหรับเปิด/ปิดรายละเอียด
  const [showTimeTable, setShowTimeTable] = useState(false); // เพิ่ม state สำหรับเปิด/ปิด Time Table Popup (default ปิด)
  const [syncModeEnabled, setSyncModeEnabled] = useState(false); // เพิ่ม state สำหรับ sync mode
  const router = useRouter();
  
  // เพิ่ม cache สำหรับผลลัพธ์การค้นหา
  const searchCacheRef = useRef<Map<string, SearchOption[]>>(new Map());
  const [isSearching, setIsSearching] = useState(false);

  const isCreatingRef = useRef(false); // <--- ย้ายมาอยู่นอก useEffect

  // ใช้ useDebounce หลังจากประกาศ jobQuery แล้ว
  const debouncedJobQuery = useDebounce(jobQuery, 200); // 200ms debounce

  // ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลงในช่องหมายเหตุ
  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  }, []);

  // ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลงในช่องหมายเหตุของ edit dialog
  const handleEditNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditNote(e.target.value);
  }, []);

  // Debounced handlers สำหรับช่องหมายเหตุ
  const debouncedNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // ใช้ setTimeout เพื่อ debounce การอัพเดท state
    setTimeout(() => {
      setNote(value);
    }, 0);
  }, []);

  const debouncedEditNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // ใช้ setTimeout เพื่อ debounce การอัพเดท state
    setTimeout(() => {
      setEditNote(value);
    }, 0);
  }, []);

  // ฟังก์ชันสร้าง array ของเวลา 08:00-18:00 ทีละ 15 นาที
  const generateTimeOptions = (start = "08:00", end = "18:00", step = 15) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const result = [];
    let [h, m] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    while (h < endH || (h === endH && m <= endM)) {
      result.push(`${pad(h)}:${pad(m)}`);
      m += step;
      if (m >= 60) { h++; m = m - 60; }
    }
    debugLog('⏰ Generated time options:', result);
    return result;
  };
  const timeOptions = generateTimeOptions();

  // state สำหรับข้อมูลแผนผลิตจริง
  const [productionData, setProductionData] = useState<ProductionItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Loading states
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  
  // User role state (ย้ายจาก JSX)
  const [userName, setUserName] = useState<string>('');
  
  // ===== ALL USEEFFECTS AFTER STATE DECLARATIONS =====
  // Client setup
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ตรวจสอบและตั้งค่า selectedDate จาก URL query parameter หรือวันปัจจุบัน
  useEffect(() => {
    if (isClient && typeof window !== 'undefined' && !hasInitializedDateRef.current) {
      // อ่าน date จาก URL query parameter โดยตรง
      const urlParams = new URLSearchParams(window.location.search);
      const urlDate = urlParams.get('date');
      
      if (urlDate) {
        setSelectedDate(urlDate);
        debugLog('📅 Setting selectedDate from URL:', urlDate);
      } else {
        // ถ้าไม่มี date ใน URL ให้ตั้งเป็นวันปัจจุบัน
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayString = `${yyyy}-${mm}-${dd}`;
        setSelectedDate(todayString);
        debugLog('📅 Setting initial selectedDate:', todayString);
      }
      hasInitializedDateRef.current = true;
    }
  }, [isClient]);
  
  // ฟังการเปลี่ยนแปลง URL เมื่อใช้ back/forward (popstate)
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      const handlePopState = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlDate = urlParams.get('date');
        
        debugLog('🔙 Browser back/forward, checking date. URL date:', urlDate, 'Current selectedDate:', selectedDate);
        
        if (urlDate && urlDate !== selectedDate) {
          setSelectedDate(urlDate);
          debugLog('📅 Updating selectedDate from URL (back/forward):', urlDate);
        }
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isClient, selectedDate]);
  

  // ตั้งค่า currentWeek หลัง client mount
  useEffect(() => {
    if (isClient && !currentWeek) {
      setCurrentWeek(new Date());
    }
  }, [isClient, currentWeek]);

  // ตั้งค่า userName หลัง client mount
  useEffect(() => {
    if (isClient) {
      try {
        const cookieMatch = document.cookie.match(/(?:^|; )userRole=([^;]+)/);
        let roleId = cookieMatch ? parseInt(decodeURIComponent(cookieMatch[1])) : undefined;
        if (!roleId) {
          const segment = window.location.pathname.split('/').filter(Boolean)[0];
          const roleMap: Record<string, number> = {planner:1,admin:2,viewer:4,operation:5};
          roleId = roleMap[segment] || 2;
        }
        const roleNameMap: Record<number, string> = {1:'Planner',2:'Admin',4:'Viewer',5:'Operation'};
        setUserName(roleNameMap[roleId] || 'Admin');
      } catch (error) {
        setUserName('Admin');
      }
    }
  }, [isClient]);
  
  // ดึงข้อมูลแผนผลิตจริงและแบบร่างมารวมกัน - ลบออกเพราะจะให้ useEffect ที่ watch selectedDate จัดการเอง

  // อัปเดต URL เมื่อ selectedDate เปลี่ยน (URL sync)
  useEffect(() => {
    if (isClient && selectedDate && hasInitializedDateRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDate = urlParams.get('date');
      
      if (urlDate !== selectedDate) {
        // อัปเดต URL ด้วย router.push (แต่ไม่ trigger popstate)
        const newUrl = `/planner/home?date=${encodeURIComponent(selectedDate)}`;
        debugLog('🔗 Updating URL to:', newUrl);
        router.push(newUrl, { scroll: false });
      }
    }
  }, [selectedDate, isClient, router]);
  
  // ดึงข้อมูลใหม่เมื่อเปลี่ยนวันที่
  useEffect(() => {
    if (selectedDate && isClient) {
      // ป้องกันการเรียกซ้ำ
      if (loadingRef.current) {
        debugLog('⚠️ Already loading, skipping...');
        return;
      }
      
      debugLog('📅 วันที่เปลี่ยนเป็น:', selectedDate);
      loadingRef.current = true;
      
      loadAllProductionData().finally(() => {
        loadingRef.current = false;
      });
    } else if (!selectedDate && isClient) {
      debugLog('⚠️ selectedDate is empty, waiting...');
    }
  }, [selectedDate, isClient]);

  // ===== HELPER FUNCTIONS AFTER HOOKS =====
  // Helper function for API URL - use frontend proxy (relative path)
  const getApiUrl = (endpoint: string) => {
    if (!endpoint) return '/';
    // Ensure we always call Next.js API routes (frontend proxy)
    // so the same code works across environments without CORS/env issues
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return clean;
  };

  // Fetch dropdown data on mount
  useEffect(() => {
    debugLog('🔍 Fetching dropdown data...');
    debugLog('API URL:', process.env.NEXT_PUBLIC_API_URL);
    
    // Fetch users with cache
    const cachedUsers = clientCache.get(CACHE_KEYS.USERS);
    if (cachedUsers) {
      debugLog('Using cached users data');
      setUsers(cachedUsers as User[]);
    } else {
      fetch(`/api/users`)
        .then(res => {
          debugLog('Users API response status:', res.status);
          return res.json();
        })
        .then(data => {
          debugLog('Users data:', data);
          const usersData = data.data || [];
          setUsers(usersData);
          // Cache for 15 minutes (master data)
          clientCache.set(CACHE_KEYS.USERS, usersData, CACHE_TTL.VERY_LONG);
        })
        .catch(err => {
          debugError('Error fetching users:', err);
          setUsers([] as User[]);
        });
    }
    
    // Fetch machines with cache
    const cachedMachines = clientCache.get(CACHE_KEYS.MACHINES);
    if (cachedMachines) {
      debugLog('Using cached machines data');
      setMachines(cachedMachines as Machine[]);
    } else {
      fetch(`/api/machines`)
        .then(res => {
          debugLog('Machines API response status:', res.status);
          return res.json();
        })
        .then(data => {
          debugLog('Machines data:', data);
          const machinesData = data.data || [];
          setMachines(machinesData);
          // Cache for 15 minutes (master data)
          clientCache.set(CACHE_KEYS.MACHINES, machinesData, CACHE_TTL.VERY_LONG);
        })
        .catch(err => {
          debugError('Error fetching machines:', err);
          setMachines([] as Machine[]);
        });
    }
    
    // Fetch production rooms
    fetch(`/api/production-rooms`)
      .then(res => {
        debugLog('Rooms API response status:', res.status);
        return res.json();
      })
      .then(data => {
        debugLog('Rooms data:', data);
        setRooms(data.data || []);
      })
      .catch(err => {
        debugError('Error fetching rooms:', err);
        setRooms([]);
      });
  }, []);

  // Debug state changes
  useEffect(() => {
    debugLog('👥 Users state updated:', users);
    debugLog('⏰ Time options state updated:', timeOptions);
  }, [users, timeOptions]);

  // Autocomplete job name/code - ใช้ local search แทน API เพื่อความเร็ว (ปิดใช้งานแล้ว)
  /*
  useEffect(() => {
  // ถ้าเพิ่งเลือกจาก dropdown ให้ข้าม effect นี้
  if (justSelectedFromDropdownRef.current) {
    debugLog('🔒 Skipping search - just selected from dropdown');
    justSelectedFromDropdownRef.current = false;
    setShowJobDropdown(false); // บังคับปิด dropdown
    setJobOptions([]); // เคลียร์ options
    return;
  }

  debugLog('🔍 useEffect triggered with debouncedJobQuery:', `"${debouncedJobQuery}"`);
  debugLog('🔍 Trimmed length:', debouncedJobQuery.trim().length);
  
  if (debouncedJobQuery.trim().length < 1) {
    debugLog('🚫 Empty search term, hiding dropdown');
    setShowJobDropdown(false);
    setJobOptions([]);
    setIsSearching(false);
    return;
  }

  setIsSearching(false);

  const searchTerm = debouncedJobQuery.trim().toLowerCase();
  debugLog('🔍 Searching for:', `"${searchTerm}"`);
  const allCachedResults: { job_code: string; job_name: string }[] = [];

  for (const results of searchCacheRef.current.values()) {
    allCachedResults.push(...results);
  }

  const filteredResults = allCachedResults.filter(
    (item) =>
      item.job_name.toLowerCase().includes(searchTerm) ||
      item.job_code.toLowerCase().includes(searchTerm)
  );

  const uniqueResults = filteredResults.filter((item, index, self) =>
    index === self.findIndex((t) =>
      t.job_code === item.job_code && t.job_name === item.job_name
    )
  );

  setJobOptions(uniqueResults);
  setShowJobDropdown(uniqueResults.length > 0);

  if (uniqueResults.length === 0 && debouncedJobQuery.trim().length >= 2) {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      abortControllerRef.current = new AbortController();

             fetch(`/api/process-steps/search?query=${encodeURIComponent(debouncedJobQuery)}`, {
        signal: abortControllerRef.current.signal
      })
        .then(res => res.json())
        .then(data => {
          const results = data.data || [];
          const cacheKey = debouncedJobQuery.toLowerCase().trim();
          searchCacheRef.current.set(cacheKey, results);
          if (searchCacheRef.current.size > 50) {
            const firstKey = searchCacheRef.current.keys().next().value;
            if (firstKey) {
            searchCacheRef.current.delete(firstKey);
            }
          }
          setJobOptions(results);
          setShowJobDropdown(true);
          setIsSearching(false);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            debugError('Error fetching job options:', err);
            setJobOptions([]);
            setShowJobDropdown(false);
          }
          setIsSearching(false);
        });
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      setIsSearching(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }
}, [debouncedJobQuery]);
*/

  // ฟังก์ชันสร้าง job_code ใหม่ (เลขงานอัตโนมัติ)
  const handleAddNewJob = () => {
    // หาเลขงานที่ยังไม่ซ้ำ (เริ่มจาก 1)
    let jobNumber = 1;
    const allCodes = productionData.map((item: any) => item.job_code?.toLowerCase()).filter(Boolean);
    
    // หาเลขงานที่ยังไม่ซ้ำ
    while (allCodes.includes(jobNumber.toString())) {
      jobNumber++;
    }
    
    // สร้าง job_code เป็นเลขงาน
    const newJobCode = jobNumber.toString();
    setJobCode(newJobCode);
    return newJobCode;
  };

  // Helper functions for week navigation
  const getWeekDates = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
    startOfWeek.setDate(diff)

    // เพิ่มเฉพาะ 6 วัน (จันทร์-เสาร์) ไม่รวมอาทิตย์
    for (let i = 0; i < 6; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }






  const formatDateForGoogleSheet = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? createSafeDate(date) : date;
    if (!dateObj) {
      return 'Invalid Date';
    }
    return dateObj.toLocaleDateString('th-TH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateForValue = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? createSafeDate(date) : date;
    if (!dateObj) {
      return 'Invalid Date';
    }
    return dateObj.toLocaleDateString('th-TH'); // DD/MM/YYYY
  };

  const formatDate = (date: Date) => {
    return formatDateForDisplay(date, 'short');
  }

  const formatFullDate = (date: Date) => {
    return formatDateForDisplay(date, 'full');
  }

  const formatProductionDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }


  // เพิ่มฟังก์ชันสำหรับสีของแต่ละวัน

  // Staff image mapping
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


  // Get production data for current week

  // Get production data for selected day
  const getSelectedDayProduction = () => {
    const targetDate = viewMode === "daily" ? selectedDate : selectedWeekDay;
    if (!targetDate) return [];
    const defaultCodes = ['A', 'B', 'C', 'D'];
    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return '';
      return formatDateForAPI(dateStr);
    };
    const dayData = productionData.filter(item => normalizeDate(item.production_date) === normalizeDate(targetDate));
    
    // งาน default (A,B,C,D) - ✅ แสดงทั้งหมด (ไม่ว่าจะเป็น draft หรือไม่)
    let defaultDrafts = dayData.filter(item => defaultCodes.includes(item.job_code));
    defaultDrafts.sort((a, b) => defaultCodes.indexOf(a.job_code) - defaultCodes.indexOf(b.job_code));

    // งานปกติ (is_special !== 1 และ workflow_status_id !== 10, ไม่ใช่ default, isDraft = false)
    const normalJobs = dayData.filter(item => 
      !defaultCodes.includes(item.job_code) && 
      !isSpecialItem(item) && 
      !isDraftItem(item)
    );
    
    // งานพิเศษ (is_special === 1 หรือ workflow_status_id === 10, isDraft = false)
    const specialJobs = dayData.filter(item => 
      !defaultCodes.includes(item.job_code) && 
      isSpecialItem(item) && 
      !isDraftItem(item)
    );
    
    // งาน draft (isDraft = true, ไม่ใช่ default)
    const draftJobs = dayData.filter(item => !defaultCodes.includes(item.job_code) && isDraftItem(item));

    // ฟังก์ชันเรียงตาม id อย่างเดียว (เก่าสุดก่อน)
    const sortFn = (a: any, b: any) => {
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    };
    
    normalJobs.sort(sortFn);
    specialJobs.sort(sortFn);
    draftJobs.sort(sortFn);

    // Debug: แสดงข้อมูลการแยกงาน
    debugLog("🔍 [DEBUG] getSelectedDayProduction แยกงาน:");
    debugLog("🔍 [DEBUG] งานปกติ:", normalJobs.length, "รายการ");
    debugLog("🔍 [DEBUG] งานพิเศษ:", specialJobs.length, "รายการ");
    debugLog("🔍 [DEBUG] งานปกติ:", normalJobs.map(item => ({ 
      job_name: item.job_name, 
      is_special: item.is_special, 
      workflow_status_id: item.workflow_status_id 
    })));
    debugLog("🔍 [DEBUG] งานพิเศษ:", specialJobs.map(item => ({ 
      job_name: item.job_name, 
      is_special: item.is_special, 
      workflow_status_id: item.workflow_status_id 
    })));

    // รวมกลุ่มตามลำดับที่ต้องการ: default -> งานปกติ -> งานพิเศษ -> draft
    return [...defaultDrafts, ...normalJobs, ...specialJobs, ...draftJobs];
  };

  // Use useMemo to recalculate when productionData changes

  const selectedDayProduction = useMemo(() => {
    const result = getSelectedDayProduction();
    debugLog('🎯 [DEBUG] selectedDayProduction useMemo recalculated');
    debugLog('🎯 [DEBUG] selectedDayProduction length:', result.length);
    debugLog('🎯 [DEBUG] selectedDayProduction sample:', result.slice(0, 3));
    return result;
  }, [productionData, selectedDate, selectedWeekDay, viewMode]);

  // เพิ่มฟังก์ชันส่งข้อมูลไป Google Sheet
  const sendToGoogleSheet = async (data: any) => {
    debugLog("🟡 [DEBUG] call sendToGoogleSheet", data);
    // เรียกไปที่ frontend API route แทน backend
    const url = '/api/send-to-google-sheet';
    debugLog("🟡 [DEBUG] Google Sheet URL:", url);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      debugLog("🟡 [DEBUG] Google Sheet response status:", res.status);
      const result = await res.text();
      debugLog("🟢 [DEBUG] Google Sheet result:", result);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    } catch (err) {
      debugError("🔴 [DEBUG] Google Sheet error:", err);
      throw err; // Re-throw เพื่อให้ handleSyncDrafts จับ error ได้
    }
  };

  // ฟังก์ชันคำนวณลำดับงานตามเวลาเริ่มและผู้ปฏิบัติงาน
  const calculateWorkOrder = (targetDate: string, targetStartTime: string, targetOperators: string) => {
    const jobsOnDate = productionData.filter(item => {
      const itemDate = item.production_date ? item.production_date.split('T')[0] : '';
      return itemDate === targetDate;
    });
    
    // เรียงงานตามเวลาเริ่มและผู้ปฏิบัติงาน
    const sortedJobs = jobsOnDate.sort((a, b) => {
      // เรียงตามเวลาเริ่ม
      const timeA = a.start_time || "00:00"
      const timeB = b.start_time || "00:00"
      const timeComparison = timeA.localeCompare(timeB)
      if (timeComparison !== 0) return timeComparison
      
      // หากเวลาเริ่มเหมือนกัน เรียงตามผู้ปฏิบัติงานคนที่ 1 ที่มีตัวอักษร "อ"
      const operatorA = getOperatorsArray(a.operators)[0] || ""
      const operatorB = getOperatorsArray(b.operators)[0] || ""
      
      // หาตำแหน่งของ "อ" ในชื่อ (indexOf จะ return -1 ถ้าไม่เจอ)
      const indexA = String(operatorA).indexOf("อ")
      const indexB = String(operatorB).indexOf("อ")
      
      // ถ้า A มี "อ" ที่ตำแหน่งแรก (index 0) และ B ไม่มี "อ" หรือมี "อ" ที่ตำแหน่งอื่น
      if (indexA === 0 && indexB !== 0) {
        debugLog(`🔍 [DEBUG] A (${operatorA}) comes before B (${operatorB}) because A has "อ" at first position`);
        return -1
      }
      // ถ้า B มี "อ" ที่ตำแหน่งแรก (index 0) และ A ไม่มี "อ" หรือมี "อ" ที่ตำแหน่งอื่น
      if (indexB === 0 && indexA !== 0) {
        debugLog(`🔍 [DEBUG] B (${operatorB}) comes before A (${operatorA}) because B has "อ" at first position`);
        return 1
      }
      // ถ้าทั้งคู่มี "อ" ที่ตำแหน่งแรก หรือทั้งคู่ไม่มี "อ" ที่ตำแหน่งแรก เรียงตามตัวอักษร
      const result = operatorA.localeCompare(operatorB);
      debugLog(`🔍 [DEBUG] Both have same "อ" position, comparing alphabetically: ${result}`);
      return result
    });

    debugLog('🔍 [DEBUG] Sorted week data:', sortedJobs.map((item: any) => ({
      job_name: item.job_name,
      start_time: item.start_time,
      operators: item.operators,
      first_operator: (item.operators || "").split(", ")[0] || ""
    })));

    return sortedJobs.length + 1;
  }

  // ฟังก์ชันสร้างเลขงานอัตโนมัติ
  const generateJobCode = () => {
    // หาเลขงานที่ยังไม่ซ้ำในวันนั้น
    const dayJobs = productionData.filter(item => 
      item.production_date === selectedDate
    );
    
    let jobNumber = 1;
    const existingCodes = dayJobs.map(job => job.job_code);
    
    // หาเลขงานที่ยังไม่ซ้ำ (เริ่มจาก 1, 2, 3, 4, 5...)
    while (existingCodes.includes(jobNumber.toString())) {
      jobNumber++;
    }
    
    return jobNumber.toString();
  };

  const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, "");

  const isJobNameDuplicate = (name: string) => {
    // ตรวจสอบกับข้อมูลที่มีอยู่จริงในระบบเฉพาะวันที่เลือก
    const normalizedName = normalize(name);
    debugLog('🔍 [DEBUG] Checking for duplicate job name:', name);
    debugLog('🔍 [DEBUG] Normalized name:', normalizedName);
    debugLog('🔍 [DEBUG] Selected date:', selectedDate);
    
    // กรองข้อมูลเฉพาะวันที่เลือก
    const jobsOfSelectedDate = productionData.filter(item => {
      const itemDate = item.production_date ? item.production_date.split('T')[0] : '';
      return itemDate === selectedDate;
    });
    
    debugLog('🔍 [DEBUG] Jobs of selected date:', jobsOfSelectedDate.map(item => ({
      job_name: item.job_name || '',
      normalized: normalize(item.job_name || ''),
      production_date: item.production_date
    })));
    
    const isDuplicate = jobsOfSelectedDate.some(item => normalize(item.job_name || '') === normalizedName);
    debugLog('🔍 [DEBUG] Is duplicate:', isDuplicate);
    return isDuplicate;
  };

  const isEndTimeAfterStartTime = (start: string, end: string) => {
    if (!start || !end) return true;
    return end > start;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // ป้องกัน submit ซ้ำ
    setIsSubmitting(true);
    setMessage("");

    // Validation เฉพาะบันทึกเสร็จสิ้น (workflow_status_id = 2)
    const requiredFields = [jobName.trim(), startTime.trim(), endTime.trim(), selectedRoom && selectedRoom !== "__none__"];
    const hasOperator = operators.filter(op => op && op !== "__none__").length > 0;
    if (requiredFields.includes("") || !hasOperator) {
      setErrorDialogMessage("กรุณาใส่ข้อมูล");
      setShowErrorDialog(true);
      setIsSubmitting(false);
      return;
    }
    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      setMessage("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม");
      setIsSubmitting(false);
      return;
    }
    if (isJobNameDuplicate(jobName)) {
      setMessage("ชื่องานนี้มีอยู่แล้ว");
      setIsSubmitting(false);
      return;
    }

    try {
      // map operators เป็น object { id_code, name }
      const operatorsToSend = operators
        .filter(Boolean)
        .map(name => {
          const user = users.find(u => u.name === name);
          return user ? { id_code: user.id_code, name: user.name } : { name };
        });
      // ตรวจสอบว่าข้อมูลครบถ้วนหรือไม่ (เครื่องบันทึกข้อมูลการผลิตไม่เป็น required)
      const isValid = jobName.trim() !== "" && 
                     operators.filter(Boolean).length > 0 && 
                     startTime.trim() !== "" && 
                     endTime.trim() !== "" && 
                     selectedRoom.trim() !== "";
      debugLog("[DEBUG] isValid:", isValid);
      // ใช้ค่าเริ่มต้นหากไม่มีการใส่เวลา
      const finalStartTime = startTime.trim() || "00:00";
      const finalEndTime = endTime.trim() || "00:00";
      
      // สร้างเลขงานอัตโนมัติถ้าไม่มี job_code
      const finalJobCode = jobCode || generateJobCode();
      
      // คำนวณลำดับงาน
      const workOrder = calculateWorkOrder(selectedDate, finalStartTime, operators.filter(Boolean).join(", "));
      const requestBody = {
        production_date: selectedDate,
        job_code: finalJobCode,
        job_name: jobName || jobQuery,
        start_time: finalStartTime,
        end_time: finalEndTime,
        machine_id: machines.find(m => m.machine_code === selectedMachine)?.id || selectedMachine || null,
        production_room_id: rooms.find(r => r.room_code === selectedRoom)?.id || null,
        notes: note,
        workflow_status: isValid ? 'completed' : 'draft', // completed = บันทึกเสร็จสิ้น, draft = แบบร่าง
        operators: operatorsToSend,
        work_order: workOrder // เพิ่มลำดับงาน
      };
      debugLog("[DEBUG] requestBody:", requestBody);
      const res = await fetch(`/api/work-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      // ตรวจสอบ response ว่ามีเนื้อหาหรือไม่
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { success: false, message: 'Empty response' };
      } catch (parseError) {
        debugError("[DEBUG] JSON parse error:", parseError);
        debugError("[DEBUG] Response text was:", text);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
      
      debugLog("[DEBUG] API response:", data);
      
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      if (data.success) {
        resetForm();
        await loadAllProductionData();
      } else {
        console.warn("[DEBUG] API error message:", data.message);
        setMessage(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      debugError("[DEBUG] API error:", err);
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ API');
    }
    setIsSubmitting(false);
  };

  const handleSaveDraft = async () => {
    debugLog('🔧 handleSaveDraft called');
    debugLog('🔧 Current state:', {
      jobName,
      jobQuery,
      jobCode,
      startTime,
      endTime,
      selectedMachine,
      selectedRoom,
      operators,
      note,
      isSubmitting
    });

    if (isSubmitting) {
      debugLog('🔧 Already submitting, returning');
      return; // ป้องกัน submit ซ้ำ
    }
    
    setIsSubmitting(true);
    setMessage("");

    // Validation สำหรับแบบร่าง - ยืดหยุ่นกว่า
    const hasJobName = jobName?.trim() || jobQuery?.trim();
    debugLog('🔧 Has job name:', hasJobName);
    
    if (!hasJobName) {
      debugLog('🔧 No job name provided');
      setMessage("กรุณากรอกชื่องาน");
      setIsSubmitting(false);
      return;
    }
    
    // ตรวจสอบเวลาถ้ามีการกรอก
    if (startTime?.trim() && endTime?.trim() && !isEndTimeAfterStartTime(startTime, endTime)) {
      debugLog('🔧 Invalid time range');
      setMessage("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม");
      setIsSubmitting(false);
      return;
    }
    
    // ตรวจสอบชื่องานซ้ำเฉพาะถ้ามีการกรอกชื่องาน
    const finalJobName = hasJobName || "";
    debugLog('🔧 Final job name:', finalJobName);
    
    if (finalJobName && isJobNameDuplicate(finalJobName)) {
      debugLog('🔧 Duplicate job name');
      setMessage("ชื่องานนี้มีอยู่แล้ว");
      setIsSubmitting(false);
      return;
    }

    try {
      debugLog('🔧 Starting API call');
      debugLog('📅 Saving draft with date:', selectedDate);
      debugLog('📅 selectedDate type:', typeof selectedDate);
      debugLog('📅 selectedDate value:', selectedDate);
      
      // แปลงวันที่ให้เป็น ISO format (YYYY-MM-DD)
      let formattedDate = selectedDate;
      if (selectedDate) {
        // คาดหวังให้ selectedDate เป็น string รูปแบบ YYYY-MM-DD เสมอ
        if (/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
          formattedDate = selectedDate;
        } else {
          const dateObj = new Date(selectedDate);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
          }
        }
      }
      debugLog('📅 Formatted date for API:', formattedDate);
      
      // ไม่ใส่ค่า default ถ้าไม่ได้กรอก
      const finalStartTime = startTime?.trim() || "";
      const finalEndTime = endTime?.trim() || "";
      
      // สร้างเลขงานอัตโนมัติถ้าไม่มี job_code
      const finalJobCode = jobCode || generateJobCode();
      
      const requestBody = {
        production_date: formattedDate,
        job_code: finalJobCode,
        job_name: finalJobName,
        workflow_status: 'draft',
        start_time: finalStartTime || null,
        end_time: finalEndTime || null,
        machine_id: machines.find(m => m.machine_code === selectedMachine)?.id || selectedMachine || null,
        production_room_id: rooms.find(r => r.room_code === selectedRoom)?.id || null,
        notes: note || null,
        operators: operators.filter(Boolean).map(name => {
          const user = users.find(u => u.name === name);
          return user ? { id_code: user.id_code, name: user.name } : { name };
        })
      };
      
      debugLog('📅 Request body:', requestBody);
      debugLog('📅 API URL:', `/api/work-plans`);
      
      const res = await fetch(`/api/work-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      debugLog('📅 Response status:', res.status);
      // บางกรณี API อาจไม่คืน body (204/empty body) ให้ parse อย่างปลอดภัย
      let data: any = null;
      try {
        const raw = await res.text();
        if (raw && raw.trim() !== '') {
          data = JSON.parse(raw);
        } else {
          data = null; // ไม่มีเนื้อหาใน body
        }
      } catch (e) {
        debugError('📅 Safe parse error (ignored):', e);
        data = null;
      }
      
      if (!res.ok) {
        const errorMsg = data?.message || data?.errors?.[0]?.msg || `HTTP ${res.status}: ${res.statusText}`;
        debugError('📅 API error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      const success = data?.success ?? res.ok; // ถ้าไม่มี body ให้ถือว่า ok ตามสถานะ HTTP
      setMessage(success ? 'บันทึกแบบร่างสำเร็จ' : 'เกิดข้อผิดพลาด');
      if (success) {
        debugLog('🔧 Success - resetting form and reloading data');
        resetForm(); // ล้างค่าฟอร์มหลังบันทึกแบบร่างสำเร็จ
        await loadAllProductionData();
      } else {
        debugLog('🔧 API returned success: false');
        setMessage(data?.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      debugError('📅 Error saving draft:', err);
      setMessage(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ API');
    }
    debugLog('🔧 Setting isSubmitting to false');
    setIsSubmitting(false);
  };

  // Helper function to get room name from room code or ID
  const getRoomName = (roomCodeOrId: string | number) => {
    if (!roomCodeOrId || roomCodeOrId === 'ไม่ระบุ') {
      debugLog('🏠 [DEBUG] getRoomName - No room data:', roomCodeOrId);
      return 'ไม่ระบุ';
    }
    
    debugLog('🏠 [DEBUG] getRoomName input:', roomCodeOrId, 'type:', typeof roomCodeOrId);
    
    // ลองหาโดยใช้ room_code ก่อน
    let room = rooms.find(r => r.room_code === roomCodeOrId);
    
    // หากไม่เจอ ลองหาโดยใช้ ID (รองรับทั้ง string และ number)
    if (!room) {
      room = rooms.find(r => r.id.toString() === roomCodeOrId.toString());
    }
    
    // หากไม่เจอ ลองหาโดยใช้ room_name (กรณีที่ส่งชื่อมาเลย)
    if (!room) {
      room = rooms.find(r => r.room_name === roomCodeOrId);
    }
    
    const result = room ? room.room_name : (typeof roomCodeOrId === 'number' ? roomCodeOrId.toString() : roomCodeOrId);
    debugLog('🏠 [DEBUG] getRoomName result:', result);
    return result;
  };

  // Helper function to render notes
  const renderNotes = (item: any, isFormCollapsed: boolean) => {
    if (!item.notes && !item.note) return null;
    
    return (
      <div
        className={`flex items-start space-x-1 sm:space-x-2 ${
          isFormCollapsed ? "text-sm sm:text-base" : "text-xs sm:text-sm"
        }`}
      >
        <span className="text-red-600 font-semibold flex-shrink-0">หมายเหตุ:</span>
        <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded border-l-2 border-red-400">
          {item.notes || item.note}
        </span>
      </div>
    );
  };





  // Helper function to render staff avatars
  // ✅ ปรับปรุง: ใช้ operators_from_join ก่อน (ข้อมูลจาก JOIN) ถ้าไม่มีค่อยใช้ operators
  const renderStaffAvatars = (staff: any, item?: any, isFormCollapsed?: boolean) => {
    // ✅ ใช้ operators_from_join ก่อน (ข้อมูลจาก Backend JOIN)
    let staffString = '';
    if (item && (item as any).operators_from_join) {
      staffString = String((item as any).operators_from_join);
    } else if (staff) {
      staffString = String(staff);
    }
    
    if (!staffString || staffString.trim() === "") {
      return (
        <span className="text-sm sm:text-base text-gray-500">
          ไม่มีผู้ปฏิบัติงาน
        </span>
      );
    }
    const staffList = getOperatorsArray(staffString);
    
    return (
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="flex -space-x-2">
          {staffList.map((person, index) => {
            // แปลง person เป็น string ถ้าเป็น object
            const personName = typeof person === 'object' ? ((person as any)?.name || (person as any)?.id_code || '') : String(person || '');
            
            return (
              <Avatar
                key={index}
                className={`${isFormCollapsed ? "w-12 h-12 sm:w-14 sm:h-14" : "w-10 h-10 sm:w-12 sm:h-12"} border-2 border-white shadow-sm`}
              >
                <AvatarImage
                  src={staffImages[personName] || `/placeholder.svg?height=80&width=80&text=${personName.charAt(0)}`}
                  alt={personName}
                  className="object-cover object-center avatar-image"
                  style={{ imageRendering: "crisp-edges" }}
                />
                <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                  {personName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            );
          })}
        </div>
        <span className={`${isFormCollapsed ? "text-base sm:text-lg" : "text-sm sm:text-base"} truncate text-slate-900`}>
          ผู้ปฏิบัติงาน: {staffList.map(person => 
            typeof person === 'object' ? ((person as any)?.name || (person as any)?.id_code || '') : String(person || '')
          ).join(', ')}
        </span>
      </div>
    )
  }

  const [editDraftModalOpen, setEditDraftModalOpen] = useState(false);
  const [editDraftData, setEditDraftData] = useState<any | null>(null);
  const [editDraftId, setEditDraftId] = useState<string>("");
  
  // State สำหรับ modal แสดงรายละเอียดการผลิต
  const [productionDetailsModalOpen, setProductionDetailsModalOpen] = useState(false);
  const [productionDetailsData, setProductionDetailsData] = useState<any | null>(null);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);

  // State สำหรับฟอร์มใน modal edit draft
  const [editJobName, setEditJobName] = useState("");
  const [editOperators, setEditOperators] = useState(["", "", "", ""]);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editMachine, setEditMachine] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");

  // ฟังก์ชัน normalize เวลาให้เป็น HH:mm
  const normalizeTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  };

  // Prefill ข้อมูลเมื่อเปิด modal
  useEffect(() => {
    if (editDraftModalOpen && editDraftData && users.length > 0) {
      debugLog('🔧 Setting up edit form with data:', editDraftData);
      
      setEditJobName(editDraftData.job_name || "");
      
      // ตั้งค่าผู้ปฏิบัติงาน
      let operatorNames = ["", "", "", ""];
      if (editDraftData.operators) {
        debugLog('🔧 Processing operators:', editDraftData.operators);
        
        try {
          if (Array.isArray(editDraftData.operators)) {
            // ถ้าเป็น array อยู่แล้ว
            operatorNames = editDraftData.operators.map((op: any, index: number) => {
              if (index >= 4) return ""; // จำกัดแค่ 4 ตำแหน่ง
              return typeof op === "object" ? op?.name || "" : op || "";
            });
          } else if (typeof editDraftData.operators === "string") {
            // ลอง parse เป็น JSON ก่อน
            try {
              const parsed = JSON.parse(editDraftData.operators);
              if (Array.isArray(parsed)) {
                operatorNames = parsed.map((op: any, index: number) => {
                  if (index >= 4) return ""; // จำกัดแค่ 4 ตำแหน่ง
                  return typeof op === "object" ? op?.name || "" : op || "";
                });
              }
            } catch {
              // ถ้าไม่ใช่ JSON ให้แยกด้วย comma
              const names = getOperatorsArray(editDraftData.operators);
              operatorNames = names.slice(0, 4); // จำกัดแค่ 4 ตำแหน่ง
            }
          }
          
          // เติม array ให้ครบ 4 ตำแหน่ง
          while (operatorNames.length < 4) {
            operatorNames.push("");
          }
          
          debugLog('🔧 Final operator names:', operatorNames);
        } catch (error) {
          debugError('Error processing operators:', error);
          operatorNames = ["", "", "", ""];
        }
      }
      
      setEditOperators(operatorNames);
      setEditStartTime(normalizeTime(editDraftData.start_time) || "");
      setEditEndTime(normalizeTime(editDraftData.end_time) || "");

      // Prefill เครื่องบันทึกข้อมูลการผลิต (machine)
      let machineCode = "";
      if (editDraftData.machine_code) {
        machineCode = editDraftData.machine_code;
      } else if (editDraftData.machine_id) {
        const m = machines.find(m => m.id === editDraftData.machine_id || m.id?.toString() === editDraftData.machine_id?.toString());
        machineCode = m?.machine_code || "";
      } else if (editDraftData.machine) {
        machineCode = editDraftData.machine;
      }
      setEditMachine(machineCode);

      // Prefill ห้องผลิต (room)
      let roomCode = "";
      if (editDraftData.room_code) {
        roomCode = editDraftData.room_code;
      } else if (editDraftData.production_room_id) {
        const r = rooms.find(r => r.id === editDraftData.production_room_id || r.id?.toString() === editDraftData.production_room_id?.toString());
        roomCode = r?.room_code || "";
      } else if (editDraftData.production_room) {
        roomCode = editDraftData.production_room;
      }
      setEditRoom(roomCode);

      setEditNote(editDraftData.notes || editDraftData.note || "");
      setEditDate(editDraftData.production_date ? (editDraftData.production_date.split("T")[0]) : "");
      
      debugLog('🔧 Form setup complete:', {
        jobName: editDraftData.job_name,
        operators: operatorNames,
        startTime: editDraftData.start_time,
        endTime: editDraftData.end_time,
        machine: machineCode,
        room: roomCode,
        note: editDraftData.notes || editDraftData.note
      });
    }
  }, [editDraftModalOpen, editDraftData, users, machines, rooms]);

  const handleEditDraft = (draftItem: any) => {
    debugLog('✏️ Opening edit modal for draft item:', draftItem);
    
    // ใช้ข้อมูลจริงแทนข้อมูล test
    const realData = {
      id: draftItem.id,
      job_name: draftItem.job_name,
      job_code: draftItem.job_code,
      operators: draftItem.operators || [],
      start_time: draftItem.start_time,
      end_time: draftItem.end_time,
      production_date: draftItem.production_date,
      machine_id: draftItem.machine_id,
      production_room_id: draftItem.production_room_id,
      production_room: draftItem.production_room,
      machine_code: draftItem.machine_code,
      notes: draftItem.notes || draftItem.note || "",
      workflow_status_id: draftItem.workflow_status_id
    };
    
    debugLog('✏️ Using real data:', realData);
    
    // ตั้งค่า state ก่อน
    setEditDraftData(realData);
    setEditDraftId(realData.id.toString());
    
    // เปิด modal หลังจากตั้งค่า state แล้ว
    debugLog('✏️ Setting modal open to true');
    setEditDraftModalOpen(true);
    
    // ตรวจสอบ state หลังจากตั้งค่า
    setTimeout(() => {
      debugLog('✏️ Modal state check:', {
        editDraftModalOpen: true,
        editDraftData: realData,
        editDraftId: realData.id.toString()
      });
    }, 100);
  };

  const validateEditDraft = () => {
    // ต้องมีชื่องาน, ผู้ปฏิบัติงานอย่างน้อย 1, เวลาเริ่ม/สิ้นสุด, ห้อง (เครื่องไม่เป็น required)
    const jobNameValid = editJobName.trim() !== "";
    const operatorsValid = editOperators.filter(Boolean).length > 0;
    const startTimeValid = editStartTime.trim() !== "";
    const endTimeValid = editEndTime.trim() !== "";
    const roomValid = editRoom.trim() !== "";
    
    debugLog('🔍 Validating edit draft:');
    debugLog('  - editJobName:', editJobName, 'valid:', jobNameValid);
    debugLog('  - editOperators:', editOperators, 'valid:', operatorsValid);
    debugLog('  - editStartTime:', editStartTime, 'valid:', startTimeValid);
    debugLog('  - editEndTime:', editEndTime, 'valid:', endTimeValid);
    debugLog('  - editRoom:', editRoom, 'valid:', roomValid);
    debugLog('  - editMachine:', editMachine, 'valid:', editMachine.trim() !== ""); // แสดงแต่ไม่ใช้ในการ validate
    
    const isValid = jobNameValid && operatorsValid && startTimeValid && endTimeValid && roomValid;
    debugLog('  - Overall validation result:', isValid);
    
    return isValid;
  };

  const handleSaveEditDraft = async (isDraft = false) => {
    if (!editDraftData) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      // map operators เป็น object { id_code, name }
      const operatorsToSend = editOperators
        .filter(Boolean)
        .map(name => {
          const user = users.find(u => u.name === name);
          return user ? { id_code: user.id_code, name: user.name } : { name };
        });
      const isValid = validateEditDraft();
      const workflowStatusId = isDraft ? 1 : (isValid ? 2 : 1); // 2 = บันทึกเสร็จสิ้น, 1 = แบบร่าง
      if (!isDraft && !isValid) {
        setMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
        setIsSubmitting(false);
        return;
      }
      const requestBody = {
        production_date: editDate,
        job_code: editDraftData.job_code,
        job_name: editJobName,
        start_time: editStartTime,
        end_time: editEndTime,
        machine_id: machines.find(m => m.machine_code === editMachine)?.id || null,
        production_room_id: rooms.find(r => r.room_code === editRoom)?.id || null,
        notes: editNote,
        workflow_status: isDraft ? 'draft' : 'completed',
        operators: operatorsToSend
      };
      // ตรวจสอบว่า editDraftData.id เป็น string และมี replace method
      const draftId = editDraftData.id && typeof editDraftData.id === 'string' 
        ? editDraftData.id.replace('draft_', '') 
        : String(editDraftData.id || '');
      
      const res = await fetch(getApiUrl(`/api/work-plans/${draftId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      // ตรวจสอบ response ว่ามีเนื้อหาหรือไม่
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { success: false, message: 'Empty response' };
      } catch (parseError) {
        debugError("[DEBUG] JSON parse error:", parseError);
        debugError("[DEBUG] Response text was:", text);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
      
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      if (data.success) {
        const successMessage = isDraft ? "บันทึกแบบร่างสำเร็จ" : "บันทึกเสร็จสิ้น";
        setMessage(successMessage);
        setSuccessDialogMessage(successMessage);
        setShowSuccessDialog(true);
        setEditDraftModalOpen(false);
        await loadAllProductionData();
      } else {
        setMessage(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      debugError("[DEBUG] Error in handleSaveEditDraft:", err);
      setMessage(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ API");
    }
    setIsSubmitting(false);
  };

  // ฟังก์ชันพิมพ์ใบงาน
  const handlePrintWorkPlan = async () => {
    setIsSubmitting(true);
    setMessage("");
    
    try {
      // เช็คว่ามีงาน regular ที่ยังเป็น draft อยู่ไหม
      const regularDrafts = productionData.filter((item: any) => 
        item.job_type === 'regular' && item.workflow_status === 'draft'
      );
      
      if (regularDrafts.length > 0) {
        setMessage(`กรุณาบันทึกงานให้เสร็จสิ้นทุกงานก่อนพิมพ์ (เหลืออีก ${regularDrafts.length} งาน)`);
        setIsSubmitting(false);
        return;
      }
      
      // ยืนยันการพิมพ์
      const confirmed = confirm(
        'คุณต้องการพิมพ์ใบงานผลิตใช่หรือไม่?\n' +
        'หลังจากพิมพ์แล้ว งานที่เพิ่มใหม่จะกลายเป็น "งานพิเศษ"'
      );
      
      if (!confirmed) {
        setIsSubmitting(false);
        return;
      }
      
      debugLog('🖨️ Printing work plan for:', selectedDate);
      
      const response = await fetch(getApiUrl('/api/work-plans/print'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ production_date: selectedDate })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('พิมพ์ใบงานสำเร็จ');
        setSuccessDialogMessage('พิมพ์ใบงานสำเร็จ');
        setShowSuccessDialog(true);
        
        // รีโหลดข้อมูล
        await loadAllProductionData();
        
        // เปิด Google Sheet
        window.open("https://docs.google.com/spreadsheets/d/1lzsYNoIbTd1Uy5r37xUtK5PuOHyNlYYiqS7xZvrU8C8", "_blank");
      } else {
        setMessage(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      debugError('Error printing work plan:', err);
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ API');
    }
    
    setIsSubmitting(false);
  };

  // เพิ่มฟังก์ชัน Sync Drafts (เก็บไว้สำหรับ backward compatibility)
  const handleSyncDrafts = async () => {
    // เรียกใช้ handlePrintWorkPlan แทน
    await handlePrintWorkPlan();
  };

  // ฟังก์ชัน Sync Drafts เดิม (สำหรับ backward compatibility)
  const handleSyncDraftsOld = async () => {
    // เปิด Google Sheet ก่อน
    debugLog("🟢 [DEBUG] กำลังเปิด Google Sheet...");
    try {
      window.open("https://docs.google.com/spreadsheets/d/1lzsYNoIbTd1Uy5r37xUtK5PuOHyNlYYiqS7xZvrU8C8", "_blank");
      debugLog("🟢 [DEBUG] เปิด Google Sheet สำเร็จ");
    } catch (err) {
      debugError("🔴 [DEBUG] ไม่สามารถเปิด Google Sheet ได้:", err);
      // ลองเปิดด้วยวิธีอื่น
      const link = document.createElement('a');
      link.href = "https://docs.google.com/spreadsheets/d/1lzsYNoIbTd1Uy5r37xUtK5PuOHyNlYYiqS7xZvrU8C8/edit?gid=1601393572#gid=1601393572";
      link.target = "_blank";
      link.click();
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await fetch(getApiUrl('/api/work-plans/sync-drafts-to-plans'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDate: selectedDate })
      });
      // 1. เตรียมข้อมูล summaryRows สำหรับ 1.ใบสรุปงาน v.4 (ไม่เอา A, B, C, D)
      const defaultCodes = ['A', 'B', 'C', 'D'];
          // ฟังก์ชันแปลงรหัส/ID ห้องเป็นชื่อห้อง
    const getRoomNameByCodeOrId = (codeOrId: string | undefined) => {
      if (!codeOrId) return "";
      // ใช้ข้อมูลจาก Frontend
      const room = rooms.find(r => r.room_code === codeOrId || r.id?.toString() === codeOrId?.toString());
      return room?.room_name || codeOrId;
    };
    // ฟังก์ชันแปลง ID เครื่องเป็นชื่อเครื่อง
    const getMachineNameById = (machineId: string | undefined) => {
      if (!machineId) return "";
      // ใช้ข้อมูลจาก Frontend
      const machine = machines.find(m => m.id?.toString() === machineId?.toString());
      return machine?.machine_name || machineId;
    };
      // แยกงานปกติและงานพิเศษ (ใช้ is_special = 1 หรือ workflow_status_id = 10)
      const normalJobs = productionData.filter(item => 
        item.production_date === selectedDate && 
        !(item.isDraft && defaultCodes.includes(item.job_code)) &&
        item.is_special !== 1 && 
        item.workflow_status_id !== 10 // ไม่ใช่งานพิเศษ
      );
      
      const specialJobs = productionData.filter(item => 
        item.production_date === selectedDate && 
        !(item.isDraft && defaultCodes.includes(item.job_code)) &&
        (item.is_special === 1 || item.workflow_status_id === 10) // งานพิเศษ
      );
      
      // เรียงงานปกติตาม id อย่างเดียว (เก่าสุดก่อน)
      const sortedNormalJobs = normalJobs.sort((a, b) => {
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });
      
      // เรียงงานพิเศษตาม id อย่างเดียว (เก่าสุดก่อน)
      const sortedSpecialJobs = specialJobs.sort((a, b) => {
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });
      
      // Debug: แสดงข้อมูลการแยกงาน
      debugLog("🔍 [DEBUG] แยกงานพิเศษ:");
      debugLog("🔍 [DEBUG] งานปกติ:", normalJobs.length, "รายการ");
      debugLog("🔍 [DEBUG] งานพิเศษ:", specialJobs.length, "รายการ");
      debugLog("🔍 [DEBUG] งานปกติ:", normalJobs.map(item => ({ 
        job_name: item.job_name, 
        is_special: item.is_special, 
        workflow_status_id: item.workflow_status_id 
      })));
      debugLog("🔍 [DEBUG] งานพิเศษ:", specialJobs.map(item => ({ 
        job_name: item.job_name, 
        is_special: item.is_special, 
        workflow_status_id: item.workflow_status_id 
      })));
      
      // รวมงานปกติ + งานพิเศษ (งานพิเศษอยู่ด้านล่างสุด)
      const filtered = [...sortedNormalJobs, ...sortedSpecialJobs];
      
      // Debug: แสดงข้อมูลที่ส่งไป Google Sheet
      debugLog("🔍 [DEBUG] ข้อมูลที่ส่งไป Google Sheet:");
      debugLog("🔍 [DEBUG] จำนวนงานทั้งหมด:", filtered.length);
      debugLog("🔍 [DEBUG] ลำดับงาน:", filtered.map((item, idx) => ({
        ลำดับ: idx + 1,
        job_name: item.job_name,
        is_special: item.is_special,
        workflow_status_id: item.workflow_status_id,
        start_time: item.start_time
      })));
              const summaryRows = filtered.map((item, idx) => {
          let ops = getOperatorsArray(item.operators);
          while (ops.length < 4) ops.push("");
        return [
          idx + 1, // ลำดับ (A)
          item.job_code || "", // รหัสวัตถุดิบ (B)
          item.job_name || "", // รายการ (C)
          ops[0], // ผู้ปฏิบัติงาน 1 (D)
          ops[1], // ผู้ปฏิบัติงาน 2 (E)
          ops[2], // ผู้ปฏิบัติงาน 3 (F)
          ops[3], // ผู้ปฏิบัติงาน 4 (G)
          item.start_time || "", // เริ่มต้น (H)
          item.end_time || "", // สิ้นสุด (I)
          getMachineNameById(item.machine_id?.toString() || ""), // เครื่องที่ (J)
          getRoomNameByCodeOrId(item.production_room || "") // ห้องผลิต (K)
        ];
      });
      // 2. ส่ง batch ไป 1.ใบสรุปงาน v.4
      debugLog("🟡 [DEBUG] ส่งข้อมูลไป 1.ใบสรุปงาน v.4:", summaryRows.length, "แถว");
      debugLog("🟡 [DEBUG] ข้อมูล summaryRows:", summaryRows);
      try {
        await sendToGoogleSheet({
          sheetName: "1.ใบสรุปงาน v.4",
          rows: summaryRows,
          clearSheet: true
        });
        debugLog("🟢 [DEBUG] ส่งข้อมูลไป 1.ใบสรุปงาน v.4 สำเร็จ");
      } catch (error) {
        debugError("🔴 [DEBUG] เกิดข้อผิดพลาดในการส่งข้อมูลไป 1.ใบสรุปงาน v.4:", error);
        throw error; // Re-throw เพื่อให้ caller จับได้
      }

      // 3. เตรียมข้อมูลสำหรับ Log_แผนผลิต (แยกแถวตามผู้ปฏิบัติงาน)
      const logRows: string[][] = [];
      
      // ใช้ selectedDate แทน today เพื่อให้วันที่ตรงกับข้อมูลงาน
       const selectedDateObj = createSafeDate(selectedDate);
       const dateString = selectedDateObj ? formatDateForGoogleSheet(selectedDateObj) : 'Invalid Date';
       const dateValue = selectedDateObj ? formatDateForValue(selectedDateObj) : 'Invalid Date';
      const timeStamp = new Date().toLocaleString('en-GB') + ', ' + new Date().toLocaleTimeString('en-GB');

      debugLog("🟡 [DEBUG] Date processing:");
      debugLog("🟡 [DEBUG] selectedDate (input):", selectedDate);
      debugLog("🟡 [DEBUG] selectedDateObj:", selectedDateObj);
      debugLog("🟡 [DEBUG] dateString:", dateString);
      debugLog("🟡 [DEBUG] dateValue:", dateValue);
      debugLog("🟡 [DEBUG] timeStamp:", timeStamp);

      // หาข้อมูลงาน A B C D ที่มีข้อมูลจริงๆ ในฐานข้อมูล (ทั้ง work_plans และ work_plan_drafts)
      const defaultJobsData = productionData.filter(item => 
        item.production_date === selectedDate && 
        defaultCodes.includes(item.job_code)
      );

      debugLog("🔍 [DEBUG] ข้อมูลงาน A B C D ที่หาได้:", defaultJobsData);
      debugLog("🔍 [DEBUG] selectedDate:", selectedDate);
      debugLog("🔍 [DEBUG] defaultCodes:", defaultCodes);
      debugLog("🔍 [DEBUG] productionData ทั้งหมด:", productionData.filter(item => item.production_date === selectedDate));

      // ถ้าไม่มีข้อมูลงาน A B C D ในฐานข้อมูล ให้ใช้ข้อมูล default
      if (defaultJobsData.length === 0) {
        const defaultJobs = [
          { job_code: 'A', job_name: 'เบิกของส่งสาขา  - ผัก' },
          { job_code: 'B', job_name: 'เบิกของส่งสาขา  - สด' },
          { job_code: 'C', job_name: 'เบิกของส่งสาขา  - แห้ง' },
          { job_code: 'D', job_name: 'ตวงสูตร' }
        ];

        // เพิ่มงาน A B C D ใน Log_แผนผลิต (ไม่มีข้อมูลคนและเวลา)
        defaultJobs.forEach((defaultJob) => {
          logRows.push([
            dateString, // วันที่
            dateValue, // Date Value
            defaultJob.job_code, // เลขที่งาน (A, B, C, D)
            defaultJob.job_name, // ชื่องาน
            "", // ผู้ปฏิบัติงาน (ว่าง)
            "", // เวลาเริ่มต้น (ว่าง)
            "", // เวลาสิ้นสุด (ว่าง)
            "" // ห้อง (ว่าง)
          ]);
        });
      } else {
        // ถ้ามีข้อมูลงาน A B C D ในฐานข้อมูล ให้ใช้ข้อมูลจริง
        defaultJobsData.forEach((item) => {
          const operators = (typeof item.operators === 'string' ? item.operators : "").split(", ").map((s: string) => s.trim()).filter(Boolean);
          
          if (operators.length === 0) {
            // ถ้าไม่มีผู้ปฏิบัติงาน ส่ง 1 แถว (8 คอลัมน์)
            logRows.push([
              dateString, // วันที่
              dateValue, // Date Value
              item.job_code || "", // เลขที่งาน (A, B, C, D)
              item.job_name || "", // ชื่องาน
              "", // ผู้ปฏิบัติงาน (ว่าง)
              item.start_time || "", // เวลาเริ่มต้น
              item.end_time || "", // เวลาสิ้นสุด
              getRoomNameByCodeOrId(item.production_room) // ห้อง
            ]);
          } else {
            // ถ้ามีผู้ปฏิบัติงาน ส่งแถวละคน (8 คอลัมน์)
            operators.forEach((operator: string) => {
              logRows.push([
                dateString, // วันที่
                dateValue, // Date Value
                item.job_code || "", // เลขที่งาน (A, B, C, D)
                item.job_name || "", // ชื่องาน
                operator, // ผู้ปฏิบัติงาน
                item.start_time || "", // เวลาเริ่มต้น
                item.end_time || "", // เวลาสิ้นสุด
                getRoomNameByCodeOrId(item.production_room) // ห้อง
              ]);
            });
          }
        });
      }

      // เพิ่มข้อมูลงานอื่นๆ
      filtered.forEach((item) => {
        const operators = (typeof item.operators === 'string' ? item.operators : "").split(", ").map((s: string) => s.trim()).filter(Boolean);
        
        if (operators.length === 0) {
          // ถ้าไม่มีผู้ปฏิบัติงาน ส่ง 1 แถว (8 คอลัมน์)
          logRows.push([
            dateString, // วันที่
            dateValue, // Date Value
            item.job_code || "", // เลขที่งาน (รหัสจริง)
            item.job_name || "", // ชื่องาน (ชื่อจริง)
            "", // ผู้ปฏิบัติงาน (ว่าง)
            item.start_time || "", // เวลาเริ่มต้น
            item.end_time || "", // เวลาสิ้นสุด
            getRoomNameByCodeOrId(item.production_room) // ห้อง (ไม่รวม notes)
          ]);
        } else {
          // ถ้ามีผู้ปฏิบัติงาน ส่งแถวละคน (8 คอลัมน์)
          operators.forEach((operator: string) => {
            logRows.push([
              dateString, // วันที่
              dateValue, // Date Value
              item.job_code || "", // เลขที่งาน (รหัสจริง)
              item.job_name || "", // ชื่องาน (ชื่อจริง)
              operator, // ผู้ปฏิบัติงาน
              item.start_time || "", // เวลาเริ่มต้น
              item.end_time || "", // เวลาสิ้นสุด
              getRoomNameByCodeOrId(item.production_room) // ห้อง (ไม่รวม notes)
            ]);
          });
        }
      });

      // 4. ส่ง batch ไป Log_แผนผลิต (แยกการส่ง)
      if (logRows.length > 0) {
        debugLog("🟡 [DEBUG] ส่งข้อมูลไป Log_แผนผลิต:", logRows.length, "แถว");
        debugLog("🟡 [DEBUG] ข้อมูล logRows:", logRows);
        try {
          await sendToGoogleSheet({
            sheetName: "Log_แผนผลิต",
            rows: logRows,
            clearSheet: true
          });
          debugLog("🟢 [DEBUG] ส่งข้อมูลไป Log_แผนผลิต สำเร็จ");
        } catch (error) {
          debugError("🔴 [DEBUG] เกิดข้อผิดพลาดในการส่งข้อมูลไป Log_แผนผลิต:", error);
          throw error; // Re-throw เพื่อให้ caller จับได้
        }
      } else {
        debugLog("🟡 [DEBUG] ไม่มีข้อมูล logRows ที่จะส่ง");
      }
      // 5. อัปเดตวันที่ใน D1 ของ sheet รายงาน-เวลาผู้ปฏิบัติงาน
      const reportSheetName = "รายงาน-เวลาผู้ปฏิบัติงาน";
      debugLog("🟡 [DEBUG] อัปเดตวันที่ในรายงาน-เวลาผู้ปฏิบัติงาน:", dateValue);
      debugLog("🟡 [DEBUG] Sheet name:", reportSheetName);
      debugLog("🟡 [DEBUG] Sheet name length:", reportSheetName.length);
      debugLog("🟡 [DEBUG] selectedDate:", selectedDate);
      debugLog("🟡 [DEBUG] dateValue:", dateValue);
      try {
        await sendToGoogleSheet({
          sheetName: reportSheetName,
          "Date Value": dateValue,
          "วันที่": dateString
        });
        debugLog("🟢 [DEBUG] อัปเดตวันที่ในรายงาน-เวลาผู้ปฏิบัติงาน สำเร็จ");
      } catch (error) {
        debugError("🔴 [DEBUG] เกิดข้อผิดพลาดในการอัปเดตวันที่ในรายงาน-เวลาผู้ปฏิบัติงาน:", error);
        throw error; // Re-throw เพื่อให้ caller จับได้
      }
      setIsSubmitting(false);
      
      // เพิ่มการ reload productionData หลัง sync สำเร็จ
      debugLog("🔄 [DEBUG] Sync completed, reloading production data...");
      await loadAllProductionData();
      debugLog("🟢 [DEBUG] Production data reloaded successfully");
      
      // แสดงข้อความสำเร็จ
      setMessage("Sync และพิมพ์ใบงานผลิตสำเร็จ");
      setSuccessDialogMessage("Sync และพิมพ์ใบงานผลิตสำเร็จ");
      setShowSuccessDialog(true);
      
    } catch (err) {
      setMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ API");
      setIsSubmitting(false);
    }
  };

  // เพิ่มฟังก์ชันยกเลิกการผลิต
  const handleCancelProduction = async (workPlanId: string) => {
    debugLog('🔴 [DEBUG] handleCancelProduction called with workPlanId:', workPlanId);
    
    if (!confirm("คุณต้องการยกเลิกการผลิตนี้หรือไม่?")) {
      debugLog('🔴 [DEBUG] User cancelled the confirmation dialog');
      return;
    }
    
    debugLog('🔴 [DEBUG] User confirmed cancellation, proceeding...');
    setIsSubmitting(true);
    setMessage("");
    
    try {
          const url = getApiUrl(`/api/work-plans/${workPlanId}/cancel`);
    debugLog('🔴 [DEBUG] Making PATCH request to:', url);
    
    const res = await fetch(url, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      mode: 'cors'
    });
      
      debugLog('🔴 [DEBUG] Response status:', res.status);
      debugLog('🔴 [DEBUG] Response ok:', res.ok);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      debugLog('🔴 [DEBUG] Response data:', data);
      
      if (data.success) {
        debugLog('🔴 [DEBUG] Cancel successful, reloading production data...');
        setMessage("ยกเลิกการผลิตสำเร็จ");
        await loadAllProductionData(); // reload ข้อมูลหลังจากยกเลิก
        debugLog('🔴 [DEBUG] Production data reloaded');
      } else {
        debugLog('🔴 [DEBUG] Cancel failed:', data.message);
        setMessage(data.message || "เกิดข้อผิดพลาดในการยกเลิกการผลิต");
      }
    } catch (err) {
      debugError('🔴 [DEBUG] Error in handleCancelProduction:', err);
      setMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ API");
    }
    setIsSubmitting(false);
    debugLog('🔴 [DEBUG] handleCancelProduction completed');
  };

  const handleViewProductionDetails = async (item: any) => {
    debugLog('👁️ [DEBUG] handleViewProductionDetails called with item:', item);
    
    setProductionDetailsData(item);
    setProductionDetailsModalOpen(true);
    
    // ดึงข้อมูล logs สำหรับงานนี้
    try {
      const response = await fetch(`/api/logs?work_plan_id=${item.id}`);
      const data = await response.json();
      
      if (data.success) {
        setProductionLogs(data.data || []);
        debugLog('👁️ [DEBUG] Production logs loaded:', data.data);
      } else {
        debugLog('👁️ [DEBUG] Failed to load logs:', data.message);
        setProductionLogs([]);
      }
    } catch (error) {
      debugError('👁️ [DEBUG] Error loading production logs:', error);
      setProductionLogs([]);
    }
  };

  // ฟังก์ชันช่วยแปลงเวลาจาก seconds เป็นรูปแบบที่อ่านได้
  const formatDuration = (seconds: number) => {
    if (!seconds) return "ไม่ระบุ";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours} ชม. ${minutes} นาที`;
    } else if (minutes > 0) {
      return `${minutes} นาที ${remainingSeconds} วินาที`;
    } else {
      return `${remainingSeconds} วินาที`;
    }
  };

  // ฟังก์ชันช่วยแปลง timestamp เป็นเวลา
  const formatTime = (timestamp: string) => {
    if (!timestamp) return "ไม่ระบุ";
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleDeleteDraft = async (draftId: string) => {
    debugLog('🗑️ Attempting to delete draft with ID:', draftId);
    debugLog('🗑️ Edit draft data:', editDraftData);
    
    if (!confirm("คุณต้องการลบแบบร่างนี้หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้")) {
      return;
    }
    
    setIsSubmitting(true);
    setMessage("");
    try {
          debugLog('🗑️ Making DELETE request to:', `/api/work-plans/drafts/${draftId}`);
      const res = await fetch(getApiUrl(`/api/work-plans/${draftId}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      debugLog('🗑️ Response status:', res.status);
      
      // ตรวจสอบ response ว่ามีเนื้อหาหรือไม่
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { success: false, message: 'Empty response' };
      } catch (parseError) {
        debugError('🗑️ JSON parse error:', parseError);
        debugError('🗑️ Response text was:', text);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
      
      debugLog('🗑️ Response data:', data);
      
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      if (data.success) {
        setMessage("ลบแบบร่างสำเร็จ");
        setEditDraftModalOpen(false); // ปิด modal
        await loadAllProductionData(); // reload ข้อมูลหลังจากลบ
      } else {
        setMessage(data.message || "เกิดข้อผิดพลาดในการลบแบบร่าง");
      }
    } catch (err: any) {
      debugError('🗑️ Error deleting draft:', err);
      setMessage(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ API");
    }
    setIsSubmitting(false);
  };

  // ✅ ปรับปรุง: ใช้ Backend API แทนการสร้างงานเองที่ Frontend
  // เปลี่ยนจากสร้างทีละงาน → เรียก Backend API เดียว (transaction safety, performance ดีกว่า)
  useEffect(() => {
    if (viewMode !== "daily") return;
    if (!selectedDate) return;
    if (isCreatingRef.current) return;
    
    const createDefaultTasks = async () => {
      isCreatingRef.current = true;
      
      try {
        // ตรวจสอบว่า date มีค่า
        if (!selectedDate) {
          debugLog('[AUTO-DEFAULT] No selectedDate, skipping default task creation');
          return;
        }
        
        debugLog(`[AUTO-DEFAULT] Creating default tasks for date: ${selectedDate}`);
        
        // ✅ เรียก Next.js API route (ซึ่งจะ proxy ไปยัง Backend)
        // Backend จะเช็คและสร้างเฉพาะงานที่ยังไม่มี (ละเอียดและแม่นยำ)
        const response = await fetch('/api/work-plans/create-defaults', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            production_date: selectedDate
          })
        });
        
        if (response.ok) {
          const responseData = await response.json();
          debugLog(`[AUTO-DEFAULT] Successfully processed default tasks:`, responseData);
          
          if (responseData.created) {
            debugLog(`[AUTO-DEFAULT] Created ${responseData.createdCount || 0} new tasks`);
          } else {
            debugLog(`[AUTO-DEFAULT] All tasks already exist (${responseData.skippedCount || 0} tasks)`);
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          debugError(`[AUTO-DEFAULT] Failed to create default tasks:`, {
            status: response.status,
            error: errorData
          });
        }
        
        // โหลดข้อมูลใหม่หลังจากสร้าง tasks
        await loadAllProductionData();
        
        debugLog(`[AUTO-DEFAULT] Completed processing default tasks for date: ${selectedDate}`);
      } catch (error) {
        debugError('[AUTO-DEFAULT] Error creating default tasks:', error);
      } finally {
        isCreatingRef.current = false;
      }
    };
    
    createDefaultTasks();
  }, [selectedDate]);

  // เพิ่มฟังก์ชัน syncWorkOrder
  const syncWorkOrder = async (date: string) => {
    if (!date) return;
    try {
              const res = await fetch(getApiUrl(`/api/work-plans/sync-work-order?date=${date}`), {
        method: 'POST'
      });
      if (res.ok) {
        debugLog(`[SYNC] work_order synced for date: ${date}`);
      } else {
        console.warn(`[SYNC] Failed to sync work_order for date: ${date}`);
      }
    } catch (err) {
      console.warn('Failed to sync work order:', err);
    }
  };

  // เพิ่มฟังก์ชัน resetForm สำหรับล้างค่าฟอร์ม
  const resetForm = () => {
    setJobName("");
    setOperators(["", "", "", ""]);
    setStartTime("");
    setEndTime("");
    setNote("");
    setSelectedMachine("");
    setSelectedRoom("");
    setJobQuery("");
    setJobCode("");
  };

  // ฟังก์ชันโหลดข้อมูลย้อนหลัง 30 วัน (background)
  const loadHistoricalData = async (currentDate: string) => {
    try {
      setIsLoadingHistorical(true);
      debugLog('🕐 Loading historical data (30 days) in background...');
      
      // คำนวณวันที่ 30 วันย้อนหลัง
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
      
      // โหลดข้อมูลย้อนหลังแบบ chunks (ไม่ให้หนักเกินไป)
      const chunkSize = 100;
      let page = 1;
      let hasMore = true;
      const historicalData: any[] = [];
      
      while (hasMore && page <= 5) { // จำกัดไม่เกิน 5 หน้า
        const response = await fetch(
          getApiUrl(`/api/work-plans?page=${page}&limit=${chunkSize}`)
        );
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          // กรองเฉพาะข้อมูล 30 วันย้อนหลัง
          const filteredData = data.data.filter((item: any) => {
            const itemDate = new Date(item.production_date);
            const currentDateObj = new Date(currentDate);
            const diffDays = Math.ceil((currentDateObj.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
          });
          
          historicalData.push(...filteredData);
          debugLog(`📦 Loaded chunk ${page}: ${filteredData.length} items (total: ${historicalData.length})`);
          
          hasMore = data.pagination?.hasNextPage || false;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      // รวมข้อมูลเก่าเข้ากับข้อมูลปัจจุบัน
      if (historicalData.length > 0) {
        setProductionData(prev => {
          // ตรวจสอบว่า prev มีข้อมูลหรือไม่ (ถ้าไม่มีอาจจะยังไม่โหลดเสร็จ)
          if (!prev || prev.length === 0) {
            debugLog('⚠️ Previous data is empty, skipping historical data merge');
            return prev; // ไม่ merge ถ้าข้อมูลหลักยังไม่โหลด
          }
          
          // ลบข้อมูลซ้ำ (ถ้ามี)
          const existingIds = new Set(prev.map((item: any) => item.id));
          const newData = historicalData.filter((item: any) => !existingIds.has(item.id));
          
          debugLog(`📈 Added ${newData.length} historical items to existing ${prev.length} items`);
          return [...prev, ...newData];
        });
      }
      
    } catch (error) {
      debugError('Error loading historical data:', error);
    } finally {
      setIsLoadingHistorical(false);
    }
  };

  // ฟังก์ชันโหลดข้อมูลหน้าถัดไป
  const loadMoreData = async () => {
    if (isLoadingMore || !hasNextPage) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      
      // ตรวจสอบว่า date มีค่า
      if (!selectedDate) {
        debugLog('⚠️ No selectedDate, skipping loadMoreData');
        return;
      }
      
      const response = await fetch(getApiUrl(`/api/work-plans?date=${selectedDate}&page=${nextPage}&limit=100`));
      const data = await response.json();
      
      if (data.success && data.data) {
        // เพิ่มข้อมูลใหม่เข้าไปใน array เดิม
        setProductionData(prev => [...prev, ...data.data]);
        
        // อัปเดต pagination info
        if (data.pagination) {
          setCurrentPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages);
          setHasNextPage(data.pagination.hasNextPage);
        }
      }
    } catch (error) {
      debugError('Error loading more data:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ลบ infinite scroll logic แล้ว - ให้แสดงยาวลงมาเลย

  // เพิ่มฟังก์ชันโหลดข้อมูลทั้งหมด
  const loadAllProductionData = async () => {
    try {
      // ตรวจสอบว่า date มีค่าก่อนเรียก API
      if (!selectedDate) {
        debugLog('⚠️ No selectedDate available, skipping loadAllProductionData');
        return;
      }
      
      // Capture ค่า date เพื่อใช้ใน setTimeout
      const dateForLoad = selectedDate;
      
      setIsLoadingData(true);
      debugLog('🔄 Starting loadAllProductionData for date:', dateForLoad);
      
      // โหลดข้อมูลสำหรับ weekly view (ไม่จำกัด limit)
      debugLog('📅 Loading data for date:', dateForLoad);
      
      // เรียก API เดียว (ไม่ต้องแยก drafts แล้ว) และลดขนาด payload
      const plansResponse = await fetch(getApiUrl(`/api/work-plans?date=${dateForLoad}&limit=100`));
      
      // ตรวจสอบว่า response เป็น JSON หรือไม่
      if (!plansResponse.ok) {
        const text = await plansResponse.text();
        debugError('❌ API Error Response:', text.substring(0, 200));
        throw new Error(`API error: ${plansResponse.status} ${plansResponse.statusText}`);
      }
      
      const contentType = plansResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await plansResponse.text();
        debugError('❌ Response is not JSON:', text.substring(0, 200));
        throw new Error('Response is not JSON');
      }
      
      const plans = await plansResponse.json();
      
      debugLog('📊 Loaded plans for selected date:', plans.data?.length || 0);
      
      // อัปเดต pagination info
      if (plans.pagination) {
        setCurrentPage(plans.pagination.page);
        setTotalPages(plans.pagination.totalPages);
        setHasNextPage(plans.pagination.hasNextPage);
      }
      
      // โหลดข้อมูลเพิ่มเติมสำหรับ weekly view ใน background
      setTimeout(() => {
        loadHistoricalData(dateForLoad);
      }, 1000); // เพิ่ม delay เพื่อให้แน่ใจว่าข้อมูลหลักถูก set แล้ว
      
      // ดึงสถานะจาก logs สำหรับ work plans
      const workPlanIds = (plans.data || []).map((p: any) => p.id).filter(Boolean);
      let logsStatusMap: { [key: number]: any } = {};
      
      if (workPlanIds.length > 0) {
        try {
          debugLog('[DEBUG] Fetching logs status for workPlanIds:', workPlanIds);
          const logsResponse = await fetch(
            getApiUrl(`/api/logs/work-plans/status?workPlanIds=${workPlanIds.join(',')}`)
          );
          
          // ตรวจสอบว่า response เป็น JSON หรือไม่
          if (!logsResponse.ok) {
            debugError('❌ Logs API Error:', logsResponse.status, logsResponse.statusText);
            throw new Error(`Logs API error: ${logsResponse.status}`);
          }
          
          const contentType = logsResponse.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            debugError('❌ Logs Response is not JSON');
            throw new Error('Logs response is not JSON');
          }
          
          const logsData = await logsResponse.json();
          debugLog('[DEBUG] Logs response:', logsData);
          if (logsData.success) {
            logsStatusMap = logsData.data;
            debugLog('[DEBUG] Logs status map:', logsStatusMap);
          }
        } catch (error) {
          debugError('Error fetching logs status:', error);
        }
      }
      // ประมวลผลข้อมูล work plans
      let allData = (plans.data || []).map((p: any) => {
        // กำหนดสถานะตาม workflow_status
        let recordStatus = 'แบบร่าง';
        let isPrintedFlag = false;
        
        if (p.workflow_status === 'draft') {
          recordStatus = 'แบบร่าง';
        } else if (p.workflow_status === 'completed') {
          recordStatus = 'บันทึกเสร็จสิ้น';
        } else if (p.workflow_status === 'printed') {
          recordStatus = 'พิมพ์แล้ว';
          isPrintedFlag = true;
        }
        
        // กำหนด isDraft ตาม workflow_status
        const isDraft = p.workflow_status === 'draft';
        
        // ใช้สถานะจาก logs ถ้ามี
        const logsStatus = logsStatusMap[p.id];
        let status = p.status_name || 'รอดำเนินการ';
        let status_name = p.status_name || 'รอดำเนินการ';
        
        debugLog(`[DEBUG] Work plan ${p.id} logs status:`, logsStatus);
        debugLog(`[DEBUG] Work plan ${p.id} workflow_status:`, p.workflow_status);
        debugLog(`[DEBUG] Work plan ${p.id} job_type:`, p.job_type);
        
        // ตรวจสอบ status_id จากฐานข้อมูล
        if (p.status_id === 9) {
          status = 'ยกเลิกการผลิต';
          status_name = 'ยกเลิกการผลิต';
        } else if (logsStatus) {
          status = logsStatus.message;
          status_name = logsStatus.message;
        }
        
        // Parse operators (Backend ส่งมาเป็น string แล้ว)
        // ✅ ใช้ operators_from_join ก่อน (ข้อมูลจาก Backend JOIN) ถ้าไม่มีค่อยใช้ operators
        let operatorNames = (p.operators_from_join || p.operators || '').trim();
        
        return {
          ...p,
          isDraft: isDraft,
          status: status,
          status_name: status_name,
          recordStatus: recordStatus,
          isPrinted: isPrintedFlag,
          operators: operatorNames,
          // ✅ เก็บ operators_from_join ไว้ด้วย (สำหรับ renderStaffAvatars)
          operators_from_join: p.operators_from_join || operatorNames,
          production_room: p.production_room_name || 'ไม่ระบุ',
          machine_id: p.machine_id || '',
          notes: p.notes || '',
          // รักษา backward compatibility
          is_special: p.job_type === 'special' ? 1 : 0,
          workflow_status_id: p.workflow_status === 'draft' ? 1 : p.workflow_status === 'completed' ? 2 : 3,
        };
      });
             // ตั้งค่า state ทันทีหลังจากได้ข้อมูล
             debugLog('📊 [DEBUG] Setting production data:', allData.length, 'items');
             debugLog('📊 [DEBUG] Data sample before set:', allData.slice(0, 3));
             
             // ใช้ functional update เพื่อให้แน่ใจว่า state update ถูกต้อง
             setProductionData(() => {
               debugLog('📊 [DEBUG] Inside setProductionData callback, setting', allData.length, 'items');
               return allData;
             });
             
             // ตรวจสอบว่าข้อมูลถูก set หรือไม่
             setTimeout(() => {
               debugLog('📊 [DEBUG] Verifying data was set correctly');
             }, 100);
             
             debugLog('📊 [DEBUG] Production data set successfully');
             debugLog('📊 [DEBUG] Sample data:', allData.slice(0, 3));
             isCreatingRef.current = false; // reset flag หลังโหลดข้อมูลเสร็จ
     } catch (error) {
       debugError('❌ Error loading production data:', error);
       // ไม่ต้อง reset productionData ในกรณี error เพื่อไม่ให้ข้อมูลหาย
     } finally {
       setIsLoadingData(false);
       debugLog('✅ loadAllProductionData completed');
     }
  };

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState("");

  // ฟังก์ชันแปลงชื่อแสดงผลงาน (เติม prefix เฉพาะตอนแสดงผลเท่านั้น, ใช้ is_special)
  const getDisplayJobName = (item: any, jobsOfDay: any[]) => {
    const defaultCodes = ['A', 'B', 'C', 'D'];
    
    // ถ้าเป็นงาน A, B, C, D ให้แสดงแค่ job_code
    if (defaultCodes.includes(item.job_code)) {
      return item.job_code;
    }
    
    // สำหรับงานอื่นๆ ให้หาลำดับในรายการของวันนั้น
    const sameDayJobs = jobsOfDay.filter(j => 
      j.production_date === item.production_date && 
      !defaultCodes.includes(j.job_code)
    );
    
    // เรียงตามลำดับการแสดงผล
    const sortedJobs = getSortedDailyProduction(sameDayJobs);
    const jobIndex = sortedJobs.findIndex(j => j.id === item.id);
    
    return jobIndex >= 0 ? `งานที่ ${jobIndex + 1}` : `งานที่ ${item.id}`;
  };

  // ฟังก์ชันคำนวณข้อมูลสรุปการลงคนลงเวลา
  const calculateDailySummary = (jobs: any[]) => {
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

    // สร้าง Map สำหรับเก็บเวลาของแต่ละคน
    const workerHours = new Map<string, number>();

    validJobs.forEach(job => {
      // เพิ่มผู้ปฏิบัติงานในงานนี้เข้าไปใน Set (ไม่ซ้ำ)
      const workers = getOperatorsArray(job.operators);
      workers.forEach((worker: string) => allWorkers.add(worker));

      // คำนวณเวลาที่ใช้ในงานนี้ (หักเวลาพักเที่ยง)
      const startTime = new Date(`2000-01-01 ${job.start_time}`);
      const endTime = new Date(`2000-01-01 ${job.end_time}`);
      let durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // ตรวจสอบว่าข้ามเที่ยงหรือไม่ (12:00-13:00)
      const lunchStart = new Date(`2000-01-01 12:00`);
      const lunchEnd = new Date(`2000-01-01 13:00`);
      
      // ถ้างานข้ามเที่ยง ให้หัก 45 นาที (0.75 ชั่วโมง)
      if (startTime < lunchEnd && endTime > lunchStart) {
        durationHours -= 0.75; // หัก 45 นาที
      }
      
      // คำนวณคน-ชั่วโมง (จำนวนคน × เวลาที่ใช้)
      const workerCount = workers.length;
      totalUsedTime += durationHours * workerCount;

      // เพิ่มเวลาสำหรับแต่ละคน
      workers.forEach((worker: string) => {
        const currentHours = workerHours.get(worker) || 0;
        workerHours.set(worker, currentHours + durationHours);
      });
    });

    // จำนวนผู้ปฏิบัติงานที่ไม่ซ้ำในวันนั้น
    const totalWorkers = allWorkers.size;

    // คำนวณชั่วโมงงาน (จำนวนผู้ปฏิบัติงาน × 8 ชั่วโมง)
    totalWorkHours = totalWorkers * 8;

    // คำนวณ Capacity (%)
    const capacityPercentage = totalWorkHours > 0 ? (totalUsedTime / totalWorkHours) * 100 : 0;

    // สร้างรายการข้อมูลของแต่ละคน
    const workerDetails = Array.from(allWorkers).map(worker => {
      const hours = workerHours.get(worker) || 0;
      const quota = 8; // โคต้า 8 ชั่วโมง
      const maxQuota = 8.5; // เกิน 8 ชั่วโมง 30 นาที ให้ถือว่าเต็มเวลา
      const remaining = Math.max(0, quota - hours);
      
      let status, displayHours, displayText;
      
      // ฟังก์ชันแปลงเวลาจากทศนิยมเป็นรูปแบบที่อ่านง่าย
      const formatRemainingTime = (hours: number) => {
        if (hours === 0) return '0 ชั่วโมง';
        
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        
        if (wholeHours === 0) {
          return `ว่าง ${minutes} นาที`;
        } else if (minutes === 0) {
          return `ว่าง ${wholeHours} ชั่วโมง`;
        } else {
          return `ว่าง ${wholeHours} ชั่วโมง ${minutes} นาที`;
        }
      };
      
      if (hours >= maxQuota) {
        // เกิน 8.5 ชั่วโมง ให้แสดงว่าเต็มเวลา
        status = 'full';
        displayHours = quota;
        displayText = 'ได้รับงานเต็มเวลา';
      } else if (remaining <= 2) {
        // เหลือ 0-2 ชั่วโมง
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
      lunchBreakDeduction: 0.75, // ข้อมูลเวลาพักเที่ยงที่หัก
      availableWorkers: users
        .filter(user => !allWorkers.has(user.name)) // คนที่ไม่ได้ทำงาน
        .filter(user => !['RD', 'พี่สัญญา'].includes(user.name)) // กรองพนักงานเสริมออก
        .map(user => user.name), // คนที่ว่างงาน (เฉพาะผู้ปฏิบัติงานหลัก)
      availableSupportStaff: users
        .filter(user => !allWorkers.has(user.name)) // คนที่ไม่ได้ทำงาน
        .filter(user => ['RD', 'พี่สัญญา'].includes(user.name)) // เฉพาะพนักงานเสริม
        .map(user => user.name), // พนักงานเสริมที่ว่าง
      workerDetails: workerDetails // รายละเอียดของแต่ละคน
    };
  };

  // เพิ่มฟังก์ชันเรียงลำดับงานแบบเดียวกับ Draft
  const sortJobsForDisplay = (jobs: any[]) => {
    return [...jobs].sort((a, b) => {
      const timeA = a.start_time || "00:00";
      const timeB = b.start_time || "00:00";
      const timeComparison = timeA.localeCompare(timeB);
      if (timeComparison !== 0) return timeComparison;
      // เรียงผู้ปฏิบัติงานที่ขึ้นต้นด้วย 'อ' ขึ้นก่อน
      const opA = (typeof a.operators === 'string' ? a.operators : "").split(", ")[0] || "";
      const opB = (typeof b.operators === 'string' ? b.operators : "").split(", ")[0] || "";
      const indexA = opA.indexOf("อ");
      const indexB = opB.indexOf("อ");
      if (indexA === 0 && indexB !== 0) return -1;
      if (indexB === 0 && indexA !== 0) return 1;
      return opA.localeCompare(opB);
    });
  };

  // ฟังก์ชันสำหรับ Daily View: งานปกติเรียงก่อน งานพิเศษต่อท้าย (ใช้ is_special)
  const getSortedDailyProduction = (jobs: any[]) => {
    const defaultCodes = ['A', 'B', 'C', 'D'];
    
    // แยกงานเป็นกลุ่มต่างๆ
    const defaultDrafts = jobs.filter(j => defaultCodes.includes(j.job_code));
    const normalJobs = jobs.filter(j => !defaultCodes.includes(j.job_code) && j.is_special !== 1);
    const specialJobs = jobs.filter(j => j.is_special === 1 && !defaultCodes.includes(j.job_code));
    
    // แยกงานแบบร่าง (isDraft = true) ออกจากงานปกติ
    const normalDrafts = normalJobs.filter(j => j.isDraft);
    const normalCompleted = normalJobs.filter(j => !j.isDraft);
    const specialDrafts = specialJobs.filter(j => j.isDraft);
    const specialCompleted = specialJobs.filter(j => !j.isDraft);
    
    // เรียงงาน default ตามลำดับ A, B, C, D
    defaultDrafts.sort((a, b) => defaultCodes.indexOf(a.job_code) - defaultCodes.indexOf(b.job_code));
    
    // เรียงงานปกติและงานพิเศษที่เสร็จแล้วตามเวลา
    const sortFn = (a: any, b: any) => {
      const timeA = a.start_time || "00:00";
      const timeB = b.start_time || "00:00";
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
    
    normalCompleted.sort(sortFn);
    specialCompleted.sort(sortFn);
    
    // เรียงงานแบบร่างตามเวลาที่สร้าง (ใหม่สุดอยู่ล่างสุด)
    const sortDraftsByCreatedAt = (a: any, b: any) => {
      const createdAtA = new Date(a.created_at || a.updated_at || 0);
      const createdAtB = new Date(b.created_at || b.updated_at || 0);
      return createdAtA.getTime() - createdAtB.getTime(); // เรียงจากเก่าไปใหม่
    };
    
    normalDrafts.sort(sortDraftsByCreatedAt);
    specialDrafts.sort(sortDraftsByCreatedAt);
    
    // ส่งคืนตามลำดับ: default -> งานปกติเสร็จแล้ว -> งานปกติแบบร่าง -> งานพิเศษเสร็จแล้ว -> งานพิเศษแบบร่าง (งานพิเศษอยู่ล่างสุดเสมอ)
    return [
      ...defaultDrafts,
      ...normalCompleted,
      ...normalDrafts,
      ...specialCompleted,
      ...specialDrafts
    ];
  };


  // ===== Weekly board interactions =====
  const handleEditClick = (item: any) => {
    try {
      if (isDraftItem(item)) {
        handleEditDraft(item)
      } else {
        debugLog("Open view/edit for non-draft item", item)
      }
    } catch (e) {
      debugError("handleEditClick error", e)
    }
  }

  const handleQuickAdd = (dateKey: string) => {
    setSelectedDate(dateKey)
    setViewMode("daily")
  }

  const handleReorderSameDay = (dateKey: string, newOrder: any[]) => {
    setProductionData(prev => {
      const keepOthers = prev.filter(p => formatDateForAPI(p.production_date) !== dateKey)
      return [...keepOthers, ...newOrder]
    })
  }

  const handleMoveAcrossDays = (fromKey: string, toKey: string, item: any, position: number) => {
    setProductionData(prev => {
      const updated = prev.map(p => (p.id === item.id ? { ...p, production_date: toKey } : p))
      // Rebuild order for target day by inserting at position
      const target = updated.filter(p => formatDateForAPI(p.production_date) === toKey)
      const others = updated.filter(p => formatDateForAPI(p.production_date) !== toKey)
      const moved = target.filter(p => p.id === item.id)[0]
      const rest = target.filter(p => p.id !== item.id)
      const clampedPos = Math.min(Math.max(position, 0), rest.length)
      rest.splice(clampedPos, 0, moved)
      return [...others, ...rest]
    })
  }

  // Helper functions for WeeklyCalendar
  const convertToProductionTasks = (data: ProductionItem[]): ProductionTask[] => {
    // Hide default A/B/C/D jobs in weekly view
    const defaultCodes = ['A', 'B', 'C', 'D']
    return data
      .filter(item => !defaultCodes.includes((item as any).job_code))
      .map(item => ({
      id: parseInt(item.id) || 0,
      date: formatDateForAPI(item.production_date),
      title: item.job_name,
      room: item.production_room || '',
      staff: getOperatorsString(item.operators),
      time: `${item.start_time || ''} - ${item.end_time || ''}`,
      status: (item as any).status_name || item.status || '',
      recordStatus: getJobStatus(item) as "บันทึกแบบร่าง" | "บันทึกเสร็จสิ้น" | "พิมพ์แล้ว",
      notes: (item as any).note || (item as any).notes || '',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))
  }

  const convertToProductionItem = (task: ProductionTask): ProductionItem => {
    // Find the original item from productionData
    const originalItem = productionData.find(item => item.id === task.id.toString())
    if (!originalItem) {
      throw new Error(`Production item with id ${task.id} not found`)
    }
    
    // Update the original item with new data
    return {
      ...originalItem,
      job_name: task.title,
      production_room: task.room,
      operators: task.staff,
      start_time: task.time.split(' - ')[0],
      end_time: task.time.split(' - ')[1],
      status: task.status as any,
      note: task.notes,
      production_date: task.date
    }
  }

  // WeeklyCalendar event handlers
  const handleTaskMove = (taskId: number, fromDate: string, toDate: string, fromIndex: number, toIndex: number) => {
    setProductionData(prev => {
      const updated = prev.map(p => 
        p.id === taskId.toString() ? { ...p, production_date: toDate } : p
      )
      
      // Rebuild order for target day by inserting at position
      const target = updated.filter(p => formatDateForAPI(p.production_date) === toDate)
      const others = updated.filter(p => formatDateForAPI(p.production_date) !== toDate)
      const moved = target.filter(p => p.id === taskId.toString())[0]
      const rest = target.filter(p => p.id !== taskId.toString())
      const clampedPos = Math.min(Math.max(toIndex, 0), rest.length)
      rest.splice(clampedPos, 0, moved)
      
      return [...others, ...rest]
    })
  }

  const handleTaskReorder = (taskId: number, date: string, fromIndex: number, toIndex: number) => {
    setProductionData(prev => {
      const dayItems = prev.filter(p => formatDateForAPI(p.production_date) === date)
      const otherItems = prev.filter(p => formatDateForAPI(p.production_date) !== date)
      
      // Reorder items within the same day
      const reordered = arrayMove(dayItems, fromIndex, toIndex)
      
      return [...otherItems, ...reordered]
    })
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

  // ฟังก์ชันเตรียมข้อมูล Time Table
  function getTimeTableData(jobs: any[], users: any[]) {
    // กรองเฉพาะผู้ปฏิบัติงานหลัก
    const mainUsers = users.filter(u => !["RD", "พี่สัญญา"].includes(u.name));
    const timeSlots = generateTimeSlots();
    
    // สลับตำแหน่ง แมน กับ แจ็ค (แมนขึ้นก่อน)
    const sortedUsers = mainUsers.sort((a, b) => {
      if (a.name === "แมน") return -1;
      if (b.name === "แมน") return 1;
      if (a.name === "แจ็ค") return 1;
      if (b.name === "แจ็ค") return -1;
      return a.name.localeCompare(b.name);
    });
    
    // เตรียมข้อมูลแต่ละคน
    const data = sortedUsers.map(user => {
      // หางานที่ user นี้ทำ
      const userJobs = jobs.filter(job => {
        if (!job.operators || !job.start_time || !job.end_time) return false;
        return getOperatorsArray(job.operators).includes(user.name);
      });
      
      // สร้างข้อมูล slot ที่มีการ merge งานต่อเนื่อง
      const slots = timeSlots.map((slot, slotIndex) => {
        // ตรวจสอบว่าเป็นเวลาพักเที่ยงหรือไม่
        if (slot === "12:30-13:15") {
          return {
            hasJob: false,
            jobName: "",
            jobCode: "",
            isStart: false,
            isEnd: false,
            colspan: 1,
            isLunchBreak: true
          };
        }
        
        // หางานที่ตรงกับ slot นี้
        const jobInfo = userJobs.find(job => {
          return slot >= job.start_time && slot < job.end_time;
        });
        
        if (!jobInfo) {
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
        
        // คำนวณ colspan สำหรับงานต่อเนื่อง
        const jobStartSlotIndex = timeSlots.findIndex(s => s >= jobInfo.start_time);
        const jobEndSlotIndex = timeSlots.findIndex(s => s >= jobInfo.end_time);
        const colspan = jobEndSlotIndex > jobStartSlotIndex ? jobEndSlotIndex - jobStartSlotIndex : 1;
        
        // ตรวจสอบว่าเป็น slot แรกของงานนี้หรือไม่
        const isStart = slotIndex === jobStartSlotIndex;
        
        // ตรวจสอบว่าเป็น slot สุดท้ายของงานนี้หรือไม่
        const isEnd = slotIndex === jobStartSlotIndex + colspan - 1;
        
        return {
          hasJob: true,
          jobName: jobInfo.job_name,
          jobCode: jobInfo.job_code,
          isStart,
          isEnd,
          colspan: isStart ? colspan : 1,
          isLunchBreak: false
        };
      });
      
      return { name: user.name, slots };
    });
    return { timeSlots, data };
  }

  // สีสำหรับแต่ละคน
  const workerColors = {
    "ป้าน้อย": "bg-blue-400",
    "พี่ตุ่น": "bg-green-400", 
    "พี่ภา": "bg-yellow-400",
    "สาม": "bg-purple-400",
    "อาร์ม": "bg-pink-400",
    "เอ": "bg-indigo-400",
    "แจ็ค": "bg-orange-400",
    "แมน": "bg-red-400",
    "โอเล่": "bg-teal-400"
  };

  // คอมโพเนนต์ TimeTable
  function TimeTable({ jobs, users, staffImages }: { jobs: any[], users: any[], staffImages: any }) {
    const { timeSlots, data } = getTimeTableData(jobs, users);
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border text-sm shadow-lg">
          <thead>
            <tr>
              <th className="p-2 border bg-gray-100 text-left font-semibold text-sm whitespace-nowrap">ชื่อ</th>
              {timeSlots.map((slot, idx) => (
                <th 
                  key={slot} 
                  className={`p-2 border text-center font-bold text-base min-w-[120px] whitespace-nowrap ${
                    slot === "12:30-13:15" 
                      ? "bg-orange-200 text-orange-800" 
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {slot === "12:30-13:15" ? "พักเที่ยง" : slot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.name}>
                <td className="p-2 border bg-white whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <img src={staffImages[row.name] || "/placeholder-user.jpg"} alt={row.name} className="w-6 h-6 rounded-full object-cover" />
                    <span className="font-semibold text-sm">{row.name}</span>
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
                      className={`border p-3 relative min-h-[50px] ${
                        slot.isLunchBreak 
                          ? "bg-gray-200 text-gray-600" 
                          : slot.hasJob 
                            ? workerColors[row.name as keyof typeof workerColors] || "bg-green-400" 
                            : "bg-white"
                      }`}
                    >
                      {slot.isLunchBreak && (
                        <div className="flex items-center justify-center text-base font-bold min-h-[50px]">
                          <span className="text-center leading-tight">
                            พักเที่ยง
                          </span>
                        </div>
                      )}
                      {slot.hasJob && (
                        <div className="flex items-center justify-center text-white text-sm font-medium min-h-[50px] overflow-hidden">
                          <span className="text-center leading-tight" title={slot.jobName}>
                            {slot.jobName}
                          </span>
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
    );
  }

  // Debug Modal state
  useEffect(() => {
    debugLog('🔍 Modal state changed:', { editDraftModalOpen, editDraftData: !!editDraftData });
  }, [editDraftModalOpen, editDraftData]);

  // ฟังก์ชันโหลดการตั้งค่า
  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success && data.data) {
        setSyncModeEnabled(data.data.syncModeEnabled || false);
      }
    } catch (error) {
      debugError('Error loading settings:', error);
    }
  };

  // โหลดการตั้งค่าเมื่อ component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // ฟังก์ชันจัดการสถานะงาน
  const getJobStatus = (item: any) => {
    // ใช้ workflow_status จาก Backend
    if (item.workflow_status === 'draft') {
      return "แบบร่าง";
    }
    
    if (item.workflow_status === 'completed') {
      return "บันทึกเสร็จสิ้น";
    }
    
    if (item.workflow_status === 'printed') {
      return "พิมพ์แล้ว";
    }
    
    // Backward compatibility: ตรวจสอบ workflow_status_id เดิม
    if (item.workflow_status_id === 1 || item.workflow_status_id === "1") {
      return "แบบร่าง";
    }
    
    if (item.workflow_status_id === 2 || item.workflow_status_id === "2") {
      return "บันทึกเสร็จสิ้น";
    }
    
    // ตรวจสอบ recordStatus เดิม
    if (item.recordStatus === "พิมพ์แล้ว" || item.recordStatus === "บันทึกสำเร็จ") {
      return "พิมพ์แล้ว";
    }
    
    // งานที่มี status_id = 3 หรือ recordStatus เป็น "กำลังดำเนินการ"
    if ((item.status_id === 3 || item.status_id === "3") || 
        (item.recordStatus === "กำลังดำเนินการ" || item.recordStatus === "ดำเนินการ")) {
      return "กำลังดำเนินการ";
    }
    
    // งานปกติที่มีใน Table work_plans (ไม่ใช่ draft) และไม่มี workflow_status_id = 2 ควรเป็น "พิมพ์แล้ว"
    if (!item.isDraft && item.workflow_status_id && item.workflow_status_id !== 2) {
      return "พิมพ์แล้ว";
    }
    
    return item.recordStatus;
  };

  // ฟังก์ชันตรวจสอบว่าควรแสดง label "งานพิเศษ" หรือไม่
  const shouldShowSpecialJobLabel = (item: any) => {
    // แสดง label "งานพิเศษ" เมื่อ job_type เป็น 'special'
    if (item.job_type === 'special') {
      return true;
    }
    
    // Backward compatibility: ตรวจสอบ status_id = 10 หรือ is_special = 1
    return (item.status_id === 10 || item.status_id === "10" || item.is_special === 1);
  };

  return (
    <div className={`min-h-screen bg-gray-200 ${notoSansThai.className} flex flex-col`}>
      {/* แก้ไข hydration error - แสดง loading ถ้ายัง render ใน client ไม่เสร็จ */}
      {!isClient ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">กำลังโหลดระบบ...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-600 shadow-md">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h1 className="text-sm sm:text-lg md:text-xl font-semibold text-white truncate">
                ระบบจัดการแผนการผลิตครัวกลาง บริษัท จิตต์ธนา จำกัด (สำนักงานใหญ่)
              </h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0">
              {/* derive allowed menus from role cookie (frontend guard) */}
              {(() => {
                // Centralized menu logic
                const { getRoleIdFromCookie } = require('./lib/menuLinks');
                const { buildMenuHref, isMenuAllowed } = require('./lib/menuLinks');
                const roleId = getRoleIdFromCookie();
                const hasPermission = (key: string) => isMenuAllowed(key as any, roleId);

                return (
                  <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center space-x-1 text-sm text-green-100 hover:text-white hover:bg-white/10 transition-colors duration-200 p-2"
                  >
                    <span>เมนู</span>
                    <ChevronDownIcon className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-200 shadow-lg">
                  {process.env.NEXT_PUBLIC_LOGS_URL ? (
                    <DropdownMenuItem asChild>
                      <a
                        href={process.env.NEXT_PUBLIC_LOGS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <span>ระบบประวัติการผลิต</span>
                      </a>
                    </DropdownMenuItem>
                  ) : null}
                  {process.env.NEXT_PUBLIC_SCHEDULE_URL ? (
                    <DropdownMenuItem asChild>
                      <a
                        href={process.env.NEXT_PUBLIC_SCHEDULE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <span>ตารางงานและกระบวนการผลิตสินค้าครัวกลาง</span>
                      </a>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    onClick={() => setShowTimeTable(true)}
                    className="flex items-center space-x-2 p-2 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-green-600" />
                    <span>แสดงตารางเวลา</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}

              <div className="flex items-center space-x-1 sm:space-x-2">
                {(() => {
                  return (
                    <>
                      <span className="hidden sm:block text-xs sm:text-sm text-white">ผู้ใช้: {userName || ''}</span>
                      <span className="sm:hidden text-xs text-white">{userName || ''}</span>
                    </>
                  );
                })()}
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-medium">A</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-8 pt-17 sm:pt-20 md:pt-24">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                    {/* Left Panel - Schedule Form */}
          <div
            className={`transition-all duration-300 ${isFormCollapsed ? "lg:w-0 lg:overflow-hidden" : "w-full lg:w-2/5"}`}
          >
            <Card className="shadow-lg bg-white h-fit">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-sm sm:text-base md:text-lg">
                    <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <span className="leading-7 text-2xl">เพิ่มงานที่ต้องการผลิต</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFormCollapsed(!isFormCollapsed)}
                    className="text-white bg-green-600 hover:bg-green-700 border-2 border-green-500 rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <PanelLeftClose className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </CardHeader>

              {!isFormCollapsed && (
                <CardContent className="space-y-3 sm:space-y-4 md:space-y-6">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">วันที่ผลิต</Label>
                    <SimpleDatePicker
                      value={selectedDate}
                      onChange={setSelectedDate}
                      placeholder="เลือกวันที่ผลิต"
                      className="w-full"
                    />
                  </div>

                  {/* Autocomplete Job Name/Code */}
                  <div className="space-y-2 relative">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">เพิ่มงานผลิต</Label>
                    <div className="relative">
                      <JobSearchSelect
                        value={jobQuery}
                        onChange={(jobCode, jobName) => {
                          debugLog('🎯 JobSearchSelect selected:', { jobCode, jobName });
                          setJobCode(jobCode);
                          setJobName(jobName);
                          setJobQuery(jobName);
                        }}
                        onAddNew={(jobName) => {
                          debugLog('➕ Adding new job:', jobName);
                          // สร้าง job_code ใหม่อัตโนมัติ
                          const newJobCode = handleAddNewJob();
                          setJobName(jobName);
                          setJobQuery(jobName);
                          setMessage(`✅ เพิ่มงานใหม่: "${jobName}" (รหัสงาน: ${newJobCode})`);
                        }}
                        placeholder="ค้นหางานผลิต..."
                        isDisabled={isSubmitting}
                        allowAddNew={true}
                      />
                    </div>
                  </div>

                  {/* Staff Positions */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm font-bold text-gray-700">ผู้ปฏิบัติงาน (1-4 คน)</Label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {[1, 2, 3, 4].map((position) => (
                        <div key={position} className="space-y-1 sm:space-y-2">
                          <Label className="text-xs text-gray-600">ผู้ปฏิบัติงาน {position}</Label>
                          <Select
                            value={operators[position - 1] || "__none__"}
                            onValueChange={(val) => {
                              const newOps = [...operators];
                              newOps[position - 1] = val === "__none__" ? "" : val;
                              setOperators(newOps);
                            }}
                          >
                            <SelectTrigger className="h-8 sm:h-9 text-sm">
                              <SelectValue placeholder="เลือก" />
                            </SelectTrigger>
                            <SelectContent className={notoSansThai.className}>
                              <SelectItem value="__none__" className={notoSansThai.className}>กรุณาเลือก</SelectItem>
                              {users.map(u => (
                                <SelectItem key={u.id_code} value={u.name} className={notoSansThai.className}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">เครื่องบันทึกข้อมูลการผลิต</Label>
                    <Select
                      value={selectedMachine || "__none__"}
                      onValueChange={val => setSelectedMachine(val === "__none__" ? "" : val)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="เลือก..." />
                      </SelectTrigger>
                      <SelectContent className={notoSansThai.className}>
                        <SelectItem value="__none__" className={notoSansThai.className}>กรุณาเลือก</SelectItem>
                        {machines.map(m => (
                          <SelectItem key={m.machine_code} value={m.machine_code} className={notoSansThai.className}>{m.machine_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-bold text-gray-700">เวลาเริ่ม</Label>
                      <div className="relative">
                        <div className="relative">
                          <Select value={startTime || "__none__"} onValueChange={val => setStartTime(val === "__none__" ? "" : val)}>
                            <SelectTrigger className="text-sm pl-8">
                              <SelectValue placeholder="เลือกเวลาเริ่ม..." />
                            </SelectTrigger>
                            <SelectContent className={notoSansThai.className}>
                              <SelectItem value="__none__" className={notoSansThai.className}>เลือกเวลาเริ่ม...</SelectItem>
                              {timeOptions.map(t => (
                                <SelectItem key={t} value={t} className={notoSansThai.className}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-bold text-gray-700">เวลาสิ้นสุด</Label>
                      <div className="relative">
                        <div className="relative">
                          <Select value={endTime || "__none__"} onValueChange={val => setEndTime(val === "__none__" ? "" : val)}>
                            <SelectTrigger className="text-sm pl-8">
                              <SelectValue placeholder="เลือกเวลาสิ้นสุด..." />
                            </SelectTrigger>
                            <SelectContent className={notoSansThai.className}>
                              <SelectItem value="__none__" className={notoSansThai.className}>เลือกเวลาสิ้นสุด...</SelectItem>
                              {timeOptions.map(t => (
                                <SelectItem key={t} value={t} className={notoSansThai.className}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">หมายเหตุ</Label>
                    <RichNoteEditor
                      value={note}
                      onChange={(v: string) => setNote(v)}
                      className="text-sm"
                      placeholder="เพิ่มหมายเหตุเพิ่มเติมสำหรับการผลิต..."
                    />
                  </div>

                  {/* ห้องผลิต (dropdown จริง ใต้เวลาเริ่ม-สิ้นสุด) */}
                  <div className="space-y-2 mt-2">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">ห้องผลิต</Label>
                    <Select
                      value={selectedRoom || "__none__"}
                      onValueChange={val => setSelectedRoom(val === "__none__" ? "" : val)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="เลือกห้องผลิต..." />
                      </SelectTrigger>
                      <SelectContent className={notoSansThai.className}>
                        <SelectItem value="__none__" className={notoSansThai.className}>กรุณาเลือก</SelectItem>
                        {rooms.map(r => (
                          <SelectItem key={r.room_code} value={r.room_code} className={notoSansThai.className}>{r.room_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Buttons */}
                  <div className="pt-4 sm:pt-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-2 border-gray-400 text-gray-700 hover:bg-gray-100 bg-white text-sm font-medium py-2 px-4"
                        onClick={() => {
                          debugLog('🔧 Button clicked!');
                          handleSaveDraft();
                        }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกแบบร่าง"}
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 shadow-md"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกเสร็จสิ้น"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
            {/* Dashboard Card แยกออกมา */}
            {!isFormCollapsed && (
              <Card className="shadow-lg bg-white mt-8">
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center space-x-2 text-sm sm:text-base md:text-lg">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <span>Dashboard การลงคนลงเวลา</span>
                  </CardTitle>
                  {true && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const dateStr = formatDateForAPI(selectedDate || new Date() as any);
                        router.push(`/planner/timetable?date=${encodeURIComponent(dateStr)}`)
                      }}
                      className="text-xs px-2 py-1 whitespace-nowrap border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      แสดงตารางเวลาการทำงาน
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {(() => {
                      const summary = calculateDailySummary(getSelectedDayProduction());
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="text-blue-600 font-medium">จำนวนผู้ปฏิบัติงาน</div>
                              <div className="text-2xl font-bold text-blue-700">{summary.totalWorkers} คน</div>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="text-green-600 font-medium">ชั่วโมงงาน</div>
                              <div className="text-2xl font-bold text-green-700">{summary.totalWorkHours.toFixed(1)} ชม.</div>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                              <div className="text-orange-600 font-medium">เวลาที่ใช้ลงงาน</div>
                              <div className="text-2xl font-bold text-orange-700">{summary.totalUsedTime.toFixed(1)} ชม.</div>
                              <div className="text-xs text-orange-600 mt-1">(หักพักเที่ยง 45 นาที)</div>
                            </div>
                            <div className={`p-3 rounded-lg border ${
                              summary.capacityPercentage > 100 
                                ? 'bg-red-50 border-red-200' 
                                : summary.capacityPercentage >= 80 
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-yellow-50 border-yellow-200'
                            }`}>
                              <div className={`font-medium ${
                                summary.capacityPercentage > 100 
                                  ? 'text-red-600' 
                                  : summary.capacityPercentage >= 80 
                                    ? 'text-green-600'
                                    : 'text-yellow-600'
                              }`}>Capacity</div>
                              <div className={`text-2xl font-bold ${
                                summary.capacityPercentage > 100 
                                  ? 'text-red-700' 
                                  : summary.capacityPercentage >= 80 
                                    ? 'text-green-700'
                                    : 'text-yellow-700'
                              }`}>
                                {summary.capacityPercentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          
                          {/* รายชื่อผู้ปฏิบัติงาน */}
                          <div className="bg-gray-50 p-3 rounded-lg border">
                            <div className="text-gray-600 font-bold text-base mb-2">รายชื่อผู้ปฏิบัติงาน ({summary.totalWorkers} คน)</div>
                            <div className="text-sm text-gray-700">
                              {summary.uniqueWorkers.join(', ')}
                            </div>
                          </div>

                          {/* คนที่ว่างงาน - แสดงเฉพาะเมื่อมีคนว่าง */}
                          {summary.availableWorkers.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="text-blue-600 font-medium mb-2">ผู้ปฏิบัติงานหลักที่ว่าง ({summary.availableWorkers.length} คน)</div>
                              <div className="text-sm text-blue-700">
                                {summary.availableWorkers.join(', ')}
                              </div>
                            </div>
                          )}

                          {/* รายละเอียดของแต่ละคน */}
                          <div 
                            className="bg-gray-50 p-3 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => setShowWorkerDetails(!showWorkerDetails)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-gray-600 font-medium">รายละเอียดการทำงานของแต่ละคน</div>
                              {/* ลบปุ่มแสดงตารางเวลาการทำงานออก เหลือแค่ปุ่ม toggle รายละเอียด */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // ป้องกันการ trigger onClick ของ parent
                                  setShowWorkerDetails(!showWorkerDetails);
                                }}
                                className="p-1 h-6 w-6"
                              >
                                {showWorkerDetails ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            {showWorkerDetails && (
                              <div className="space-y-2">
                                {/* แสดงคนที่ว่างงานก่อน */}
                                {summary.workerDetails.filter(worker => worker.status === 'available').length > 0 && (
                                  <div className="text-xs font-semibold text-green-700 mb-2">🟢 คนที่ว่างงาน</div>
                                )}
                                {summary.workerDetails
                                  .filter(worker => worker.status === 'available')
                                  .map((worker, index) => (
                                <div key={index} className={`p-3 rounded border text-xs ${
                                  worker.status === 'full' 
                                    ? 'bg-red-50 border-red-200'
                                    : worker.status === 'limited'
                                      ? 'bg-yellow-50 border-yellow-200'
                                      : 'bg-green-50 border-green-200'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage
                                          src={staffImages[worker.name] || "/placeholder-user.jpg"}
                                          alt={worker.name}
                                          className="object-cover object-center"
                                        />
                                        <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                          {worker.name.substring(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-sm">{worker.name}</span>
                                    </div>
                                    <span className={`font-bold text-sm ${
                                      worker.status === 'full' 
                                        ? 'text-red-600'
                                        : worker.status === 'limited'
                                          ? 'text-yellow-600'
                                          : 'text-green-600'
                                    }`}>
                                      {worker.displayText}
                                    </span>
                                  </div>
                                </div>
                                ))}
                                
                                {/* แสดงคนที่เหลือเวลาน้อย */}
                                {summary.workerDetails.filter(worker => worker.status === 'limited').length > 0 && (
                                  <div className="text-xs font-semibold text-yellow-700 mb-2 mt-4">🟡 คนที่เหลือเวลาน้อย</div>
                                )}
                                {summary.workerDetails
                                  .filter(worker => worker.status === 'limited')
                                  .map((worker, index) => (
                                  <div key={`limited-${index}`} className={`p-3 rounded border text-xs ${
                                    worker.status === 'full' 
                                      ? 'bg-red-50 border-red-200'
                                      : worker.status === 'limited'
                                        ? 'bg-yellow-50 border-yellow-200'
                                        : 'bg-green-50 border-green-200'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <Avatar className="w-8 h-8">
                                          <AvatarImage
                                            src={staffImages[worker.name] || "/placeholder-user.jpg"}
                                            alt={worker.name}
                                            className="object-cover object-center"
                                          />
                                          <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                            {worker.name.substring(0, 2)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium text-sm">{worker.name}</span>
                                      </div>
                                      <span className={`font-bold text-sm ${
                                        worker.status === 'full' 
                                          ? 'text-red-600'
                                          : worker.status === 'limited'
                                            ? 'text-yellow-600'
                                            : 'text-green-600'
                                      }`}>
                                        {worker.displayText}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* แสดงคนที่เต็มเวลา */}
                                {summary.workerDetails.filter(worker => worker.status === 'full').length > 0 && (
                                  <div className="text-xs font-semibold text-red-700 mb-2 mt-4">🔴 คนที่เต็มเวลา</div>
                                )}
                                {summary.workerDetails
                                  .filter(worker => worker.status === 'full')
                                  .map((worker, index) => (
                                  <div key={`full-${index}`} className={`p-3 rounded border text-xs ${
                                    worker.status === 'full' 
                                      ? 'bg-red-50 border-red-200'
                                      : worker.status === 'limited'
                                        ? 'bg-yellow-50 border-yellow-200'
                                        : 'bg-green-50 border-green-200'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <Avatar className="w-8 h-8">
                                          <AvatarImage
                                            src={staffImages[worker.name] || "/placeholder-user.jpg"}
                                            alt={worker.name}
                                            className="object-cover object-center"
                                          />
                                          <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                            {worker.name.substring(0, 2)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium text-sm">{worker.name}</span>
                                      </div>
                                      <span className={`font-bold text-sm ${
                                        worker.status === 'full' 
                                          ? 'text-red-600'
                                          : worker.status === 'limited'
                                            ? 'text-yellow-600'
                                            : 'text-green-600'
                                      }`}>
                                        {worker.displayText}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Status Indicator */}
                          <div className="bg-gray-50 p-3 rounded-lg border">
                            <div className="text-gray-600 font-medium mb-2">สถานะการลงคนลงเวลา</div>
                            <div className={`text-sm font-medium p-2 rounded ${
                              summary.capacityPercentage > 100 
                                ? 'text-red-700 bg-red-100 border border-red-200' 
                                : summary.capacityPercentage >= 80 
                                  ? 'text-green-700 bg-green-100 border border-green-200'
                                  : 'text-yellow-700 bg-yellow-100 border border-yellow-200'
                            }`}>
                              {summary.capacityPercentage > 100 
                                ? '⚠️ เกินความสามารถ (เกิน 100%) - ควรเพิ่มคนหรือลดงาน' 
                                : summary.capacityPercentage >= 80 
                                  ? '✅ การลงคนลงเวลาสมบูรณ์ (80-100%) - ใช้งานเต็มที่'
                                  : '⚡ การลงคนลงเวลาต่ำ (ต่ำกว่า 80%) - ควรเพิ่มงานหรือลดคน'
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                </CardContent>
              </Card>
            )}
          </div>



          {/* Mobile Toggle Button */}
          {isFormCollapsed && (
            <div className="lg:hidden fixed bottom-4 right-4 z-40">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setIsFormCollapsed(false)}
                className="text-white bg-green-800 hover:bg-green-900 border-2 border-green-600 rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-lg"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Desktop Toggle Button - Tab Style */}
          {isFormCollapsed && (
            <div className="hidden lg:block fixed left-0 top-32 z-40 group">
              <div className="bg-white rounded-r-lg shadow-lg border-r-2 border-green-200 hover:w-64 transition-all duration-300 w-10 h-20 flex items-center justify-center cursor-pointer hover:shadow-xl hover:bg-green-50" onClick={() => setIsFormCollapsed(false)}>
                <div className="flex items-center justify-center w-full h-full group-hover:justify-start group-hover:px-4">
                  <PanelLeftOpen className="w-4 h-4 text-green-600 group-hover:mr-3 group-hover:w-5 group-hover:h-5 transition-all duration-300" />
                  <span className="hidden group-hover:inline text-green-600 font-semibold whitespace-nowrap text-sm animate-fade-in">เพิ่มรายการใหม่</span>
                </div>
              </div>
            </div>
          )}

          {/* Right Panel - Schedule View */}
          <div className={`transition-all duration-300 ${isFormCollapsed ? "w-full lg:ml-0" : "w-full lg:w-3/5"}`}>
            <Card className="shadow-lg bg-white">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <CardTitle
                    className={`flex items-center space-x-2 ${
                      isFormCollapsed ? "text-lg sm:text-xl md:text-2xl" : "text-sm sm:text-base md:text-lg"
                    }`}
                  >
                    <Calendar
                      className={`${isFormCollapsed ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4 sm:w-5 sm:h-5"} text-green-600`}
                    />
                    <span className="text-2xl">รายการแผนผลิต</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {viewMode === "daily" && (
                                          <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncDrafts}
                      disabled={isSubmitting}
                      className="bg-white border-green-600 text-green-700 hover:bg-green-50 flex items-center space-x-1 sm:space-x-2"
                    >
                      <RefreshCw className={`${isFormCollapsed ? "w-3 h-3 sm:w-4 sm:h-4" : "w-3 h-3"}`} />
                      <span className={`${isFormCollapsed ? "text-xs sm:text-sm" : "text-xs"}`}>พิมพ์ใบงานผลิต</span>
                    </Button>
                    )}
                    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={viewMode === "daily" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("daily")}
                        className={`${isFormCollapsed ? "text-xs sm:text-sm" : "text-xs"} px-2 sm:px-3 py-1 ${
                          viewMode === "daily" ? "bg-green-600 text-white" : "text-gray-600"
                        }`}
                      >
                        รายวัน
                      </Button>
                      <Button
                        variant={viewMode === "weekly" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("weekly")}
                        className={`${isFormCollapsed ? "text-xs sm:text-sm" : "text-xs"} px-2 sm:px-3 py-1 ${
                          viewMode === "weekly" ? "bg-green-600 text-white" : "text-gray-600"
                        }`}
                      >
                        รายสัปดาห์
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-8">
                {viewMode === "weekly" ? (
                  <WeeklyCalendar
                    productionData={convertToProductionTasks(productionData)}
                    currentWeek={currentWeek || new Date()}
                    onWeekChange={setCurrentWeek}
                    onTaskMove={handleTaskMove}
                    onTaskReorder={handleTaskReorder}
                    onTaskClick={(task) => handleEditClick(convertToProductionItem(task))}
                    onDateClick={(date) => console.log('Date clicked:', date)}
                    onAddTask={(date, index) => handleQuickAdd(date)}
                    showWeekNavigation={true}
                    showTaskCount={true}
                  />
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {/* Loading Indicator */}
                    {isLoadingData && (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <RefreshCw className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">กำลังโหลดข้อมูล...</p>
                        </div>
                      </div>
                    )}

                    {/* Daily View */}
                    {!isLoadingData && (
                      <>
                    <div
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
                        isFormCollapsed ? "text-sm sm:text-base" : "text-xs sm:text-sm"
                      } text-gray-600`}
                    >
                      <span>รายวัน</span>
                      <SimpleDatePicker
                        value={selectedDate}
                        onChange={setSelectedDate}
                        placeholder="เลือกวันที่"
                        className="w-full sm:w-auto"
                      />
                    </div>

                    <Separator />

                    {/* Get production data for selected date */}
                    {(() => {
                      // ใช้ getSelectedDayProduction() แทนการ filter โดยตรง เพื่อให้แสดงเลขงาน A B C D
                      const dailyProduction = getSelectedDayProduction();
                      
                      return dailyProduction.length > 0 ? (
                        <div className="space-y-1 sm:space-y-2">
                          <h4
                            className={`font-medium text-gray-900 ${
                              isFormCollapsed ? "text-sm sm:text-lg md:text-xl" : "text-xs sm:text-sm md:text-base"
                            }`}
                          >
                                                         งานผลิตวันที่ {formatDateForDisplay(new Date(selectedDate), 'full')} จำนวน {dailyProduction.length} งาน
                          </h4>

                          {getSortedDailyProduction(dailyProduction).map((item) => {
                            debugLog('🎯 [DEBUG] Rendering card for item:', {
                              id: item.id,
                              job_name: item.job_name,
                              operators: item.operators,
                              production_room: item.production_room,
                              operators_type: typeof item.operators
                            });
                            return (
                            <div
                              key={item.id}
                              className={`border-l-4 ${
                                item.status === "งานผลิตถูกยกเลิก" || item.status_name === "ยกเลิกการผลิต"
                                  ? "border-l-red-400 bg-red-50"
                                  : item.status_name === "งานผลิตเสร็จสิ้น" || item.status_name === "เสร็จสิ้น"
                                      ? "border-l-green-400 bg-green-50"
                                      : (item.status_name && (item.status_name.includes("รอดำเนินการ") || item.status_name.toLowerCase().includes("pending")))
                                      ? "border-l-gray-400 bg-gray-50"
                                          : "border-l-gray-400 bg-gray-50"
                              } ${isFormCollapsed ? "p-3 sm:p-4 md:p-6" : "p-2 sm:p-3 md:p-4"} rounded-r-lg`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                                <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                    <Badge
                                      variant="outline"
                                      className={`${isFormCollapsed ? "text-xs sm:text-sm" : "text-xs"} bg-blue-50 border-blue-300 text-blue-700 font-medium flex-shrink-0`}
                                    >
                                      {formatDateThaiShort(item.production_date)}
                                    </Badge>
                                    <h3
                                      className={`font-bold text-gray-900 ${
                                        isFormCollapsed
                                          ? "text-sm sm:text-lg md:text-xl"
                                          : "text-xs sm:text-sm md:text-base"
                                      } truncate`}
                                    >
                                      {getDisplayJobName(item, dailyProduction)}: {item.job_name}
                                    </h3>
                                    <Badge
                                      variant="outline"
                                      className={`${isFormCollapsed ? "text-xs sm:text-sm" : "text-xs"} flex-shrink-0`}
                                    >
                                      ห้องผลิต: {getRoomName(item.production_room)}
                                    </Badge>
                                    <div className="flex items-center space-x-2">
                                      <Badge
                                        variant="outline"
                                        className={`${isFormCollapsed ? "text-xs sm:text-sm" : "text-xs"} ${
                                          item.status_name === "งานผลิตถูกยกเลิก" || item.status_name === "ยกเลิกการผลิต"
                                                ? "border-red-500 text-red-700"
                                            : (item.status_name && (item.status_name.includes("รอดำเนินการ") || item.status_name.toLowerCase().includes("pending")))
                                              ? "border-gray-500 text-gray-700"
                                              : item.status_name === "งานผลิตเสร็จสิ้น" || item.status_name === "เสร็จสิ้น"
                                                ? "border-green-500 text-green-700"
                                                : "border-gray-500 text-gray-700"
                                        } flex-shrink-0`}
                                      >
                                        {item.status_name}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={`${isFormCollapsed ? "text-xs sm:text-sm" : "text-xs"} ${
                                          getJobStatus(item) === "พิมพ์แล้ว"
                                            ? "border-green-500 text-green-700 bg-green-50"
                                            : getJobStatus(item) === "บันทึกเสร็จสิ้น" || getJobStatus(item) === "บันทึกสำเร็จ"
                                              ? "border-green-500 text-green-700 bg-green-50"
                                              : "border-gray-500 text-gray-700 bg-gray-50"
                                        } flex-shrink-0`}
                                      >
                                        {getJobStatus(item)}
                                      </Badge>
                                      {/* แสดง label "งานพิเศษ" เมื่อเปิดโหมดงานพิเศษ */}
                                      {shouldShowSpecialJobLabel(item) && (
                                        <Badge
                                          variant="secondary"
                                          className="bg-yellow-100 text-yellow-800 border-yellow-300 flex-shrink-0"
                                        >
                                          งานพิเศษ
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Staff and Planner Section - ในแถวเดียวกัน */}
                                  <div className="flex items-center justify-between">
                                    {/* Staff Section - ด้านซ้าย */}
                                    <div className="flex items-center space-x-2 sm:space-x-3">
                                    {renderStaffAvatars(item.operators || (item as any).operators_from_join, item, isFormCollapsed)}
                                  </div>

                                    {/* ผู้วางแผนการผลิต - ด้านขวาสุด */}
                                    <div className="flex items-center space-x-2">
                                      <div className="flex -space-x-2">
                                        {/* แสดงผู้ตรวจสอบ: จิ๋ว สำหรับแบบร่าง, จิ๋ว+จรัญ สำหรับเสร็จสิ้น */}
                                        {(item.recordStatus === "บันทึกแบบร่าง" || item.recordStatus === "แบบร่าง") ? (
                                          <Avatar
                                            className={`${isFormCollapsed ? "w-12 h-12 sm:w-14 sm:h-14" : "w-10 h-10 sm:w-12 sm:h-12"} border-2 border-white shadow-sm`}
                                          >
                                            <AvatarImage
                                              src="/images/staff/จิ๋ว.jpg"
                                              alt="จิ๋ว"
                                              className="object-cover object-center avatar-image"
                                              style={{ imageRendering: "crisp-edges" }}
                                            />
                                            <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                              จิ
                                            </AvatarFallback>
                                          </Avatar>
                                        ) : (
                                          <>
                                            <Avatar
                                              className={`${isFormCollapsed ? "w-12 h-12 sm:w-14 sm:h-14" : "w-10 h-10 sm:w-12 sm:h-12"} border-2 border-white shadow-sm`}
                                            >
                                              <AvatarImage
                                                src="/images/staff/จิ๋ว.jpg"
                                                alt="จิ๋ว"
                                                className="object-cover object-center avatar-image"
                                                style={{ imageRendering: "crisp-edges" }}
                                              />
                                              <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                                จิ
                                              </AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              className={`${isFormCollapsed ? "w-12 h-12 sm:w-14 sm:h-14" : "w-10 h-10 sm:w-12 sm:h-12"} border-2 border-white shadow-sm`}
                                            >
                                              <AvatarImage
                                                src="/images/staff/จรัญ.jpeg"
                                                alt="จรัญ"
                                                className="object-cover object-center avatar-image"
                                                style={{ imageRendering: "crisp-edges" }}
                                              />
                                              <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                                จ
                                              </AvatarFallback>
                                            </Avatar>
                                          </>
                                        )}
                                      </div>
                                      <span
                                        className={`${isFormCollapsed ? "text-base sm:text-lg" : "text-sm sm:text-base"} text-slate-900`}
                                      >
                                        ตรวจสอบแผนการผลิต: {(item.recordStatus === "บันทึกแบบร่าง" || item.recordStatus === "แบบร่าง") ? "จิ๋ว ✔" : "จิ๋ว, จรัญ ✔✔"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div
                                      className={`flex items-center space-x-1 sm:space-x-2 ${isFormCollapsed ? "text-base sm:text-lg" : "text-sm sm:text-base"}`}
                                  >
                                    <Clock
                                      className={`${isFormCollapsed ? "w-4 h-4 sm:w-5 sm:h-5" : "w-3 h-3 sm:w-4 sm:h-4"} text-gray-400 flex-shrink-0`}
                                    />
                                      <span className="text-blue-600 font-semibold">
                                        {item.start_time?.substring(0, 5) || "08:00"} - {(item.end_time || "17:00:00").substring(0, 5)}
                                      </span>
                                      {/* หมายเหตุ (ถ้ามี) - อยู่บรรทัดเดียวกับเวลา */}
                                      {item.notes && (
                                        <span
                                          className={`${isFormCollapsed ? "text-sm sm:text-base" : "text-xs sm:text-sm"} text-red-600 font-semibold ml-3 bg-red-50 px-2 py-1 rounded border-l-2 border-red-400`}
                                        >
                                          หมายเหตุ: {item.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                    </div>

                                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                                  {/* ปุ่ม */}
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                      {/* เพิ่มปุ่มสำหรับรายการที่มี จิ๋ว เพียงคนเดียวในการตรวจสอบ */}
                                      {(item.recordStatus === "บันทึกแบบร่าง" || item.recordStatus === "แบบร่าง" || item.recordStatus === "รอดำเนินการ") && (
                                        <>
                                    <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditDraft(item)}
                                            className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 bg-white text-xs font-medium px-2 py-1"
                                          >
                                            <Edit className="w-3 h-3" />
                                    </Button>
                                        </>
                                      )}
                                      {/* เพิ่มปุ่มสำหรับรายการที่มี จิ๋ว, จรัญ ในการตรวจสอบ */}
                                      {(item.recordStatus === "บันทึกเสร็จสิ้น" || item.recordStatus === "เสร็จสิ้น" || item.recordStatus === "บันทึกสำเร็จ") && (
                                        <>
                                      {/* แสดงปุ่มรูปตาสำหรับงานที่มีสถานะ "กำลังดำเนินการ" */}
                                      {getJobStatus(item) === "กำลังดำเนินการ" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewProductionDetails(item)}
                                            className="border-2 border-blue-300 text-blue-600 hover:bg-blue-50 bg-white text-xs font-medium px-2 py-1"
                                          >
                                            <Eye className="w-3 h-3" />
                                        </Button>
                                      )}
                                      {/* เปลี่ยนปุ่มดินสอเป็นปุ่มกากบาทเมื่อสถานะเป็น "พิมพ์แล้ว" */}
                                      {getJobStatus(item) === "พิมพ์แล้ว" ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCancelProduction(item.id)}
                                            className="border-2 border-red-300 text-red-600 hover:bg-red-50 bg-white text-xs font-medium px-2 py-1"
                                          >
                                            <XCircle className="w-3 h-3" />
                                        </Button>
                                      ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditDraft(item)}
                                            className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 bg-white text-xs font-medium px-2 py-1"
                                          >
                                            <Edit className="w-3 h-3" />
                                        </Button>
                                      )}
                                        </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-gray-500">
                          <Calendar
                            className={`${isFormCollapsed ? "w-12 h-12 sm:w-16 sm:h-16" : "w-8 h-8 sm:w-12 sm:h-12"} mx-auto mb-3 sm:mb-4 text-gray-300`}
                          />
                          <p className={`${isFormCollapsed ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
                                                         ไม่มีงานผลิตในวันที่ {formatDateForDisplay(new Date(selectedDate), 'full')}
                          </p>
                        </div>
                      );
                    })()}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-t border-green-600 shadow-md mt-6 sm:mt-8">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-center items-center h-10 sm:h-12">
            <p className="text-xs sm:text-sm text-white text-center">
              © 2025 แผนกเทคโนโลยีสารสนเทศ บริษัท จิตต์ธนา จำกัด (สำนักงานใหญ่)
            </p>
          </div>
        </div>
      </footer>

      {/* Modal สำหรับแก้ไข draft */}
      <Dialog open={editDraftModalOpen} onOpenChange={setEditDraftModalOpen}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${notoSansThai.className}`}>
          <DialogHeader>
            <DialogTitle className={notoSansThai.className}>แก้ไขแบบร่างงานผลิต</DialogTitle>
          </DialogHeader>

      {/* Modal สำหรับแสดงรายละเอียดการผลิต */}
      <Dialog open={productionDetailsModalOpen} onOpenChange={setProductionDetailsModalOpen}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${notoSansThai.className}`}>
          <DialogHeader>
            <DialogTitle className={notoSansThai.className}>รายละเอียดการผลิต</DialogTitle>
          </DialogHeader>
          {productionDetailsData && (
            <div className="space-y-6">
              {/* ข้อมูลงาน */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>ชื่องาน</Label>
                    <p className={`text-lg font-semibold text-gray-900 ${notoSansThai.className}`}>
                      {productionDetailsData.job_name}
                    </p>
                  </div>
                  <div>
                    <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>หมายเหตุ</Label>
                    <p className={`text-sm text-gray-600 ${notoSansThai.className}`}>
                      {productionDetailsData.notes || productionDetailsData.note || "ไม่มีหมายเหตุ"}
                    </p>
                  </div>
                  <div>
                    <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>ผู้ปฏิบัติงาน</Label>
                    <p className={`text-sm text-gray-600 ${notoSansThai.className}`}>
                      {productionDetailsData.operators || "ไม่ระบุ"}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>เวลาเริ่มต้นตามแผนผลิต</Label>
                    <p className={`text-lg font-semibold text-blue-600 ${notoSansThai.className}`}>
                      {productionDetailsData.start_time || "ไม่ระบุ"}
                    </p>
                  </div>
                  <div>
                    <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>เวลาสิ้นสุดตามแผนผลิต</Label>
                    <p className={`text-lg font-semibold text-blue-600 ${notoSansThai.className}`}>
                      {productionDetailsData.end_time || "ไม่ระบุ"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ข้อมูลจาก Logs */}
              <div>
                <Label className={`text-lg font-bold text-gray-700 ${notoSansThai.className}`}>ข้อมูลการผลิตตามจริง</Label>
                {productionLogs.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {productionLogs.map((log, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="mb-3">
                          <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>ขั้นตอนที่ {log.process_number}</Label>
                          <p className={`text-sm text-gray-600 ${notoSansThai.className}`}>
                            {log.process_description || "ไม่ระบุ"}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>เวลาเริ่มต้นตามจริง</Label>
                            <p className={`text-sm text-green-600 ${notoSansThai.className}`}>
                              {formatTime(log.start_time)}
                            </p>
                          </div>
                          <div>
                            <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>เวลาสิ้นสุดตามจริง</Label>
                            <p className={`text-sm text-green-600 ${notoSansThai.className}`}>
                              {formatTime(log.stop_time)}
                            </p>
                          </div>
                          <div>
                            <Label className={`text-sm font-bold text-gray-700 ${notoSansThai.className}`}>เวลาที่ใช้</Label>
                            <p className={`text-sm text-purple-600 ${notoSansThai.className}`}>
                              {formatDuration(log.used_time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p className={`text-sm text-gray-500 text-center ${notoSansThai.className}`}>
                      ไม่มีข้อมูลการผลิตตามจริง
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setProductionDetailsModalOpen(false)}
              className={notoSansThai.className}
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-2">
            {/* คอลัมน์ซ้าย */}
            <div className="space-y-3">
              {/* วันที่ผลิต */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${notoSansThai.className}`}>วันที่ผลิต</Label>
                <SimpleDatePicker
                  value={editDate}
                  onChange={setEditDate}
                  placeholder="เลือกวันที่"
                  className="w-full"
                />
              </div>
              {/* ชื่องาน */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${notoSansThai.className}`}>ชื่องาน</Label>
                <Input
                  value={editJobName}
                  onChange={e => setEditJobName(e.target.value)}
                  className={`text-sm h-8 ${notoSansThai.className}`}
                />
              </div>
              {/* เครื่องบันทึกข้อมูลการผลิต */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${notoSansThai.className}`}>เครื่องบันทึกข้อมูลการผลิต</Label>
                <Select
                  value={editMachine || "__none__"}
                  onValueChange={val => setEditMachine(val === "__none__" ? "" : val)}
                >
                  <SelectTrigger className={`text-sm h-8 ${notoSansThai.className}`}>
                    <SelectValue placeholder="เลือก..." />
                  </SelectTrigger>
                  <SelectContent className={notoSansThai.className}>
                    <SelectItem value="__none__" className={notoSansThai.className}>กรุณาเลือก</SelectItem>
                    {machines.map(m => (
                      <SelectItem key={m.machine_code} value={m.machine_code} className={notoSansThai.className}>{m.machine_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* ห้องผลิต */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${notoSansThai.className}`}>ห้องผลิต</Label>
                <Select
                  value={editRoom || "__none__"}
                  onValueChange={val => setEditRoom(val === "__none__" ? "" : val)}
                >
                  <SelectTrigger className={`text-sm h-8 ${notoSansThai.className}`}>
                    <SelectValue placeholder="เลือกห้องผลิต..." />
                  </SelectTrigger>
                  <SelectContent className={notoSansThai.className}>
                    <SelectItem value="__none__" className={notoSansThai.className}>กรุณาเลือก</SelectItem>
                    {rooms.map(r => (
                      <SelectItem key={r.room_code} value={r.room_code} className={notoSansThai.className}>{r.room_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* คอลัมน์ขวา */}
            <div className="space-y-3">
              {/* ผู้ปฏิบัติงาน */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${notoSansThai.className}`}>ผู้ปฏิบัติงาน (1-4 คน)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((position) => (
                    <div key={position} className="space-y-1">
                      <Label className={`text-xs text-gray-600 ${notoSansThai.className}`}>ผู้ปฏิบัติงาน {position}</Label>
                      <Select
                        value={editOperators[position - 1] || "__none__"}
                        onValueChange={val => {
                          const newOps = [...editOperators];
                          newOps[position - 1] = val === "__none__" ? "" : val;
                          setEditOperators(newOps);
                        }}
                      >
                        <SelectTrigger className={`h-8 text-xs ${notoSansThai.className}`}>
                          <SelectValue placeholder="เลือก" />
                        </SelectTrigger>
                        <SelectContent className={notoSansThai.className}>
                          <SelectItem value="__none__" className={notoSansThai.className}>กรุณาเลือก</SelectItem>
                          {users && users.length > 0 ? (
                            users.map(u => (
                              <SelectItem key={u.id_code} value={u.name} className={notoSansThai.className}>{u.name}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__none__" className={notoSansThai.className}>ไม่พบข้อมูลผู้ปฏิบัติงาน</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
              {/* เวลาเริ่ม-สิ้นสุด */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className={`text-xs font-bold text-gray-700 ${notoSansThai.className}`}>เวลาเริ่ม</Label>
                  <Select value={editStartTime || "__none__"} onValueChange={val => setEditStartTime(val === "__none__" ? "" : val)}>
                    <SelectTrigger className={`text-sm h-8 ${notoSansThai.className}`}>
                      <SelectValue placeholder="เลือกเวลาเริ่ม..." />
                    </SelectTrigger>
                    <SelectContent className={notoSansThai.className}>
                      <SelectItem value="__none__" className={notoSansThai.className}>เลือกเวลาเริ่ม...</SelectItem>
                      {timeOptions && timeOptions.length > 0 ? (
                        timeOptions.map(t => (
                          <SelectItem key={t} value={t} className={notoSansThai.className}>{t}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" className={notoSansThai.className}>ไม่พบตัวเลือกเวลา</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className={`text-xs font-bold text-gray-700 ${notoSansThai.className}`}>เวลาสิ้นสุด</Label>
                  <Select value={editEndTime || "__none__"} onValueChange={val => setEditEndTime(val === "__none__" ? "" : val)}>
                    <SelectTrigger className={`text-sm h-8 ${notoSansThai.className}`}>
                      <SelectValue placeholder="เลือกเวลาสิ้นสุด..." />
                    </SelectTrigger>
                    <SelectContent className={notoSansThai.className}>
                      <SelectItem value="__none__" className={notoSansThai.className}>เลือกเวลาสิ้นสุด...</SelectItem>
                      {timeOptions && timeOptions.length > 0 ? (
                        timeOptions.map(t => (
                          <SelectItem key={t} value={t} className={notoSansThai.className}>{t}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" className={notoSansThai.className}>ไม่พบตัวเลือกเวลา</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* หมายเหตุ */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${notoSansThai.className}`}>หมายเหตุ</Label>
                <RichNoteEditor
                  value={editNote}
                  onChange={(v: string) => setEditNote(v)}
                  className={`text-sm ${notoSansThai.className}`}
                  placeholder="เพิ่มหมายเหตุเพิ่มเติมสำหรับการผลิต..."
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {/* ปุ่มการกระทำซ้าย: ลบเมื่อเป็น draft, หรือยกเลิกงานเมื่อเป็น completed */}
            {(() => {
              if (!editDraftData) return null;
              const isDraftRecord =
                editDraftData.isDraft ||
                (typeof editDraftData.id === 'string' && editDraftData.id.startsWith('draft_')) ||
                editDraftData.workflow_status === 'draft' ||
                editDraftData.workflow_status_id === 1;

              // กรณีเป็น Draft: แสดงปุ่มลบ
              if (isDraftRecord) {
                return (
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteDraft(editDraftId)}
                    disabled={isSubmitting}
                    className={`bg-red-600 hover:bg-red-700 text-white ${notoSansThai.className}`}
                  >
                    {isSubmitting ? "กำลังลบ..." : "ลบ"}
                  </Button>
                );
              }

              // กรณีบันทึกเสร็จสิ้น: แสดงปุ่มยกเลิกงาน (status_id = 9)
              const isCompletedRecord =
                editDraftData.workflow_status === 'completed' ||
                editDraftData.workflow_status_id === 2;
              if (isCompletedRecord && editDraftData.id) {
                return (
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelProduction(String(editDraftData.id))}
                    disabled={isSubmitting}
                    className={`bg-red-600 hover:bg-red-700 text-white ${notoSansThai.className}`}
                  >
                    {isSubmitting ? "กำลังยกเลิก..." : "ยกเลิกงาน"}
                  </Button>
                );
              }

              return null;
            })()}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSaveEditDraft(true)} disabled={isSubmitting} className={notoSansThai.className}>บันทึกแบบร่าง</Button>
              <Button onClick={() => handleSaveEditDraft(false)} disabled={isSubmitting} className={`bg-green-700 hover:bg-green-800 text-white ${notoSansThai.className}`}>
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกเสร็จสิ้น"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className={`max-w-xs text-center ${notoSansThai.className}`}>
          <DialogHeader>
            <DialogTitle className={notoSansThai.className}>ข้อผิดพลาด</DialogTitle>
          </DialogHeader>
          <div className="mb-4">{errorDialogMessage}</div>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)} className={`w-full ${notoSansThai.className}`}>ตกลง</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog สำหรับแสดง popup แจ้งเตือนเมื่อบันทึกเสร็จสิ้น */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className={`max-w-xs text-center ${notoSansThai.className}`}>
          <DialogHeader>
            <DialogTitle className={`${notoSansThai.className} text-green-600`}>สำเร็จ</DialogTitle>
          </DialogHeader>
          <div className="mb-4 text-green-700">{successDialogMessage}</div>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className={`w-full bg-green-600 hover:bg-green-700 text-white ${notoSansThai.className}`}>ตกลง</Button>
          </DialogFooter>
        </DialogContent>
              </Dialog>

        {/* Time Table Popup Dialog - ใช้ Component ใหม่ */}
        <TimeTablePopup
          open={showTimeTable}
          onOpenChange={setShowTimeTable}
          selectedDate={selectedDate}
          jobs={getSelectedDayProduction()}
          users={users}
        />

        {/* Time Table Popup Dialog - เก่า (ยังไม่ลบ) */}
        {/* <Dialog open={showTimeTable} onOpenChange={setShowTimeTable}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span>ตารางเวลาการทำงาน - {formatDateForDisplay(new Date(selectedDate), 'full')}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <TimeTable
                jobs={getSelectedDayProduction()}
                users={users}
                staffImages={staffImages}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => setShowTimeTable(false)}>
                ปิด
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}
        </>
      )}
    </div>
  )
}
