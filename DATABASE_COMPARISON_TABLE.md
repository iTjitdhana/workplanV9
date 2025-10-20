# 📊 ตารางเปรียบเทียบ Database ทั้ง 2 ฐาน

**esp_tracker** (192.168.0.94) vs **manufacturing_system** (192.168.0.96)

---

## 🎯 คำตอบสั้นๆ: **ต้องแก้ API!**

เพราะ:
1. ✅ ชื่อตารางเปลี่ยน
2. ✅ ชื่อ field เปลี่ยน
3. ✅ โครงสร้างการทำงานเปลี่ยน

---

## 📋 ตารางเปรียบเทียบรายละเอียด

### 1. ตาราง Products (สินค้าสำเร็จรูป)

| Field | esp_tracker (เก่า) | manufacturing_system (ใหม่) | ต้องแก้ API |
|-------|--------------------|-----------------------------|-------------|
| **ชื่อตาราง** | `fg` | `products` | ✅ ใช่ |
| รหัสสินค้า | `FG_Code` | `product_code` | ✅ ใช่ |
| ชื่อสินค้า | `FG_Name` | `product_name` | ✅ ใช่ |
| หน่วย | `FG_Unit` | - | ✅ ใช่ (ลบแล้ว) |
| ขนาด | `FG_Size` | - | ✅ ใช่ (ลบแล้ว) |
| หน่วยฐาน | `base_unit` | `unit` | ✅ ใช่ |
| ประเภท | - | `product_type` | ✅ ใช่ (ใหม่) |
| หมวดหมู่ | - | `category` | ✅ ใช่ (ใหม่) |
| รายละเอียด | - | `description` | ✅ ใช่ (ใหม่) |

**ตัวอย่าง API ที่ต้องแก้:**
```javascript
// ❌ เก่า
GET /api/products
SELECT FG_Code, FG_Name FROM fg

// ✅ ใหม่  
GET /api/products
SELECT product_code, product_name FROM products
```

---

### 2. ตาราง Materials (วัตถุดิบ)

| Field | esp_tracker (เก่า) | manufacturing_system (ใหม่) | ต้องแก้ API |
|-------|--------------------|-----------------------------|-------------|
| **ชื่อตาราง** | `material` | `materials` | ✅ ใช่ |
| รหัสวัตถุดิบ | `Mat_Id` | `material_code` | ✅ ใช่ |
| ชื่อวัตถุดิบ | `Mat_Name` | `material_name` | ✅ ใช่ |
| หน่วย | `Mat_Unit` | `unit` | ✅ ใช่ |
| ราคา | `price` | `price` | ⭕ เหมือนเดิม |

**ตัวอย่าง API ที่ต้องแก้:**
```javascript
// ❌ เก่า
SELECT Mat_Id, Mat_Name FROM material

// ✅ ใหม่
SELECT material_code, material_name FROM materials
```

---

### 3. ตาราง Process Steps → Templates (⚠️ เปลี่ยนแปลงมาก)

| Field | esp_tracker | manufacturing_system | หมายเหตุ |
|-------|-------------|----------------------|----------|
| **ชื่อตาราง** | `process_steps` | `process_templates` | แม่แบบขั้นตอน |
| - | - | `process_executions` | บันทึกการทำงานจริง |
| รหัสงาน | `job_code` | `product_code` | เปลี่ยนชื่อ |
| ชื่องาน | `job_name` | - | ลบ (ดึงจาก products) |
| วันที่บันทึก | `date_recorded` | - | ลบ (ไปอยู่ executions) |
| จำนวนคน | `worker_count` | `standard_worker_count` | เปลี่ยนชื่อ |
| ขั้นตอนที่ | `process_number` | `process_number` | เหมือนเดิม |
| รายละเอียด | `process_description` | `process_description` | เหมือนเดิม |
| เวอร์ชัน | - | `version` | ใหม่ ⭐ |
| เวลาประมาณ | - | `estimated_duration_minutes` | ใหม่ ⭐ |

**⚠️ แนวคิดเปลี่ยน:**
- **เก่า:** `process_steps` = บันทึกการทำงาน (ผูกกับวันที่)
- **ใหม่:** 
  - `process_templates` = แม่แบบ/สูตร (ไม่ผูกวันที่)
  - `process_executions` = บันทึกการทำงานจริง (ผูกกับ work_plan_id)

---

### 4. ตาราง BOM (สูตรการผลิต)

| Field | esp_tracker | manufacturing_system | ต้องแก้ API |
|-------|-------------|----------------------|-------------|
| **ชื่อตาราง** | `fg_bom` | `product_bom` | ✅ ใช่ |
| รหัสสินค้า | `FG_Code` | `product_code` | ✅ ใช่ |
| รหัสวัตถุดิบ | `Raw_Code` | `material_code` | ✅ ใช่ |
| ปริมาณ | `Raw_Qty` | `quantity` | ✅ ใช่ |
| หน่วย | `Raw_Unit` | `unit` | ✅ ใช่ |

