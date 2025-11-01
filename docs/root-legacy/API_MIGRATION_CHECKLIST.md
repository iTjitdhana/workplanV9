# 🔄 Checklist: API ที่ต้องแก้ไขเมื่อใช้ Database ใหม่

**วันที่:** 2025-10-20  
**Database:** esp_tracker → manufacturing_system

---

## 📊 สรุป: ต้องแก้ไขหรือไม่?

### ✅ คำตอบสั้นๆ: **ใช่ ต้องแก้!**

เพราะ:
1. ชื่อตารางเปลี่ยน (`fg` → `products`, `material` → `materials`)
2. ชื่อ field เปลี่ยน (`FG_Code` → `product_code`, `Mat_Id` → `material_code`)
3. โครงสร้างเปลี่ยน (`process_steps` → `process_templates` + `process_executions`)

---

## 📋 ตารางเปรียบเทียบโครงสร้าง

### 1. ตาราง Products/FG

| esp_tracker (เก่า) | manufacturing_system (ใหม่) | ต้องแก้ไข |
|--------------------|------------------------------|----------|
| **ตาราง:** `fg` | **ตาราง:** `products` | ✅ ใช่ |
| `FG_Code` | `product_code` | ✅ ใช่ |
| `FG_Name` | `product_name` | ✅ ใช่ |
| `FG_Unit` | - | ❌ ลบ |
| `FG_Size` | - | ❌ ลบ |
| `base_unit` | `unit` | ✅ ใช่ |
| - | `product_type` | ✅ ใหม่ |
| - | `category` | ✅ ใหม่ |
| - | `description` | ✅ ใหม่ |

**ตัวอย่างการแก้:**
```javascript
// ❌ เก่า
SELECT FG_Code, FG_Name FROM fg WHERE FG_Code = ?

// ✅ ใหม่
SELECT product_code, product_name FROM products WHERE product_code = ?
```

---

### 2. ตาราง Materials

| esp_tracker (เก่า) | manufacturing_system (ใหม่) | ต้องแก้ไข |
|--------------------|------------------------------|----------|
| **ตาราง:** `material` | **ตาราง:** `materials` | ✅ ใช่ |
| `Mat_Id` | `material_code` | ✅ ใช่ |
| `Mat_Name` | `material_name` | ✅ ใช่ |
| `Mat_Unit` | `unit` | ✅ ใช่ |
| `price` | `price` | ⭕ เหมือนเดิม |

**ตัวอย่างการแก้:**
```javascript
// ❌ เก่า
SELECT Mat_Id, Mat_Name FROM material WHERE Mat_Id = ?

// ✅ ใหม่
SELECT material_code, material_name FROM materials WHERE material_code = ?
```

---

### 3. ตาราง Process Steps → Process Templates ⭐ (เปลี่ยนแปลงมาก)

| esp_tracker (เก่า) | manufacturing_system (ใหม่) | หมายเหตุ |
|--------------------|------------------------------|----------|
| **ตาราง:** `process_steps` | **ตาราง:** `process_templates` | แม่แบบขั้นตอน |
| - | **ตาราง:** `process_executions` | บันทึกการทำงานจริง |
| `job_code` | `product_code` | ✅ เปลี่ยนชื่อ |
| `job_name` | - | ❌ ลบ (ใช้ products.product_name แทน) |
| `date_recorded` | - | ❌ ลบ (ไปอยู่ใน executions) |
| `worker_count` | `standard_worker_count` | ✅ เปลี่ยนชื่อ |
| `process_number` | `process_number` | ⭕ เหมือนเดิม |
| `process_description` | `process_description` | ⭕ เหมือนเดิม |
| - | `version` | ✅ ใหม่ (Version Control) |
| - | `estimated_duration_minutes` | ✅ ใหม่ |

**⚠️ แนวคิดใหม่:**
- `process_templates` = แม่แบบ/สูตร (ไม่ผูกกับวันที่)
- `process_executions` = การทำงานจริง (ผูกกับ work_plan_id + วันที่)

**ตัวอย่างการแก้:**
```javascript
// ❌ เก่า - ค้นหา process_steps
SELECT * FROM process_steps 
WHERE job_code = ? AND job_name = ?
ORDER BY process_number

// ✅ ใหม่ - ค้นหา template ล่าสุด (ใช้ View)
SELECT * FROM v_latest_process_templates
WHERE product_code = ?
ORDER BY process_number

// หรือ Query โดยตรง
SELECT * FROM process_templates
WHERE product_code = ? 
  AND is_active = 1
  AND version = (
    SELECT MAX(version) FROM process_templates 
    WHERE product_code = ? AND is_active = 1
  )
ORDER BY process_number
```

