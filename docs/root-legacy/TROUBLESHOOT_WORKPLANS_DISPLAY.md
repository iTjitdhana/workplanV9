# 🔧 แก้ปัญหา: แสดงแต่ Drafts ไม่แสดง Work Plans

**วันที่:** 2025-10-20  
**ปัญหา:** Frontend แสดงแต่ Drafts ไม่แสดง Work Plans จริง

---

## ✅ สิ่งที่ตรวจสอบแล้ว

### 1. ข้อมูลใน Database ✅

```
📊 manufacturing_system (192.168.0.96):
✅ work_plans: 1,226 records
✅ work_plan_drafts: 12 records

📋 Work Plans วันที่ 2025-10-20:
   - ID: 7539 | 303003R - เนื้อลูกมะพร้าว
   - ID: 7538 | 105001R - กุ้ง 36-40 ตัว/กก.
   - ID: 7537 | 235052 - แป้งไก่มะนาว
   (และอีกหลายรายการ)
```

**สรุป:** ✅ **ข้อมูลมีครบ!**

---

### 2. Backend Configuration ✅

```javascript
// backend/config/database.js
module.exports = {
  pool: newPool,  // ชี้ไปที่ manufacturing_system (192.168.0.96) ✅
  oldPool: pool,
  newPool
};
```

**สรุป:** ✅ **Backend ใช้ Database ถูกต้อง!**

---

### 3. API Routes ✅

```javascript
// backend/server.js
app.use('/api/work-plans', require('./routes/workPlanRoutes'));

// backend/routes/workPlanRoutes.js
router.get('/', WorkPlanController.getAllWorkPlans);       // ✅
router.get('/drafts', DraftWorkPlanController.getAll);     // ✅
```

**สรุป:** ✅ **Routes ถูกต้อง!**

---

### 4. Models ✅

```javascript
// backend/models/WorkPlan.js
const { pool } = require('../config/database');  // pool = newPool แล้ว ✅

static async getAll(date = null, page = 1, limit = 50, filters = {}) {
  const [rows] = await pool.execute(`
    SELECT * FROM work_plans
    WHERE (DATE(wp.production_date) = ? OR wp.production_date = ?)
    ...
  `);
  return rows;
}
```

**สรุป:** ✅ **Models query ถูกต้อง!**

---

## 🔍 สาเหตุที่เป็นไปได้

### 🔴 สาเหตุที่ 1: Frontend Cache

Frontend อาจ cache ข้อมูลเก่าไว้

**วิธีแก้:**
```bash
# Clear browser cache
Ctrl + Shift + Delete

# หรือ Hard Refresh
Ctrl + F5

# หรือ Incognito Mode
Ctrl + Shift + N
```

---

### 🔴 สาเหตุที่ 2: Frontend เรียก API ผิด

Frontend อาจไม่ได้เรียก `/api/work-plans` หรือเรียกโดยไม่ส่ง `date`

**ตรวจสอบ:**
1. เปิด DevTools (F12)
2. ไปที่ Tab "Network"
3. Reload หน้า
4. ดูว่ามี request ไปที่ `/api/work-plans?date=...` หรือไม่

**ผลที่ต้องเห็น:**
```
Request URL: http://localhost:3101/api/work-plans?date=2025-10-20
Status: 200
Response: [{id: 7539, job_code: "303003R", ...}, ...]
```

---

### 🔴 สาเหตุที่ 3: Response Format เปลี่ยน

API response อาจมี format ที่ Frontend ไม่คาดหวัง

**ตรวจสอบ:**
```javascript
// ใน Production_Planing.tsx หรือหน้าที่แสดง work plans
// ดูว่า response มาในรูปแบบไหน

// ถ้า API return แบบนี้:
{ data: [...], success: true }

// แต่ Frontend expect แบบนี้:
[...]

// จะทำให้ไม่แสดง
```

---

### 🔴 สาเหตุที่ 4: Frontend Filter ข้อมูลออก

Frontend อาจมี logic filter ที่กรองงานออกไป

**ตรวจสอบ:**
```typescript
// ใน Production_Planing.tsx
// อาจมี code แบบนี้:
const filteredPlans = workPlans.filter(plan => 
  plan.workflow_status_id === 2 || // เฉพาะ drafts?
  plan.is_draft === true            // เฉพาะ drafts?
);
```

---

## 🧪 วิธีทดสอบ (ขั้นตอนที่ต้องทำ)

### Step 1: รัน Backend และทดสอบ API

```bash
# Terminal 1: รัน Backend
cd backend
npm run dev

# ดู Console ควรเห็น:
# 🆕 New DB (manufacturing_system):
#    Host: 192.168.0.96
#    Database: manufacturing_system
```

### Step 2: ทดสอบ API ด้วย curl/Postman