---

### 5. ตาราง Production Batches

| Field | esp_tracker | manufacturing_system | ต้องแก้ API |
|-------|-------------|----------------------|-------------|
| รหัสสินค้า | `fg_code` | `product_code` | ✅ ใช่ |
| อื่นๆ | เหมือนกัน | เหมือนกัน | ⭕ ไม่ต้อง |

---

### 6. ตาราง Work Plans

| Field | esp_tracker | manufacturing_system | ต้องแก้ API |
|-------|-------------|----------------------|-------------|
| ส่วนใหญ่ | เหมือนกัน | เหมือนกัน | ⭕ ไม่ต้อง |
| เวอร์ชัน | - | `template_version` | ✅ ใหม่ |
| ผู้สร้าง | - | `created_by` | ✅ ใหม่ |

---

## 🔍 ไฟล์ Backend ที่ต้องแก้แน่นอน

### 🔴 ต้องแก้ทันที (3 ไฟล์)

| # | ไฟล์ | ใช้ตาราง | แก้ไข |
|---|------|----------|--------|
| 1 | `models/ProcessStep.js` | `process_steps` | เปลี่ยนเป็น `process_templates` |
| 2 | `controllers/newJobsController.js` | `process_steps` | เปลี่ยนเป็น `process_templates` |
| 3 | `routes/processStepRoutes.js` | `process_steps` | เปลี่ยนเป็น `process_templates` |

---

## 🎨 ตัวอย่างการแก้ไข

### Before (esp_tracker)
```javascript
const { pool } = require('../config/database');

// ดึง Process Steps
const [steps] = await pool.query(`
  SELECT * FROM process_steps
  WHERE job_code = ? AND job_name = ?
`, [jobCode, jobName]);
```

### After (manufacturing_system)
```javascript
const { newPool } = require('../config/database');

// ดึง Process Templates (ใช้ View)
const [templates] = await newPool.query(`
  SELECT * FROM v_latest_process_templates
  WHERE product_code = ?
  ORDER BY process_number
`, [productCode]);
```

---

## 📱 ผลกระทบต่อ Frontend

### Response Structure เปลี่ยน

**เก่า:**
```json
{
  "FG_Code": "PRD001",
  "FG_Name": "ข้าวผัดกุ้ง",
  "job_code": "PRD001",
  "job_name": "ข้าวผัดกุ้ง",
  "worker_count": 2
}
```

**ใหม่:**
```json
{
  "product_code": "PRD001",
  "product_name": "ข้าวผัดกุ้ง",
  "product_type": "FG",
  "standard_worker_count": 2,
  "version": 2
}
```

### TypeScript Interface ต้องเปลี่ยน

```typescript
// ❌ เก่า
interface Product {
  FG_Code: string;
  FG_Name: string;
  FG_Unit: string;
  FG_Size: string;
}

// ✅ ใหม่
interface Product {
  product_code: string;
  product_name: string;
  product_type: 'FG' | 'Semi-FG' | 'Component';
  category?: string;
  unit: string;
  description?: string;
}
```

---

## ✅ แนวทางแก้ไขที่แนะนำ

### 🎯 Strategy 1: Dual Database (แนะนำ) ⭐

**ใช้ทั้ง 2 Database พร้อมกัน**

```javascript
// API เก่า (ยังใช้งานได้)
app.get('/api/process-steps', async (req, res) => {
  const { pool } = require('./config/database');
  const [rows] = await pool.query('SELECT * FROM process_steps');
  res.json(rows);
});

// API ใหม่ (เพิ่มใหม่)
app.get('/api/v2/process-templates', async (req, res) => {
  const { newPool } = require('./config/database');
  const [rows] = await newPool.query('SELECT * FROM v_latest_process_templates');
  res.json(rows);
});
```

**ข้อดี:**
- ✅ API เดิมยังใช้ได้
- ✅ ทดลอง API ใหม่ได้
- ✅ Frontend แก้ทีละส่วน
- ✅ Rollback ง่าย

---

### 🎯 Strategy 2: Full Migration

**เปลี่ยนทั้งหมดเลย**

แก้ไขทั้งหมด:
1. Models → ใช้ `newPool`
2. Controllers → ใช้ชื่อตารางใหม่
3. Routes → อัพเดท
4. Frontend → แก้ field names

**ข้อดี:**
- ✅ ใช้ฟีเจอร์ใหม่เต็มที่
- ✅ โครงสร้างดีกว่า

**ข้อเสีย:**
- ❌ ต้องแก้เยอะ
- ❌ ต้อง Test ทุกอย่าง

---

## 📊 สรุปภาพรวม

### ตารางที่มีในทั้ง 2 Database