---

### 4. ตาราง Production Batches

| esp_tracker (เก่า) | manufacturing_system (ใหม่) | ต้องแก้ไข |
|--------------------|------------------------------|----------|
| `fg_code` | `product_code` | ✅ ใช่ |
| `batch_code` | `batch_code` | ⭕ เหมือนเดิม |
| `planned_qty` | `planned_qty` | ⭕ เหมือนเดิม |
| - | `unit` | ✅ ใหม่ |

**ตัวอย่างการแก้:**
```javascript
// ❌ เก่า
SELECT * FROM production_batches WHERE fg_code = ?

// ✅ ใหม่
SELECT * FROM production_batches WHERE product_code = ?
```

---

### 5. ตาราง Work Plans

| esp_tracker (เก่า) | manufacturing_system (ใหม่) | ต้องแก้ไข |
|--------------------|------------------------------|----------|
| `job_code` | `job_code` | ⭕ เหมือนเดิม |
| `job_name` | `job_name` | ⭕ เหมือนเดิม |
| - | `template_version` | ✅ ใหม่ |
| - | `created_by` | ✅ ใหม่ |
| `operators` (JSON) | - | ❌ ลบ (ใช้ตาราง work_plan_operators แทน) |

**ส่วนใหญ่เหมือนเดิม แต่มี field เพิ่ม**

---

## 🔍 ไฟล์ที่ต้องแก้ไข (ตามลำดับความสำคัญ)

### 🔴 ต้องแก้แน่นอน

| # | ไฟล์ | เหตุผล | ตารางที่ใช้ |
|---|------|--------|------------|
| 1 | `backend/models/ProcessStep.js` | ใช้ `process_steps` | ✅ ต้องแก้ |
| 2 | `backend/controllers/newJobsController.js` | ใช้ `process_steps` | ✅ ต้องแก้ |
| 3 | `backend/routes/processStepRoutes.js` | ใช้ `process_steps` | ✅ ต้องแก้ |

### 🟡 อาจต้องแก้ (ต้องตรวจสอบ)

| # | ไฟล์ | ต้องตรวจสอบ |
|---|------|-------------|
| 4 | `backend/controllers/workPlanController.js` | อาจมี JOIN กับ fg/material |
| 5 | `backend/routes/reportRoutes.js` | อาจมี JOIN กับ fg/material |
| 6 | `backend/routes/googleSheetProxy.js` | อาจดึงข้อมูล fg |
| 7 | Frontend API calls | ต้องแก้ถ้า response structure เปลี่ยน |

---

## 🛠️ แนวทางการแก้ไข

### Option 1: สร้าง Models ใหม่ (แนะนำ) ⭐

สร้าง Model ใหม่สำหรับ Database ใหม่:

```javascript
// backend/models/Product.js (ใหม่)
const { newPool } = require('../config/database');

class Product {
  static async getAll() {
    const [rows] = await newPool.query(`
      SELECT * FROM products WHERE is_active = 1
    `);
    return rows;
  }
  
  static async getByCode(productCode) {
    const [rows] = await newPool.query(`
      SELECT * FROM products WHERE product_code = ?
    `, [productCode]);
    return rows[0];
  }
  
  // ใช้ View สำเร็จรูป
  static async getLatestTemplates(productCode) {
    const [rows] = await newPool.query(`
      SELECT * FROM v_latest_process_templates
      WHERE product_code = ?
      ORDER BY process_number
    `, [productCode]);
    return rows;
  }
}

module.exports = Product;
```

```javascript
// backend/models/ProcessTemplate.js (ใหม่)
const { newPool } = require('../config/database');

class ProcessTemplate {
  static async getLatestByProduct(productCode) {
    // ใช้ View
    const [rows] = await newPool.query(`
      SELECT * FROM v_latest_process_templates
      WHERE product_code = ?
      ORDER BY process_number
    `, [productCode]);
    return rows;
  }
  
  static async create(templateData) {
    const { product_code, version, process_number, process_description, 
            standard_worker_count, estimated_duration_minutes } = templateData;
    
    const [result] = await newPool.query(`
      INSERT INTO process_templates 
      (product_code, version, process_number, process_description, 
       standard_worker_count, estimated_duration_minutes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [product_code, version, process_number, process_description, 
        standard_worker_count, estimated_duration_minutes]);
    
    return { id: result.insertId, ...templateData };
  }
}