```bash
# ทดสอบ Health Check
curl http://localhost:3101/health

# ทดสอบดึง work_plans วันนี้
curl "http://localhost:3101/api/work-plans?date=2025-10-20"

# ทดสอบดึง drafts
curl http://localhost:3101/api/work-plans/drafts
```

**ผลที่ต้องได้:**
```json
// /api/work-plans?date=2025-10-20
[
  {
    "id": 7539,
    "production_date": "2025-10-20",
    "job_code": "303003R",
    "job_name": "เนื้อลูกมะพร้าว (Repack)",
    "start_time": "08:00:00",
    "end_time": "10:00:00",
    "status_id": 1,
    "status_name": "รอดำเนินการ"
  },
  // ... อีกหลายรายการ
]
```

### Step 3: ตรวจสอบ Frontend

```bash
# Terminal 2: รัน Frontend
cd frontend
npm run dev

# เปิด Browser: http://localhost:3012
# กด F12 → Tab Network
# Reload หน้า
# ดู Request ที่ส่งไป
```

**ต้องเห็น:**
```
GET /api/work-plans?date=2025-10-20
Status: 200
Response: [...data...]
```

---

## 🎯 วิธีแก้ปัญหา (แบบทีละขั้น)

### ✅ Option 1: ตรวจสอบ Console Logs

เปิด Frontend Console (F12) และดู errors:

```javascript
// อาจเห็น error แบบนี้:
// TypeError: Cannot read property 'FG_Code' of undefined
// → แปลว่า Frontend ยังใช้ field เก่า
```

**วิธีแก้:**
- แก้ Frontend ให้ใช้ field ใหม่: `product_code`, `product_name`

---

### ✅ Option 2: เช็ค Network Tab

ดูว่า Frontend เรียก API อะไรบ้าง:

**ถ้าเห็น:**
```
✅ /api/work-plans?date=2025-10-20 → 200 OK (มีข้อมูล)
✅ /api/work-plans/drafts → 200 OK (มีข้อมูล)
```

แต่ไม่แสดง → **ปัญหาอยู่ที่ Frontend rendering**

**ถ้าไม่เห็น request:**
→ **Frontend ไม่ได้เรียก API**

---

### ✅ Option 3: เช็ค Response Data

```bash
# ทดสอบ API ตรงๆ
curl http://localhost:3101/api/work-plans?date=2025-10-20 | jq

# ดูว่า Response มี data ไหม
```

---

### ✅ Option 4: เช็ค Frontend Code

ดูใน `frontend/Production_Planing.tsx`:

```typescript
// ตรวจสอบว่า fetch data อย่างไร
useEffect(() => {
  const fetchData = async () => {
    const plans = await api.getWorkPlans(selectedDate);
    // ตรง plans นี้มีข้อมูลไหม?
    console.log('📊 Fetched plans:', plans);
    
    const drafts = await api.getDrafts();
    console.log('📝 Fetched drafts:', drafts);
  };
  fetchData();
}, [selectedDate]);
```

**เพิ่ม console.log เพื่อ debug**

---

## 🚨 ปัญหาที่พบบ่อย

### 1. Field Name ไม่ตรง

```typescript
// ❌ Frontend ใช้ field เก่า
plan.FG_Code  // undefined

// ✅ ต้องเปลี่ยนเป็น
plan.product_code
```

### 2. Response Format ไม่ตรง

```javascript
// API return
{ success: true, data: [...] }

// Frontend expect
[...]

// แก้ไข:
const plans = response.data || response;
```

### 3. Date Format ไม่ตรง

```javascript
// Frontend ส่ง
date = "20-10-2025"  // ❌ ผิด

// Backend expect
date = "2025-10-20"  // ✅ ถูก
```

---

## 🔧 Quick Fix

### แก้ 1: เพิ่ม Debug Logs ใน Frontend

```typescript
// frontend/Production_Planing.tsx
useEffect(() => {
  const loadData = async () => {
    console.log('🔍 Loading data for date:', selectedDate);
    
    // ดึง work plans
    const plans = await api.getWorkPlans(selectedDate);
    console.log('📊 Work plans received:', plans);
    console.log('📊 Work plans count:', plans?.length || 0);
    
    // ดึง drafts
    const drafts = await api.getDrafts();
    console.log('📝 Drafts received:', drafts);
    console.log('📝 Drafts count:', drafts?.length || 0);
    
    // Set state
    setWorkPlans(plans || []);
    setDrafts(drafts || []);
  };
  
  loadData();
}, [selectedDate]);
```

### แก้ 2: ตรวจสอบ Filter/Conditional Rendering

```typescript
// ดูว่ามี code แบบนี้ไหม
{workPlans.filter(plan => plan.is_draft).map(...)}  // ❌ กรอง drafts เฉพาะ

// ควรเป็น
{workPlans.map(...)}  // ✅ แสดงทั้งหมด
```

---

## 📊 สรุปและขั้นตอนถัดไป

### ✅ สิ่งที่แน่ใจแล้ว