| ตาราง | esp_tracker | manufacturing_system | เหมือนกันไหม |
|-------|-------------|----------------------|--------------|
| `users` | ✅ มี | ✅ มี | ⭕ เกือบเหมือน (เพิ่ม field) |
| `machines` | ✅ มี | ✅ มี | ✅ เหมือนเดิม |
| `production_rooms` | ✅ มี | ✅ มี | ✅ เหมือนเดิม |
| `production_statuses` | ✅ มี | ✅ มี | ✅ เหมือนเดิม |
| `work_plans` | ✅ มี | ✅ มี | ⭕ เกือบเหมือน (เพิ่ม field) |
| `production_batches` | ✅ มี | ✅ มี | ⚠️ `fg_code` → `product_code` |
| `fg` | ✅ มี | ✅ มี (deprecated) | ⚠️ ควรใช้ `products` แทน |
| `material` | ✅ มี | ✅ มี (deprecated) | ⚠️ ควรใช้ `materials` แทน |
| `process_steps` | ✅ มี | ✅ มี (deprecated) | ⚠️ ควรใช้ `process_templates` แทน |
| `products` | ❌ ไม่มี | ✅ มี | ✅ ตารางใหม่ |
| `materials` | ❌ ไม่มี | ✅ มี | ✅ ตารางใหม่ |
| `process_templates` | ❌ ไม่มี | ✅ มี | ✅ ตารางใหม่ |
| `process_executions` | ❌ ไม่มี | ✅ มี | ✅ ตารางใหม่ |

---

## 🎯 ข่าวดี: Database ใหม่มีตารางเก่าด้วย!

จากการทดสอบ พบว่า `manufacturing_system` มีตารางเก่าอยู่ด้วย:
- ✅ `fg` (มี 913 records)
- ✅ `material` (มี 331 records)
- ✅ `process_steps` (มี 999 records)

**ดังนั้น:**
- **API เดิมยังใช้ได้!** (แค่เปลี่ยน pool → newPool)
- ไม่ต้องแก้ชื่อตารางเลย
- แต่แนะนำให้ใช้ตารางใหม่ (products, materials, process_templates)

---

## ✅ แผนการแก้ไขที่ง่ายที่สุด

### Phase 1: เปลี่ยน Connection Pool (5 นาที)

```javascript
// ในทุกไฟล์ที่ใช้ database
// แก้จาก
const { pool } = require('../config/database');

// เป็น
const { newPool: pool } = require('../config/database');
// ใช้ alias ไม่ต้องแก้โค้ดอื่น!
```

**หรือ:**
```javascript
// แก้ database.js ให้ export pool เป็น newPool
module.exports = {
  pool: newPool,  // ส่ง newPool เป็น pool เลย
  newPool,
  // ...
};
```

### Phase 2: ค่อยๆ Migrate API ใหม่ (ทีละส่วน)

สร้าง API ใหม่ใช้ตารางใหม่:
- `/api/v2/products` → ใช้ `products`
- `/api/v2/process-templates` → ใช้ `process_templates`

---

## 🚀 ตัวอย่าง: แก้แบบง่ายสุด (1 บรรทัด)

### ใน `backend/config/database.js`

เพิ่มบรรทัดนี้:
```javascript
module.exports = {
  pool: newPool,        // ← ใช้ newPool เป็นค่าเริ่มต้น
  oldPool: pool,        // ← เก็บ pool เก่าไว้
  newPool,
  testConnection,
  testNewConnection,
  testAllConnections
};
```

**ผลลัพธ์:**
- ✅ API ทั้งหมดจะใช้ `manufacturing_system` ทันที
- ✅ ไม่ต้องแก้โค้ดเลย
- ✅ ตารางเก่า (fg, material, process_steps) ยังใช้ได้

---

## 📋 Checklist การทำงาน

### ✅ ถ้าไม่อยากแก้ API เลย

- [ ] แก้ `database.js` ให้ export `pool: newPool`
- [ ] Restart backend
- [ ] ทดสอบ API ทั้งหมด
- [ ] เสร็จ! ✅

### ✅ ถ้าอยากใช้ตารางใหม่ (products, process_templates)

- [ ] สร้าง Models ใหม่
- [ ] สร้าง Controllers ใหม่
- [ ] สร้าง Routes ใหม่ (/api/v2/*)
- [ ] แก้ Frontend ทีละส่วน
- [ ] ทดสอบจนแน่ใจ
- [ ] ตัด API เก่า

---

## 🎊 สรุป

**คำตอบ:** ใช่ ต้องแก้ API **แต่ไม่เยอะ!**

เพราะ:
- ✅ Database ใหม่มีตารางเก่าอยู่ (`fg`, `material`, `process_steps`)
- ✅ แค่เปลี่ยน `pool` → `newPool` ก็ใช้งานได้
- ✅ ค่อยๆ Migrate ทีละส่วน

**ง่ายสุด:** แก้ 1 บรรทัดใน `database.js`:
```javascript
pool: newPool  // ใช้ newPool เป็นค่าเริ่มต้น
```

**Happy Coding! 🚀**