module.exports = ProcessTemplate;
```

---

### Option 2: แก้ไข Model เดิม

แก้ไข `backend/models/ProcessStep.js`:

```javascript
const { newPool } = require('../config/database'); // เปลี่ยนจาก pool

class ProcessStep {
  // แก้จาก process_steps → process_templates
  static async getAll(filters = {}) {
    let query = `
      SELECT * FROM v_latest_process_templates
    `;
    
    const params = [];
    const conditions = [];
    
    if (filters.product_code) {
      conditions.push('product_code = ?');
      params.push(filters.product_code);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY product_code, process_number';
    
    const [rows] = await newPool.execute(query, params);
    return rows;
  }
  
  // ... ส่วนอื่นๆ
}
```

---

## 📊 ตารางเปรียบเทียบ Query

### Query 1: ดึงรายการสินค้า

```sql
-- ❌ เก่า (esp_tracker)
SELECT FG_Code, FG_Name, FG_Unit, FG_Size 
FROM fg 
ORDER BY FG_Name

-- ✅ ใหม่ (manufacturing_system)
SELECT product_code, product_name, unit, product_type, category
FROM products 
WHERE is_active = 1
ORDER BY product_name
```

### Query 2: ดึง Process Steps/Templates

```sql
-- ❌ เก่า (esp_tracker)
SELECT * FROM process_steps
WHERE job_code = 'PRD001' AND job_name = 'ข้าวผัดกุ้ง'
ORDER BY process_number

-- ✅ ใหม่ (manufacturing_system) - ใช้ View
SELECT * FROM v_latest_process_templates
WHERE product_code = 'PRD001'
ORDER BY process_number

-- หรือ Query โดยตรง
SELECT * FROM process_templates
WHERE product_code = 'PRD001'
  AND is_active = 1
  AND version = (SELECT MAX(version) FROM process_templates WHERE product_code = 'PRD001')
ORDER BY process_number
```

### Query 3: ดึง BOM (Bill of Materials)

```sql
-- ❌ เก่า (esp_tracker)
SELECT 
  b.FG_Code,
  b.Raw_Code,
  b.Raw_Qty,
  b.Raw_Unit,
  m.Mat_Name,
  m.price
FROM fg_bom b
JOIN material m ON b.Raw_Code = m.Mat_Id
WHERE b.FG_Code = 'PRD001'

-- ✅ ใหม่ (manufacturing_system)
SELECT 
  pb.product_code,
  pb.material_code,
  pb.quantity,
  pb.unit,
  m.material_name,
  m.price
FROM product_bom pb
JOIN materials m ON pb.material_code = m.material_code
WHERE pb.product_code = 'PRD001'
```

### Query 4: ดึง Work Plans พร้อม Product Info

```sql
-- ❌ เก่า (esp_tracker)
SELECT 
  wp.*,
  fg.FG_Name
FROM work_plans wp
LEFT JOIN fg ON wp.job_code = fg.FG_Code

-- ✅ ใหม่ (manufacturing_system)
SELECT 
  wp.*,
  p.product_name,
  p.product_type,
  p.category
FROM work_plans wp
LEFT JOIN products p ON wp.job_code = p.product_code
WHERE p.is_active = 1
```

### Query 5: Production Batches

```sql
-- ❌ เก่า (esp_tracker)
SELECT * FROM production_batches
WHERE fg_code = 'PRD001'

-- ✅ ใหม่ (manufacturing_system)
SELECT * FROM production_batches
WHERE product_code = 'PRD001'
```

---

## 🔴 ไฟล์ที่ต้องแก้แน่นอน (3 ไฟล์)

### 1. `backend/models/ProcessStep.js`

**ปัญหา:**
- ใช้ตาราง `process_steps` (ไม่มีในระบบใหม่)
- ต้องเปลี่ยนเป็น `process_templates` หรือ `v_latest_process_templates`

**แนวทางแก้:**
```javascript
// เปลี่ยนจาก
const { pool } = require('../config/database');

// เป็น
const { newPool } = require('../config/database');

// เปลี่ยน Query ทั้งหมดจาก process_steps → process_templates
```

---

### 2. `backend/controllers/newJobsController.js`

**ปัญหา:**
- Query ตาราง `process_steps` ที่บรรทัด 45, 108, 118, 165
- ใช้ `pool` แทน `newPool`

**แนวทางแก้:**
```javascript
// เปลี่ยนจาก
const { pool } = require('../config/database');

// เป็น
const { newPool } = require('../config/database');

// แก้ไข Query:
// เก่า: FROM process_steps
// ใหม่: FROM process_templates
```

---

### 3. `backend/routes/processStepRoutes.js`

**ปัญหา:**
- Query ตาราง `process_steps` ที่บรรทัด 22
- ใช้ `pool` แทน `newPool`

**แนวทางแก้:**
```javascript
// เปลี่ยน pool → newPool
// เปลี่ยน process_steps → process_templates หรือ v_latest_process_templates
```

---

## ⚠️ สิ่งที่ต้องระวัง

### 1. **process_steps → process_templates + process_executions**

ในระบบใหม่:
- `process_templates` = แม่แบบขั้นตอน (ไม่ผูกกับวันที่)
- `process_executions` = บันทึกการทำงานจริง (ผูกกับ work_plan_id)

**ตัวอย่าง:**
```javascript
// ดึง Template (แม่แบบ)
const [templates] = await newPool.query(`
  SELECT * FROM v_latest_process_templates
  WHERE product_code = ?
`, [productCode]);

// บันทึกการทำงานจริง
const [executions] = await newPool.query(`
  SELECT * FROM process_executions
  WHERE work_plan_id = ?
  ORDER BY process_number
`, [workPlanId]);
```

### 2. **Generated Columns**

ตาราง `process_executions` มี `duration_minutes` ที่คำนวณอัตโนมัติ:
```javascript
// ❌ ห้าม INSERT duration_minutes
INSERT INTO process_executions (duration_minutes, ...) VALUES (60, ...)

// ✅ ให้ระบบคำนวณเอง
INSERT INTO process_executions (start_time, end_time, ...) VALUES (...)
// duration_minutes จะถูกคำนวณจาก TIMESTAMPDIFF(MINUTE, start_time, end_time)
```

### 3. **Triggers**

ระบบใหม่มี Triggers:
- สร้าง Work Plan → สร้าง Process Executions อัตโนมัติ
- แก้ Template → บันทึก History อัตโนมัติ

---

## 📝 สรุปการเปลี่ยนแปลง API

### ตัวอย่างที่ 1: API ดึงสินค้า

**เก่า:**
```javascript
GET /api/products
Response: [
  {
    id: 1,
    FG_Code: "PRD001",
    FG_Name: "ข้าวผัดกุ้ง",
    FG_Unit: "แพ็ค",
    FG_Size: "500g",
    base_unit: "กก."
  }
]
```

**ใหม่:**
```javascript
GET /api/products
Response: [
  {
    id: 1,
    product_code: "PRD001",
    product_name: "ข้าวผัดกุ้ง",
    product_type: "FG",
    category: "อาหารสำเร็จรูป",
    unit: "กก.",
    description: "Size: 500g, Unit: แพ็ค",
    is_active: 1
  }
]
```

**ผลกระทบ Frontend:**
```javascript
// ❌ เก่า
products.map(p => p.FG_Name)

// ✅ ใหม่
products.map(p => p.product_name)
```

---

### ตัวอย่างที่ 2: API ดึง Process Steps

**เก่า:**
```javascript
GET /api/process-steps?job_code=PRD001
Response: [
  {
    id: 1,
    job_code: "PRD001",
    job_name: "ข้าวผัดกุ้ง",
    date_recorded: "2025-10-09",
    worker_count: 2,
    process_number: 1,
    process_description: "เตรียมวัตถุดิบ"
  }
]
```

**ใหม่:**
```javascript
GET /api/process-templates?product_code=PRD001
Response: [
  {
    id: 1,
    product_code: "PRD001",
    product_name: "ข้าวผัดกุ้ง",
    version: 2,
    process_number: 1,
    process_description: "เตรียมวัตถุดิบ",
    standard_worker_count: 2,
    estimated_duration_minutes: 30,
    is_active: 1
  }
]
```

**ผลกระทบ Frontend:**
```typescript
// ❌ เก่า
interface ProcessStep {
  job_code: string;
  job_name: string;
  worker_count: number;
}

// ✅ ใหม่
interface ProcessTemplate {
  product_code: string;
  product_name: string;
  version: number;
  standard_worker_count: number;
}
```

---

## ✅ Action Plan

### Step 1: สร้าง Models ใหม่
- [ ] `backend/models/Product.js` (แทน fg)
- [ ] `backend/models/Material.js` (ใช้ newPool)
- [ ] `backend/models/ProcessTemplate.js` (แทน ProcessStep)
- [ ] `backend/models/ProcessExecution.js` (ใหม่)

### Step 2: สร้าง Controllers ใหม่
- [ ] `backend/controllers/productController.js`
- [ ] `backend/controllers/processTemplateController.js`
- [ ] `backend/controllers/processExecutionController.js`

### Step 3: สร้าง Routes ใหม่
- [ ] `backend/routes/productRoutes.js`
- [ ] `backend/routes/processTemplateRoutes.js`

### Step 4: แก้ไข Frontend
- [ ] อัพเดท API calls
- [ ] เปลี่ยน field names (FG_Code → product_code)
- [ ] อัพเดท TypeScript interfaces

---

## 🎯 สรุป

### ❓ ต้องแก้ API หรือไม่?

**คำตอบ:** ✅ **ใช่ ต้องแก้!**

**แต่:** คุณมี 2 ทางเลือก:

### 🔵 Option A: ใช้ทั้ง 2 Database พร้อมกัน (แนะนำ)

- API เก่ายังใช้ `pool` + `process_steps` ได้ (esp_tracker)
- API ใหม่ใช้ `newPool` + `process_templates` (manufacturing_system)
- Migrate ทีละส่วน ไม่กระทบระบบเดิม

**ข้อดี:**
- ✅ ไม่กระทบระบบที่ใช้งานอยู่
- ✅ Migrate ทีละส่วนได้
- ✅ Rollback ง่าย

### 🆕 Option B: เปลี่ยนไปใช้ Database ใหม่ทั้งหมด

- แก้ไข Model/Controller ทั้งหมด
- เปลี่ยน `pool` → `newPool`
- เปลี่ยนชื่อตาราง + field ทั้งหมด

**ข้อดี:**
- ✅ ใช้ฟีเจอร์ใหม่ได้เต็มที่ (Version Control, Audit Trail)
- ✅ โครงสร้างดีกว่า

**ข้อเสีย:**
- ❌ ต้องแก้ไขเยอะ
- ❌ ต้อง Test ทุก API
- ❌ Frontend ต้องแก้ด้วย

---

## 📋 รายการไฟล์ที่ต้องแก้ (ถ้าเลือก Option B)

### Backend

| ไฟล์ | ต้องแก้ | เหตุผล |
|------|---------|--------|
| `models/ProcessStep.js` | ✅ ใช่ | ใช้ process_steps |
| `controllers/newJobsController.js` | ✅ ใช่ | ใช้ process_steps |
| `routes/processStepRoutes.js` | ✅ ใช่ | ใช้ process_steps |
| `controllers/workPlanController.js` | ⚠️ อาจต้อง | ตรวจสอบ JOIN กับ fg |
| `routes/reportRoutes.js` | ⚠️ อาจต้อง | ตรวจสอบ Query |
| `routes/googleSheetProxy.js` | ⚠️ อาจต้อง | อาจดึง fg_bom |

### Frontend (ถ้า Response เปลี่ยน)

| Component/Page | ต้องแก้ | Field ที่เปลี่ยน |
|----------------|---------|-----------------|
| Job Search | ✅ ใช่ | `FG_Code` → `product_code` |
| Process Steps | ✅ ใช่ | `job_code` → `product_code` |
| Production Planning | ⚠️ อาจต้อง | ขึ้นอยู่กับ API ที่ใช้ |
| BOM Display | ✅ ใช่ | `Mat_Id` → `material_code` |

---

## 💡 คำแนะนำ

### แนะนำ: เริ่มจาก Option A

1. **ใช้ทั้ง 2 Database พร้อมกัน** (ทำแล้ว ✅)
2. **สร้าง API ใหม่สำหรับ manufacturing_system**
3. **ทดสอบ API ใหม่ให้แน่ใจ**
4. **ค่อยๆ Migrate Frontend** ทีละส่วน
5. **เมื่อแน่ใจแล้ว ค่อยตัด esp_tracker**

---

## 🧪 ทดสอบว่า API เดิมยังใช้งานได้ไหม

```bash
cd backend
npm run dev

# ทดสอบ API เดิม (ยังใช้ esp_tracker)
curl http://localhost:3101/api/process-steps?job_code=PRD001
curl http://localhost:3101/api/new-jobs
curl http://localhost:3101/api/work-plans

# ควรยังทำงานได้ปกติ ✅
```

---

**ต้องการให้ฉันช่วยสร้าง Models/Controllers ใหม่สำหรับ manufacturing_system ไหมครับ? 🚀**

