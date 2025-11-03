# Logic การสร้างงาน A, B, C, D

## 📋 สรุปภาพรวม

ระบบมีการสร้างงาน A, B, C, D อัตโนมัติใน **2 จุด**:

1. **Backend API** - `WorkPlan.createDefaultTasks()` 
2. **Frontend Auto-Create** - `useEffect` ใน `Production_Planing.tsx`

---

## 🔍 1. Backend Logic (WorkPlan.createDefaultTasks)

### 📍 ตำแหน่ง: `backend/models/WorkPlan.js` (บรรทัด 299-368)

### ✅ Logic การเช็ค

```javascript
// ขั้นตอนที่ 1: เช็คว่ามีงาน default แล้วหรือยัง
const [existing] = await connection.execute(`
  SELECT COUNT(*) as count 
  FROM work_plans 
  WHERE DATE(production_date) = ? AND job_type = 'default'
`, [formattedDate]);

// ขั้นตอนที่ 2: ถ้ามีแล้ว (count > 0) -> ข้ามการสร้าง
if (existing[0].count > 0) {
  return { 
    success: true, 
    message: 'Default tasks already exist',
    created: false,
    count: existing[0].count
  };
}

// ขั้นตอนที่ 3: ถ้ายังไม่มี -> สร้างงาน A, B, C, D
const defaultTasks = [
  { code: 'A', name: 'เบิกของส่งสาขา-ผัก' },
  { code: 'B', name: 'เบิกของส่งสาขา-สด' },
  { code: 'C', name: 'เบิกของส่งสาขา-แห้ง' },
  { code: 'D', name: 'ตวงสูตร' }
];

// INSERT แต่ละงาน
for (const task of defaultTasks) {
  INSERT INTO work_plans 
  (production_date, job_code, job_name, job_type, workflow_status, status_id, is_printed, start_time, end_time)
  VALUES (?, ?, ?, 'default', 'draft', 1, 0, '08:00:00', '09:00:00')
}
```

### 🔑 จุดสำคัญ

- **เงื่อนไขการเช็ค**: `WHERE DATE(production_date) = ? AND job_type = 'default'`
  - เช็คว่า **มีงานที่ `job_type = 'default'` ในวันนั้นหรือยัง**
  - ไม่ได้เช็คเฉพาะ job_code A, B, C, D
  - **ถ้ามีงาน default อย่างน้อย 1 งาน** ก็จะไม่สร้าง

- **ข้อดี**: 
  - ป้องกันสร้างซ้ำทั้งหมด
  - รวดเร็ว (เช็คครั้งเดียว)
  
- **ข้อควรระวัง**:
  - ถ้ามีงาน default อื่นๆ ในวันนั้น (ที่ไม่ใช่ A, B, C, D) ก็จะไม่สร้าง
  - ไม่ได้เช็คแยกทีละ job_code

### 📊 SQL Query ที่ใช้เช็ค

```sql
SELECT COUNT(*) as count 
FROM work_plans 
WHERE DATE(production_date) = '2025-11-01' 
  AND job_type = 'default'
```

---

## 🎨 2. Frontend Logic (Auto-Create Drafts)

### 📍 ตำแหน่ง: `frontend/Production_Planing.tsx` (บรรทัด 1905-1994)

### ✅ Logic การเช็ค

```typescript
// ขั้นตอนที่ 1: ดึงข้อมูล drafts จาก API
const draftsResponse = await fetch(`/api/work-plans?date=${selectedDate}`);
const draftsData = await draftsResponse.json();
const existingDrafts = draftsData.data.filter(draft => draft.workflow_status === 'draft');

// ขั้นตอนที่ 2: กรองเฉพาะงาน A, B, C, D ในวันที่เลือก
const dayDrafts = existingDrafts.filter(draft => {
  const draftDate = draft.production_date.split('T')[0];
  return draftDate === selectedDate 
    && ['A', 'B', 'C', 'D'].includes(draft.job_code);
});

// ขั้นตอนที่ 3: เช็คทีละ job_code
const defaultDrafts = [
  { job_code: 'A', job_name: 'เบิกของส่งสาขา  - ผัก' },
  { job_code: 'B', job_name: 'เบิกของส่งสาขา  - สด' },
  { job_code: 'C', job_name: 'เบิกของส่งสาขา  - แห้ง' },
  { job_code: 'D', job_name: 'ตวงสูตร' },
];

for (const draft of defaultDrafts) {
  // เช็คว่ามี draft นี้แล้วหรือยัง
  const exists = dayDrafts.some(existingDraft => 
    existingDraft.job_code === draft.job_code && 
    existingDraft.job_name === draft.job_name
  );
  
  // ถ้ายังไม่มี -> สร้าง
  if (!exists) {
    await fetch('/api/work-plans', {
      method: 'POST',
      body: JSON.stringify({
        production_date: selectedDate,
        job_code: draft.job_code,
        job_name: draft.job_name,
        workflow_status: 'draft',
        ...
      })
    });
  }
}
```

