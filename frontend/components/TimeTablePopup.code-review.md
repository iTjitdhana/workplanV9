# Code Review: TimeTablePopup.tsx

## สรุป
ไฟล์นี้มีขนาดใหญ่ (848 บรรทัด) และมีหลายจุดที่ควรปรับปรุงเพื่อให้โค้ด clean และ maintainable มากขึ้น

---

## ✅ จุดที่ทำได้ดี

1. **Performance Optimization**
   - ใช้ `useMemo` เพื่อ cache การคำนวณ `getTimeTableData`
   - ใช้ `ResizeObserver` สำหรับ responsive measurements

2. **Function Separation**
   - แยกฟังก์ชัน `generateTimeSlots`, `getTimeTableData`, `buildLanes` ออกจาก component
   - มีการแยก component `TimeTable` ออกมา

3. **Accessibility**
   - มี `aria-label` และ `role` attributes

---

## ⚠️ จุดที่ควรปรับปรุง

### 1. Type Safety Issues

**ปัญหา:**
```typescript
jobs: any[]
users: any[]
```

**ควรแก้เป็น:**
```typescript
import { ProductionItem, User } from '@/types/production'

interface TimeTableJob extends ProductionItem {
  operators_from_join?: string;
  jobColor?: string;
}

interface TimeTablePopupProps {
  jobs: TimeTableJob[];
  users: User[];
}
```

---

### 2. Code Organization

**ปัญหา:**
- ไฟล์ยาวมาก (848 บรรทัด)
- ฟังก์ชัน `getTimeTableData` ยาวมาก (180+ บรรทัด)
- `useEffect` ใน `TimeTablePopup` ยาวมาก (120+ บรรทัด)

**ข้อเสนอแนะ:**
- แยก utility functions ออกเป็นไฟล์ `utils/timetableUtils.ts`
- แยก constants ออกเป็นไฟล์ `constants/timetableConstants.ts`
- แยก type definitions ออกเป็นไฟล์ `types/timetable.ts`
- แยก helper hooks ออกเป็น `hooks/useTimetableLayout.ts`

---

### 3. Code Duplication

**ปัญหา:**
1. การกรองงาน duplicate:
   - ใน `getTimeTableData` (line 149-157)
   - ใน `useMemo` ของ `TimeTablePopup` (line 624-634)

2. การคำนวณเวลา duplicate:
   - `pad` function ถูก define หลายครั้ง
   - Time calculation logic ซ้ำในหลายที่

**ควรแก้:**
```typescript
// utils/timetableUtils.ts
export const DEFAULT_JOB_CODES = ['A', 'B', 'C', 'D'] as const;

export const isDefaultJob = (jobCode: string): boolean => {
  return DEFAULT_JOB_CODES.includes(jobCode as any);
};

export const isValidWorkPlanJob = (job: TimeTableJob): boolean => {
  return !isDefaultJob(job.job_code) && 
         !!job.operators_from_join && 
         !!job.start_time && 
         !!job.end_time;
};

export const padTime = (n: number): string => n.toString().padStart(2, '0');
```

---

### 4. Magic Numbers & Constants

**ปัญหา:**
- Hardcoded values หลายที่:
  - `0.87`, `0.14`, `0.10` (percentage values)
  - `48`, `240`, `140`, `600` (pixel values)
  - `"12:30-13:15"` (lunch time)
  - `"08:00"`, `"17:00"` (work hours)

**ควรแก้:**
```typescript
// constants/timetableConstants.ts
export const TIMETABLE_CONSTANTS = {
  WORK_HOURS: {
    START: '08:00',
    END: '17:00',
    STEP: 30,
  },
  LUNCH_BREAK: {
    START: '12:30',
    END: '13:15',
    LABEL: '12:30-13:15',
  },
  LAYOUT: {
    HEADER_HEIGHT_RATIO: 0.08,
    FOOTER_HEIGHT_RATIO: 0.05,
    CONTENT_HEIGHT_RATIO: 0.87,
    NAME_COL_MIN_WIDTH: 140,
    NAME_COL_MAX_WIDTH: 240,
    NAME_COL_WIDTH_RATIO: 0.10,
    CLOSE_BUTTON_SIZE: 48,
    BASE_LANE_MIN: 30,
    BASE_LANE_MAX: 52,
  },
  EXCLUDED_OPERATORS: ['RD', 'พี่สัญญา'],
  DEFAULT_JOB_CODES: ['A', 'B', 'C', 'D'],
} as const;
```

---

### 5. Performance Issues

**ปัญหา:**
1. `window.innerWidth` ใน `useState` อาจมีปัญหา SSR:
```typescript
const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth)
```