1. ✅ Database มีข้อมูล work_plans (1,226 records)
2. ✅ Backend เชื่อมต่อ manufacturing_system ถูกต้อง
3. ✅ API routes ถูกต้อง
4. ✅ Models ใช้ pool (newPool) แล้ว

### ❓ สิ่งที่ต้องตรวจสอบต่อ

1. ⚠️ Frontend เรียก API ได้ไหม?
2. ⚠️ Response มีข้อมูลไหม?
3. ⚠️ Frontend filter ข้อมูลออกไหม?
4. ⚠️ Frontend ใช้ field name ที่ถูกต้องไหม?

---

## 🚀 ทำตามนี้เลย

### 1. รัน Backend (Terminal 1)
```bash
cd backend
npm run dev

# ดู Console ต้องเห็น:
# 🆕 New DB (manufacturing_system):
#    Host: 192.168.0.96
```

### 2. ทดสอบ API (Terminal 2)
```bash
cd backend
node test-workplans-api.js

# จะแสดงว่า API return ข้อมูลหรือไม่
```

### 3. เปิด Frontend และ Debug
```bash
# Terminal 3
cd frontend
npm run dev

# เปิด Browser: http://localhost:3012
# กด F12
# ดู Console Logs
# ดู Network Tab
```

### 4. ดู Network Tab
- ดูว่ามี request `/api/work-plans?date=...` ไหม
- Status Code เป็น 200 ไหม
- Response มี data ไหม

### 5. ดู Console Logs
- มี error ไหม
- แสดงข้อมูลอะไรบ้าง

---

## 💡 สาเหตุที่น่าจะเป็น

### 🎯 สาเหตุที่ 1: Frontend ไม่ได้เรียก API (80%)

**ตรวจสอบ:**
```typescript
// frontend/Production_Planing.tsx
// มี useEffect ที่เรียก api.getWorkPlans() ไหม?

useEffect(() => {
  // ตรงนี้ต้องมี
  api.getWorkPlans(selectedDate)
    .then(setWorkPlans);
}, [selectedDate]);
```

**ถ้าไม่มี → เพิ่มให้**

---

### 🎯 สาเหตุที่ 2: Response Handling ผิด (15%)

```typescript
// อาจจะ handle response ผิด
const response = await api.getWorkPlans(date);

// ถ้า response เป็น { data: [...] }
setWorkPlans(response);  // ❌ ผิด
setWorkPlans(response.data || response);  // ✅ ถูก
```

---

### 🎯 สาเหตุที่ 3: Conditional Rendering (5%)

```typescript
// render เฉพาะ drafts?
{isDraft && <WorkPlanItem />}  // ❌

// ควรเป็น
{workPlans.map(plan => <WorkPlanItem />)}  // ✅
{drafts.map(draft => <DraftItem />)}  // ✅
```

---

## 🔧 วิธีแก้ Quick

### วิธีที่ 1: เพิ่ม Debug Logs

เพิ่ม console.log ใน Frontend เพื่อดูว่าข้อมูลมาถึงหรือไม่:

```typescript
// frontend/app/planner/production/page.tsx หรือไฟล์ที่แสดง work plans
console.log('🔍 All data:', { workPlans, drafts });
console.log('📊 Work plans count:', workPlans?.length);
console.log('📝 Drafts count:', drafts?.length);
```

### วิธีที่ 2: ทดสอบ API ตรงๆ

เปิด Browser Console และพิมพ์:

```javascript
fetch('http://localhost:3101/api/work-plans?date=2025-10-20')
  .then(r => r.json())
  .then(console.log);

// ดูว่า return ข้อมูลอะไร
```

### วิธีที่ 3: Check State Management

```typescript
// ดูว่า setState ถูกเรียกไหม
const [workPlans, setWorkPlans] = useState([]);

useEffect(() => {
  api.getWorkPlans(date)
    .then(data => {
      console.log('📊 Setting work plans:', data);
      setWorkPlans(data);  // ← ถูกเรียกไหม?
    });
}, [date]);
```

---

## 📝 Checklist การตรวจสอบ

- [ ] Backend รันอยู่บน port 3101
- [ ] Frontend รันอยู่บน port 3012
- [ ] เปิด DevTools (F12)
- [ ] ดู Network Tab มี request `/api/work-plans` ไหม
- [ ] ดู Console Tab มี error ไหม
- [ ] ดู Response data มีไหม
- [ ] ดู State (React DevTools) มีข้อมูลไหม

---

## 🆘 ถ้ายังไม่เจอ

**ส่งข้อมูลนี้มาให้:**
1. Screenshot Network Tab (F12 → Network)
2. Screenshot Console Tab (F12 → Console)
3. API Response ที่ได้จาก `/api/work-plans?date=...`
4. Code ส่วนที่ fetch และ render work plans

---

**ลองทดสอบตาม Step 1-5 ก่อนนะครับ แล้วบอกผลลัพธ์มา! 🚀**