### 🔑 จุดสำคัญ

- **เงื่อนไขการเช็ค**: 
  - `workflow_status === 'draft'` 
  - `job_code IN ('A', 'B', 'C', 'D')`
  - `production_date === selectedDate`

- **เช็คแยกทีละ job_code**: 
  - ถ้าไม่มี A -> สร้าง A
  - ถ้าไม่มี B -> สร้าง B
  - ถ้าไม่มี C -> สร้าง C
  - ถ้าไม่มี D -> สร้าง D
  
- **ข้อดี**: 
  - ละเอียดกว่า backend
  - สร้างเฉพาะงานที่ยังไม่มี
  
- **ข้อควรระวัง**:
  - เช็คแยกทีละ job_code (ช้ากว่า backend)
  - ต้องเรียก API หลายครั้ง (ถ้ามีหลายงานที่ยังไม่มี)

---

## ⚖️ เปรียบเทียบ 2 วิธี

| หัวข้อ | Backend (`createDefaultTasks`) | Frontend (`useEffect`) |
|--------|-------------------------------|------------------------|
| **วิธีเช็ค** | เช็ค `job_type = 'default'` ทั้งหมด | เช็ค `job_code` แต่ละตัว + `workflow_status = 'draft'` |
| **ความละเอียด** | เช็ครวม (มีงาน default 1 งานก็ไม่สร้าง) | เช็คแยก (เช็คแต่ละ job_code) |
| **ความเร็ว** | เร็วกว่า (เช็คครั้งเดียว) | ช้ากว่า (เช็คหลายครั้ง) |
| **กรณีใช้งาน** | สร้างงานทั้งหมดพร้อมกัน | สร้างเฉพาะงานที่ยังไม่มี |
| **เมื่อไหร่เรียกใช้** | เรียกผ่าน API `/api/work-plans/create-defaults` | เรียกอัตโนมัติเมื่อเปลี่ยนวันที่ (`useEffect`) |

---

## 🚨 ปัญหาที่อาจเกิดขึ้น

### 1. **ข้อมูลซ้ำ (Duplication)**

ถ้าใช้ทั้ง 2 วิธีพร้อมกัน อาจเกิดข้อมูลซ้ำได้:

```
Backend: สร้าง A, B, C, D (job_type = 'default')
Frontend: สร้าง A, B, C, D อีกครั้ง (workflow_status = 'draft')
→ ผลลัพธ์: มีงาน A, B, C, D ซ้ำกัน
```

**วิธีแก้**: 
- ใช้แค่วิธีใดวิธีหนึ่ง
- หรือปรับ logic ให้เช็ครวมกัน

### 2. **Logic ไม่สอดคล้องกัน**

Backend เช็ค: `job_type = 'default'`  
Frontend เช็ค: `job_code IN ('A', 'B', 'C', 'D') AND workflow_status = 'draft'`

**ปัญหาที่อาจเกิด**:
- Backend อาจไม่สร้างถ้ามีงาน default อื่นๆ
- Frontend อาจสร้างซ้ำถ้า Backend สร้างไปแล้วแต่ `job_type != 'default'`

---

## ✅ แนะนำวิธีแก้ไข

### ตัวเลือก 1: ใช้ Backend เท่านั้น (แนะนำ)

```sql
-- เช็คให้ละเอียดขึ้น: เช็คแต่ละ job_code แยก
SELECT 
  job_code,
  COUNT(*) as count
FROM work_plans 
WHERE DATE(production_date) = ? 
  AND job_code IN ('A', 'B', 'C', 'D')
  AND job_type = 'default'
GROUP BY job_code;
```

### ตัวเลือก 2: ปรับ Frontend ให้เช็ค `job_type`

```typescript
const existingDrafts = draftsData.data.filter(draft => 
  draft.job_type === 'default' && 
  ['A', 'B', 'C', 'D'].includes(draft.job_code)
);
```

### ตัวเลือก 3: ป้องกันซ้ำด้วย Unique Constraint

```sql
-- สร้าง unique constraint
ALTER TABLE work_plans 
ADD UNIQUE KEY unique_date_job_code (production_date, job_code);
```

---

## 📝 สรุป

1. **Backend** เช็คแบบรวม (`job_type = 'default'`) - เร็วกว่า แต่ละเอียดน้อยกว่า
2. **Frontend** เช็คแบบแยก (`job_code` แต่ละตัว) - ช้ากว่า แต่ละเอียดกว่า
3. **ควรใช้วิธีใดวิธีหนึ่ง** เพื่อป้องกันข้อมูลซ้ำ
4. **ถ้าต้องใช้ทั้ง 2 วิธี** ต้องปรับ logic ให้สอดคล้องกัน