**ควรแก้:**
```typescript
const [containerWidth, setContainerWidth] = useState<number>(0);

useEffect(() => {
  setContainerWidth(window.innerWidth);
}, []);
```

2. มีการคำนวณซ้ำใน render loop:
   - การคำนวณ `slotIndexForTime` ถูกเรียกซ้ำใน `buildLanes`
   - การคำนวณ time label ซ้ำใน render

---

### 6. Unused Imports

**ปัญหา:**
```typescript
import { Button } from "@/components/ui/button"  // ไม่ได้ใช้
import { Clock, X } from "lucide-react"  // Clock ไม่ได้ใช้
import { DialogClose } from "@/components/ui/dialog"  // ไม่ได้ใช้
```

**ควรลบออก**

---

### 7. Inline Styles

**ปัญหา:**
- มี inline styles เยอะมาก (50+ จุด)
- ทำให้โค้ดอ่านยากและ maintain ยาก

**ข้อเสนอแนะ:**
- ใช้ Tailwind classes แทน
- หรือแยกเป็น CSS modules หรือ styled-components

---

### 8. Complex Logic in Render

**ปัญหา:**
- มี IIFE (Immediately Invoked Function Expression) ใน JSX (line 454-462)
- มี conditional logic ซับซ้อนใน render

**ควรแก้:**
```typescript
// แยกเป็น helper function
const formatTimeSlotLabel = (slot: string): string => {
  if (slot === TIMETABLE_CONSTANTS.LUNCH_BREAK.LABEL) {
    return slot;
  }
  const [hh, mm] = slot.split(':').map(Number);
  const start = new Date(2000, 0, 1, hh, mm, 0, 0);
  const pad = padTime;
  const plus = (hh === 13 && mm === 15) ? 45 : 30;
  const end = new Date(start.getTime() + plus * 60000);
  return `${pad(start.getHours())}:${pad(start.getMinutes())}-${pad(end.getHours())}:${pad(end.getMinutes())}`;
};
```

---

### 9. Error Handling

**ปัญหา:**
- ไม่มีการ handle edge cases:
  - กรณี jobs เป็น undefined หรือ null
  - กรณี time format ไม่ถูกต้อง
  - กรณี operators_from_join เป็น empty string

---

### 10. Comments & Documentation

**ปัญหา:**
- มี comments ที่เป็น emoji หรือ checkmark ✅ ซึ่งไม่เป็นมาตรฐาน
- บาง function ไม่มี JSDoc comments

**ควรแก้:**
```typescript
/**
 * Generates time slots for the timetable
 * @param start - Start time in HH:mm format (default: "08:00")
 * @param end - End time in HH:mm format (default: "17:00")
 * @param step - Time step in minutes (default: 30)
 * @returns Array of time slot strings
 */
function generateTimeSlots(start = "08:00", end = "17:00", step = 30) {
  // ...
}
```

---

## 📋 Action Items (ลำดับความสำคัญ)

### High Priority
1. ✅ แก้ Type Safety (ใช้ `ProductionItem` แทน `any[]`)
2. ✅ Extract constants ออกเป็นไฟล์แยก
3. ✅ ลบ unused imports
4. ✅ แก้ SSR issue กับ `window.innerWidth`

### Medium Priority
5. ✅ แยก utility functions ออกเป็นไฟล์แยก
6. ✅ ลด code duplication (filter logic, time calculation)
7. ✅ แยก helper functions ออกจาก IIFE ใน JSX

### Low Priority
8. ⚠️ แยกไฟล์ออกเป็น modules (refactor structure)
9. ⚠️ เพิ่ม error handling
10. ⚠️ ปรับปรุง comments และ documentation

---

## 🎯 Recommended File Structure

```
frontend/components/
  ├── TimeTablePopup.tsx          (main component, ~200 lines)
  ├── TimeTable.tsx                (table component, ~150 lines)
  └── timetable/
      ├── constants.ts             (constants)
      ├── types.ts                 (type definitions)
      ├── utils.ts                 (utility functions)
      └── hooks/
          └── useTimetableLayout.ts
```

---

## 📊 Code Metrics

- **Total Lines:** 848
- **Complexity:** High
- **Maintainability Index:** Medium
- **Cyclomatic Complexity:** High (especially in `getTimeTableData` and `buildLanes`)

---

## ✅ Conclusion

โค้ดนี้ **ทำงานได้ดี** แต่ **ควร refactor** เพื่อ:
- เพิ่ม Type Safety
- ลด Complexity
- เพิ่ม Maintainability
- ปรับปรุง Performance

แนะนำให้ refactor แบบ incremental (ทีละส่วน) เพื่อไม่ให้กระทบ production code

