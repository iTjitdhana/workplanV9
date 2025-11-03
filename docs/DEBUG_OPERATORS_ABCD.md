# เอกสารตรวจสอบปัญหา Operators ของงาน A, B, C, D

## 🔍 สรุปปัญหา

งาน A, B, C, D ไม่แสดงผู้ปฏิบัติงานใน Frontend แม้ว่าจะมีข้อมูลใน Backend

---

## 📋 ขั้นตอนการตรวจสอบ

### 1. ตรวจสอบข้อมูลใน Database

รัน SQL นี้เพื่อตรวจสอบว่ามี operators สำหรับงาน A, B, C, D หรือไม่:

```sql
-- ตรวจสอบงาน A, B, C, D และ operators
SELECT 
    wp.id,
    wp.job_code,
    wp.job_name,
    wp.production_date,
    wpo.id as operator_id,
    wpo.user_id,
    wpo.id_code,
    u.name as operator_name
FROM work_plans wp
LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
  AND DATE(wp.production_date) = '2025-11-01'  -- เปลี่ยนเป็นวันที่ที่ต้องการตรวจสอบ
ORDER BY wp.job_code, u.name;
```

**ผลลัพธ์ที่คาดหวัง:**
- ถ้ามี operators → ควรเห็น `operator_name` ในผลลัพธ์
- ถ้าไม่มี operators → `operator_name` จะเป็น `NULL`

---

### 2. ตรวจสอบ Backend API Response

เปิด Browser DevTools → Network tab → เรียก API:
```
GET /api/work-plans?date=2025-11-01
```

ตรวจสอบ Response สำหรับงาน A, B, C, D:

**ตัวอย่าง Response ที่ถูกต้อง:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "job_code": "A",
      "job_name": "เบิกของส่งสาขา-ผัก",
      "operators": "พี่ภา, แจ็ค",
      "operators_from_join": "พี่ภา, แจ็ค",
      ...
    }
  ]
}
```

**ถ้าไม่มี operators:**
```json
{
  "id": 123,
  "job_code": "A",
  "operators": "",
  "operators_from_join": null
}
```

---

### 3. ตรวจสอบ Frontend Console

เปิด Browser DevTools → Console tab

ดู Log:
```
📊 [DEBUG] Data sample before set: [...]
```

ตรวจสอบว่า:
- มี `operators` หรือ `operators_from_join` ใน object หรือไม่
- ค่าเป็น string ว่าง (`""`) หรือ `null` หรือไม่

---

## 🔧 การแก้ไขที่ทำไปแล้ว

### 1. แก้ไข `renderStaffAvatars()` 
**ไฟล์:** `frontend/Production_Planing.tsx`

- ✅ เพิ่มการเช็ค `operators_from_join` ก่อน
- ✅ รับ parameter `item` เพื่อเข้าถึง `operators_from_join`

### 2. แก้ไข `loadAllProductionData()`
**ไฟล์:** `frontend/Production_Planing.tsx`

- ✅ ใช้ `operators_from_join` ก่อน ถ้าไม่มีค่อยใช้ `operators`
- ✅ เก็บ `operators_from_join` ไว้ใน object

### 3. แก้ไขการเรียกใช้ `renderStaffAvatars()`
**ไฟล์:** `frontend/Production_Planing.tsx`

- ✅ ส่ง `item` ทั้งหมดเข้าไปในฟังก์ชัน

---

## ⚠️ สาเหตุที่อาจเป็นไปได้

### สาเหตุ 1: ไม่มีข้อมูลใน `work_plan_operators` table
**วิธีแก้:** ต้องเพิ่ม operators ผ่าน UI หรือ SQL

### สาเหตุ 2: Backend ไม่ได้ส่ง `operators_from_join`
**วิธีแก้:** ตรวจสอบว่า `work_plan_operators` มีข้อมูลและ JOIN query ทำงานถูกต้อง

### สาเหตุ 3: Frontend ไม่ได้เก็บ `operators_from_join`
**วิธีแก้:** ✅ แก้ไขแล้ว (ใน `loadAllProductionData()`)

---

## 🧪 คำสั่งทดสอบ

### ตรวจสอบข้อมูลใน Database

```sql
-- เช็คว่างาน A, B, C, D มี operators หรือไม่
SELECT 
    wp.id,
    wp.job_code,
    wp.job_name,
    COUNT(wpo.id) as operator_count,
    GROUP_CONCAT(u.name SEPARATOR ', ') as operator_names
FROM work_plans wp
LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
  AND DATE(wp.production_date) = '2025-11-01'
GROUP BY wp.id, wp.job_code, wp.job_name;
```

### เพิ่ม operators (ถ้ายังไม่มี)

```sql
-- หา work_plan_id ของงาน A
SELECT id FROM work_plans 
WHERE job_code = 'A' 
  AND DATE(production_date) = '2025-11-01';

-- เพิ่ม operators (ตัวอย่าง)
INSERT INTO work_plan_operators (work_plan_id, user_id, id_code)
VALUES 
  (123, NULL, 'พี่ภา'),  -- เปลี่ยน 123 เป็น work_plan_id จริง
  (123, NULL, 'แจ็ค');
```

---

## ✅ Checklist

- [ ] ตรวจสอบข้อมูลใน Database (มี operators หรือไม่)
- [ ] ตรวจสอบ Backend API Response (ส่ง operators มาไหม)
- [ ] ตรวจสอบ Frontend Console (รับ operators หรือไม่)
- [ ] Refresh หน้าเว็บ (ให้ Frontend โหลดข้อมูลใหม่)
- [ ] ตรวจสอบว่า operators แสดงขึ้นมาแล้ว

---

## 📝 หมายเหตุ

1. **Backend** ดึง operators จาก `work_plan_operators` table และส่งมาเป็น `operators_from_join`
2. **Frontend** ควรใช้ `operators_from_join` ก่อน ถ้าไม่มีค่อยใช้ `operators`
3. ถ้ายังไม่แสดง แสดงว่า**ไม่มีข้อมูลใน `work_plan_operators` table** → ต้องเพิ่มข้อมูลก่อน

