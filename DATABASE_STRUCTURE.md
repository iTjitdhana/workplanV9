# 📊 เอกสารโครงสร้าง Database ระบบจัดการกระบวนการผลิต

## 🎯 ภาพรวมระบบ

Database `manufacturing_system` เป็นฐานข้อมูลหลักสำหรับระบบจัดการกระบวนการผลิต ที่ออกแบบมาเพื่อจัดการข้อมูลการผลิตแบบครบวงจร ตั้งแต่การวางแผนการผลิต การบันทึกขั้นตอนการทำงาน ไปจนถึงการติดตามผลและวิเคราะห์ประสิทธิภาพ

### 🔄 การเปลี่ยนแปลงจากระบบเดิม

- **ระบบเดิม (esp_tracker)**: เก็บข้อมูลแบบ flat structure โดยใช้ตาราง `process_steps` บันทึกข้อมูลการผลิตแบบรายวัน
- **ระบบใหม่ (manufacturing_system)**: แยกข้อมูลเป็นชั้นๆ โดยใช้ Template-Based Architecture
  - มี **Process Templates** เป็นแม่แบบขั้นตอนการผลิต
  - มี **Process Executions** เป็นการบันทึกการทำงานจริง
  - รองรับการจัดการเวอร์ชันของขั้นตอนการผลิต

---

## 📋 โครงสร้างตาราง

### 🏗️ กลุ่มตารางพื้นฐาน (Base Tables)

#### 1. `users` - ตารางข้อมูลพนักงาน

**วัตถุประสงค์**: เก็บข้อมูลพนักงานทั้งหมดในระบบ

**โครงสร้าง**:
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_code VARCHAR(50) NOT NULL UNIQUE,      -- รหัสพนักงาน
  name VARCHAR(100) NOT NULL,               -- ชื่อ-นามสกุล
  email VARCHAR(100),                       -- อีเมล
  phone VARCHAR(20),                        -- เบอร์โทร
  position VARCHAR(50),                     -- ตำแหน่ง
  department VARCHAR(50),                   -- แผนก
  is_active BOOLEAN DEFAULT TRUE,           -- สถานะการทำงาน
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**ดัชนีสำคัญ**:
- `unique_id_code` - ป้องกันรหัสพนักงานซ้ำ
- `idx_name` - ค้นหาตามชื่อ
- `idx_department` - กรองตามแผนก
- `idx_active` - กรองพนักงานที่ยังทำงาน

**ข้อควรระวัง**:
⚠️ ห้ามลบพนักงานออกจากระบบโดยตรง ให้เปลี่ยน `is_active = FALSE` แทน เพื่อรักษาข้อมูลประวัติการทำงาน

---

#### 2. `machines` - ตารางข้อมูลเครื่องจักร

**วัตถุประสงค์**: เก็บข้อมูลเครื่องจักรและอุปกรณ์ที่ใช้ในการผลิต

**โครงสร้าง**:
```sql
CREATE TABLE machines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  machine_code VARCHAR(50) NOT NULL UNIQUE, -- รหัสเครื่อง
  machine_name VARCHAR(100) NOT NULL,       -- ชื่อเครื่อง
  machine_type VARCHAR(50) NOT NULL,        -- ประเภทเครื่อง (Mixer, Packing, etc.)
  location VARCHAR(100),                    -- ตำแหน่งที่ตั้ง
  status ENUM('active','inactive','maintenance'), -- สถานะ
  description TEXT,                         -- รายละเอียด
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**ค่า status ที่ใช้**:
- `active` - เครื่องพร้อมใช้งาน
- `inactive` - เครื่องไม่พร้อมใช้งาน
- `maintenance` - อยู่ระหว่างซ่อมบำรุง

**ข้อควรระวัง**:
⚠️ ตรวจสอบ `status` ก่อนกำหนดเครื่องให้กับแผนการผลิต เพื่อหลีกเลี่ยงการใช้เครื่องที่ไม่พร้อม

---

#### 3. `production_rooms` - ตารางข้อมูลห้องผลิต

**วัตถุประสงค์**: เก็บข้อมูลห้องผลิตและพื้นที่การทำงาน

**โครงสร้าง**:
```sql
CREATE TABLE production_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_code VARCHAR(50) NOT NULL UNIQUE,    -- รหัสห้อง
  room_name VARCHAR(100) NOT NULL,          -- ชื่อห้อง
  room_type ENUM('hot_kitchen','cold_kitchen','prep_area','storage','packing','other'),
  capacity INT,                             -- ความจุ (จำนวนคน)
  location VARCHAR(100),                    -- ตำแหน่งที่ตั้ง
  status ENUM('active','inactive','maintenance'),
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**ประเภทห้อง (room_type)**:
- `hot_kitchen` - ห้องครัวร้อน (ปรุงอาหารร้อน)
- `cold_kitchen` - ห้องครัวเย็น (ปรุงอาหารเย็น)
- `prep_area` - ห้องเตรียมวัตถุดิบ
- `storage` - ห้องเก็บของ
- `packing` - ห้องบรรจุ
- `other` - อื่นๆ

**ข้อควรระวัง**:
⚠️ ตรวจสอบ `capacity` เมื่อจัดสรรพนักงาน เพื่อไม่ให้เกินความจุของห้อง

---

#### 4. `production_statuses` - ตารางสถานะการผลิต

**วัตถุประสงค์**: กำหนดสถานะต่างๆ ที่ใช้ในระบบการผลิต

**โครงสร้าง**:
```sql
CREATE TABLE production_statuses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,               -- ชื่อสถานะ
  description TEXT,                         -- คำอธิบาย
  color VARCHAR(7) NOT NULL,                -- รหัสสี Hex (#RRGGBB)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**สถานะเริ่มต้นในระบบ**:
1. รอดำเนินการ (#FFC107 - สีเหลือง)
2. กำลังผลิต (#2196F3 - สีน้ำเงิน)
3. เสร็จสิ้น (#4CAF50 - สีเขียว)
4. ยกเลิก (#F44336 - สีแดง)
5. หยุดชั่วคราว (#FF9800 - สีส้ม)

---

### 🏭 กลุ่มตารางหลัก (Main Tables)

#### 5. `products` - ตารางข้อมูลสินค้า

**วัตถุประสงค์**: เก็บข้อมูลสินค้าและผลิตภัณฑ์ทั้งหมด

**โครงสร้าง**:
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(20) NOT NULL UNIQUE, -- รหัสสินค้า
  product_name VARCHAR(100) NOT NULL,       -- ชื่อสินค้า
  product_type ENUM('FG','Semi-FG','Component'), -- ประเภท
  category VARCHAR(50),                     -- หมวดหมู่
  description TEXT,                         -- รายละเอียด
  unit VARCHAR(20),                         -- หน่วย
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,                           -- ผู้สร้าง
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
)
```

**ประเภทสินค้า (product_type)**:
- `FG` (Finished Goods) - สินค้าสำเร็จรูป
- `Semi-FG` (Semi-Finished Goods) - กึ่งสำเร็จรูป
- `Component` - ส่วนประกอบ

**ความสัมพันธ์**:
- เชื่อมกับ `users` ผ่าน `created_by` (ผู้สร้างข้อมูลสินค้า)
- ถูกอ้างอิงโดย `process_templates`, `production_batches`, `process_executions`

**ข้อควรระวัง**:
⚠️ `product_code` ต้องไม่ซ้ำและห้ามเปลี่ยนแปลงหลังจากมีการใช้งาน เพราะจะส่งผลกระทบต่อข้อมูลประวัติทั้งหมด

---

#### 6. `work_plans` - ตารางแผนการผลิต

**วัตถุประสงค์**: เก็บแผนการผลิตรายวัน

**โครงสร้าง**:
```sql
CREATE TABLE work_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  production_date DATE NOT NULL,            -- วันที่ผลิต
  job_code VARCHAR(50) NOT NULL,            -- รหัสงาน
  job_name VARCHAR(255),                    -- ชื่องาน
  start_time TIME,                          -- เวลาเริ่ม
  end_time TIME,                            -- เวลาสิ้นสุด
  status_id INT DEFAULT 1,                  -- สถานะ
  machine_id INT,                           -- เครื่องจักร
  production_room_id INT,                   -- ห้องผลิต
  notes TEXT,                               -- หมายเหตุ
  is_special BOOLEAN DEFAULT FALSE,         -- งานพิเศษ
  created_by INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (status_id) REFERENCES production_statuses(id),
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  FOREIGN KEY (production_room_id) REFERENCES production_rooms(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
)
```

**ความสัมพันธ์**:
- เชื่อมกับ `production_statuses` ผ่าน `status_id`
- เชื่อมกับ `machines` ผ่าน `machine_id`
- เชื่อมกับ `production_rooms` ผ่าน `production_room_id`
- เชื่อมกับ `users` ผ่าน `created_by`

**ดัชนีสำคัญ**:
- `idx_production_date` - ค้นหาตามวันที่
- `idx_date_status` - ค้นหาตามวันที่และสถานะ (Composite Index)

**ข้อควรระวัง**:
⚠️ เมื่อสร้าง Work Plan ใหม่ ระบบจะสร้าง Process Executions อัตโนมัติผ่าน Trigger `after_work_plan_insert`
⚠️ ถ้า `job_code` ไม่มี Process Template ระบบจะไม่สร้าง Process Executions

---

#### 7. `production_batches` - ตารางล็อตการผลิต

**วัตถุประสงค์**: เก็บข้อมูลล็อตการผลิตแต่ละครั้ง

**โครงสร้าง**:
```sql
CREATE TABLE production_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_plan_id INT NOT NULL,                -- อ้างอิงแผนการผลิต
  batch_code VARCHAR(50) NOT NULL,          -- รหัสล็อต
  product_code VARCHAR(20) NOT NULL,        -- รหัสสินค้า
  planned_qty DECIMAL(10,2) NOT NULL,       -- ปริมาณตามแผน
  actual_qty DECIMAL(10,2),                 -- ปริมาณจริง
  unit VARCHAR(20),                         -- หน่วย
  start_time DATETIME NOT NULL,             -- เวลาเริ่มต้น
  end_time DATETIME,                        -- เวลาเสร็จสิ้น
  status ENUM('preparing','producing','completed','cancelled'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (work_plan_id) REFERENCES work_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (product_code) REFERENCES products(product_code)
)
```

**สถานะล็อต (status)**:
- `preparing` - กำลังเตรียมการ
- `producing` - กำลังผลิต
- `completed` - เสร็จสิ้น
- `cancelled` - ยกเลิก

**ความสัมพันธ์**:
- เชื่อมกับ `work_plans` ผ่าน `work_plan_id` (ON DELETE CASCADE)
- เชื่อมกับ `products` ผ่าน `product_code`
- ถูกอ้างอิงโดย `process_executions`, `batch_material_usage`, `batch_production_results`

**ข้อควรระวัง**:
⚠️ การลบ Work Plan จะลบ Production Batches ที่เกี่ยวข้องทั้งหมด (CASCADE DELETE)
⚠️ `batch_code` ควรมีรูปแบบที่ชัดเจน เช่น `BATCH-YYYYMMDD-XXX`

---

#### 8. `process_templates` - ตารางเทมเพลตขั้นตอนการผลิต ⭐

**วัตถุประสงค์**: เก็บแม่แบบขั้นตอนการผลิตของแต่ละสินค้า (สูตรการผลิต)

**โครงสร้าง**:
```sql
CREATE TABLE process_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(20) NOT NULL,        -- รหัสสินค้า
  version INT DEFAULT 1,                    -- เวอร์ชันของสูตร
  process_number INT NOT NULL,              -- ลำดับขั้นตอน (1, 2, 3, ...)
  process_description VARCHAR(200) NOT NULL, -- รายละเอียดขั้นตอน
  standard_worker_count INT,                -- จำนวนคนมาตรฐาน
  estimated_duration_minutes INT,           -- เวลาประมาณการ (นาที)
  required_machine_type VARCHAR(50),        -- ประเภทเครื่องที่ต้องใช้
  required_room_type VARCHAR(50),           -- ประเภทห้องที่ต้องการ
  required_skills TEXT,                     -- ทักษะที่ต้องการ
  notes TEXT,                               -- หมายเหตุ
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (product_code) REFERENCES products(product_code) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_product_version_step (product_code, version, process_number)
)
```

**แนวคิดการใช้งาน**:
- เก็บ "สูตร" หรือ "แม่แบบ" การผลิตของแต่ละสินค้า
- รองรับการจัดการเวอร์ชัน (Version Control) เมื่อมีการปรับปรุงขั้นตอน
- แต่ละสินค้าสามารถมีหลายเวอร์ชันได้ แต่จะใช้งานเฉพาะเวอร์ชันล่าสุดที่ `is_active = TRUE`

**ตัวอย่าง**:
```
สินค้า: ข้าวผัดกุ้ง (PRD001)
Version 1.0:
  1. เตรียมวัตถุดิบ (10 นาที, 2 คน)
  2. ผัดข้าว (15 นาที, 1 คน)
  3. บรรจุ (5 นาที, 2 คน)

Version 2.0 (ปรับปรุง):
  1. เตรียมวัตถุดิบ (10 นาที, 2 คน)
  2. ล้างวัตถุดิบ (5 นาที, 1 คน) ← ขั้นตอนใหม่
  3. ผัดข้าว (12 นาที, 1 คน) ← ลดเวลาลง
  4. บรรจุ (5 นาที, 2 คน)
```

**ดัชนีสำคัญ**:
- `unique_product_version_step` - ป้องกันขั้นตอนซ้ำในเวอร์ชันเดียวกัน
- `idx_product_version` - ค้นหาเวอร์ชันของสินค้า

**ความสัมพันธ์**:
- เชื่อมกับ `products` ผ่าน `product_code` (ON DELETE CASCADE)
- เชื่อมกับ `users` ผ่าน `created_by`
- ถูกอ้างอิงโดย `process_executions`, `process_template_history`

**ข้อควรระวัง**:
⚠️ ห้ามแก้ไข Template ที่มีการใช้งานแล้ว ให้สร้าง Version ใหม่แทน
⚠️ การลบ Product จะลบ Templates ทั้งหมดของสินค้านั้น (CASCADE DELETE)
⚠️ เมื่อสร้างหรืออัปเดต Template จะมีการบันทึกประวัติใน `process_template_history` อัตโนมัติ

---

#### 9. `process_executions` - ตารางบันทึกการทำงานจริง ⭐

**วัตถุประสงค์**: บันทึกการทำงานจริงของแต่ละขั้นตอนในการผลิต

**โครงสร้าง**:
```sql
CREATE TABLE process_executions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_plan_id INT,                         -- อ้างอิงแผนการผลิต
  batch_id INT,                             -- อ้างอิงล็อตการผลิต
  template_id INT NOT NULL,                 -- อ้างอิง Template
  product_code VARCHAR(20) NOT NULL,        -- รหัสสินค้า
  process_number INT NOT NULL,              -- ลำดับขั้นตอน
  process_description VARCHAR(200) NOT NULL, -- รายละเอียด
  actual_worker_count INT,                  -- จำนวนคนจริง
  start_time DATETIME,                      -- เวลาเริ่มจริง
  end_time DATETIME,                        -- เวลาเสร็จจริง
  duration_minutes INT GENERATED ALWAYS AS (
    TIMESTAMPDIFF(MINUTE, start_time, end_time)
  ) STORED,                                 -- เวลาที่ใช้ (คำนวณอัตโนมัติ)
  status ENUM('pending','in_progress','completed','skipped','paused'),
  machine_id INT,                           -- เครื่องที่ใช้
  production_room_id INT,                   -- ห้องที่ทำ
  notes TEXT,                               -- หมายเหตุ
  issues TEXT,                              -- ปัญหาที่พบ
  recorded_by INT,                          -- ผู้บันทึก
  recorded_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (work_plan_id) REFERENCES work_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (template_id) REFERENCES process_templates(id),
  FOREIGN KEY (product_code) REFERENCES products(product_code),
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
  FOREIGN KEY (production_room_id) REFERENCES production_rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
)
```

**สถานะขั้นตอน (status)**:
- `pending` - รอดำเนินการ
- `in_progress` - กำลังทำ
- `completed` - เสร็จสิ้น
- `skipped` - ข้าม
- `paused` - หยุดชั่วคราว

**Generated Column**:
- `duration_minutes` คำนวณอัตโนมัติจาก `start_time` และ `end_time`
- ไม่สามารถ INSERT/UPDATE ค่านี้ได้โดยตรง

**ความสัมพันธ์**:
- เชื่อมกับ `work_plans` ผ่าน `work_plan_id` (ON DELETE CASCADE)
- เชื่อมกับ `production_batches` ผ่าน `batch_id`
- เชื่อมกับ `process_templates` ผ่าน `template_id`
- เชื่อมกับ `products` ผ่าน `product_code`
- ถูกอ้างอิงโดย `process_execution_operators`

**ข้อควรระวัง**:
⚠️ `duration_minutes` คำนวณอัตโนมัติ ห้าม INSERT/UPDATE โดยตรง
⚠️ ต้องกรอก `start_time` และ `end_time` เพื่อให้คำนวณระยะเวลาได้
⚠️ การลบ Work Plan จะลบ Executions ทั้งหมด (CASCADE DELETE)

**ตัวอย่างการใช้งาน**:
```sql
-- สร้างขั้นตอนการทำงาน
INSERT INTO process_executions 
  (work_plan_id, template_id, product_code, process_number, 
   process_description, status)
VALUES 
  (123, 456, 'PRD001', 1, 'เตรียมวัตถุดิบ', 'pending');

-- เริ่มทำงาน
UPDATE process_executions 
SET status = 'in_progress', start_time = NOW()
WHERE id = 789;

-- เสร็จสิ้นงาน
UPDATE process_executions 
SET status = 'completed', end_time = NOW()
WHERE id = 789;
-- duration_minutes จะถูกคำนวณอัตโนมัติ
```

---

#### 10. `process_execution_operators` - ตารางผู้ปฏิบัติงาน

**วัตถุประสงค์**: เก็บข้อมูลพนักงานที่เข้าร่วมทำงานในแต่ละขั้นตอน

**โครงสร้าง**:
```sql
CREATE TABLE process_execution_operators (
  id INT PRIMARY KEY AUTO_INCREMENT,
  execution_id INT NOT NULL,                -- อ้างอิง process_executions
  user_id INT NOT NULL,                     -- รหัสพนักงาน
  role ENUM('operator','supervisor','qa','helper'),
  added_at TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES process_executions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_execution_user (execution_id, user_id)
)
```

**บทบาท (role)**:
- `operator` - ผู้ปฏิบัติงาน
- `supervisor` - หัวหน้างาน/ผู้ดูแล
- `qa` - QC/QA ตรวจสอบคุณภาพ
- `helper` - ผู้ช่วยงาน

**ข้อควรระวัง**:
⚠️ พนักงานคนเดียวกันไม่สามารถอยู่ในขั้นตอนเดียวกันได้ซ้ำ (UNIQUE constraint)
⚠️ การลบ Execution จะลบข้อมูลผู้ปฏิบัติงานทั้งหมด (CASCADE DELETE)

---

#### 11. `process_template_history` - ตารางประวัติการแก้ไขเทมเพลต

**วัตถุประสงค์**: เก็บประวัติการเปลี่ยนแปลงของ Process Templates

**โครงสร้าง**:
```sql
CREATE TABLE process_template_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(20) NOT NULL,
  version INT NOT NULL,
  change_type ENUM('created','updated','deactivated','deleted'),
  changed_by INT,
  changed_at TIMESTAMP,
  change_note TEXT,
  old_data JSON,                            -- ข้อมูลเดิม (JSON)
  new_data JSON,                            -- ข้อมูลใหม่ (JSON)
  FOREIGN KEY (product_code) REFERENCES products(product_code) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
)
```

**ประเภทการเปลี่ยนแปลง (change_type)**:
- `created` - สร้างใหม่
- `updated` - แก้ไข
- `deactivated` - ปิดการใช้งาน
- `deleted` - ลบ

**ข้อมูล JSON**:
- `old_data` และ `new_data` เก็บข้อมูลในรูปแบบ JSON เพื่อให้เห็นการเปลี่ยนแปลง

**ข้อควรระวัง**:
⚠️ ตารางนี้ถูกสร้างอัตโนมัติโดย Triggers ห้าม INSERT โดยตรง
⚠️ ใช้สำหรับตรวจสอบประวัติและ Audit Trail เท่านั้น

---

### 🔍 กลุ่ม Views (มุมมองข้อมูล)

#### View 1: `v_latest_process_templates`

**วัตถุประสงค์**: แสดงเฉพาะ Template เวอร์ชันล่าสุดของแต่ละสินค้า

**การใช้งาน**:
```sql
-- ดูเทมเพลตล่าสุดทั้งหมด
SELECT * FROM v_latest_process_templates;

-- ดูเทมเพลตของสินค้าที่ระบุ
SELECT * FROM v_latest_process_templates 
WHERE product_code = 'PRD001';
```

**ข้อดี**:
✅ ไม่ต้อง JOIN หลายตาราง
✅ เลือกเฉพาะ version ล่าสุดอัตโนมัติ
✅ รวมข้อมูลสินค้าและผู้สร้างไว้แล้ว

---

#### View 2: `v_process_execution_summary`

**วัตถุประสงค์**: สรุปข้อมูลการทำงานพร้อมการคำนวณประสิทธิภาพ

**ฟีเจอร์เด่น**:
- คำนวณ `efficiency_percent` (เปอร์เซ็นต์ประสิทธิภาพ)
- แสดง `time_status` (On Time / Delayed)
- รวมรายชื่อผู้ปฏิบัติงาน (operators)
- แสดงข้อมูลเครื่องจักรและห้องผลิต

**การใช้งาน**:
```sql
-- ดูการทำงานทั้งหมด
SELECT * FROM v_process_execution_summary;

-- ดูการทำงานที่เกินเวลา
SELECT * FROM v_process_execution_summary 
WHERE time_status = 'Delayed';

-- ดูการทำงานของวันที่ระบุ
SELECT * FROM v_process_execution_summary 
WHERE production_date = '2025-10-09';
```

---

#### View 3: `v_product_process_statistics`

**วัตถุประสงค์**: สถิติโดยรวมของแต่ละสินค้า

**ข้อมูลที่แสดง**:
- จำนวนขั้นตอนทั้งหมด
- เวอร์ชันล่าสุด
- เวลาประมาณการทั้งหมด
- จำนวนครั้งที่ผลิต
- ระยะเวลาเฉลี่ยจริง
- วันที่ผลิตครั้งแรก/ล่าสุด
- จำนวนตามสถานะ (completed, in_progress, pending)

**การใช้งาน**:
```sql
-- ดูสถิติทั้งหมด
SELECT * FROM v_product_process_statistics;

-- ดูสินค้าที่มีการผลิตมากที่สุด
SELECT * FROM v_product_process_statistics 
ORDER BY total_executions DESC;
```

---

### ⚙️ Triggers (กลไกอัตโนมัติ)

#### Trigger 1: `after_process_template_insert`

**เหตุการณ์**: หลังจาก INSERT ข้อมูลลงใน `process_templates`

**การทำงาน**:
- บันทึกประวัติการสร้างลงใน `process_template_history`
- เก็บข้อมูลเป็น JSON

**ประโยชน์**:
✅ ติดตามประวัติการสร้าง Template
✅ ไม่ต้องเขียน Code เพิ่มเติม

---

#### Trigger 2: `after_process_template_update`

**เหตุการณ์**: หลังจาก UPDATE ข้อมูลใน `process_templates`

**การทำงาน**:
- ตรวจสอบว่าเป็นการปิดการใช้งาน (deactivated) หรือแก้ไข (updated)
- บันทึกข้อมูลเดิมและใหม่ในรูป JSON

**ประโยชน์**:
✅ เห็นการเปลี่ยนแปลงทุกครั้ง
✅ ใช้สำหรับ Audit Trail

---

#### Trigger 3: `after_work_plan_insert`

**เหตุการณ์**: หลังจาก INSERT ข้อมูลลงใน `work_plans`

**การทำงาน**:
1. ค้นหา Template เวอร์ชันล่าสุดของสินค้า (`job_code`)
2. สร้าง `process_executions` อัตโนมัติตาม Template
3. กำหนดสถานะเริ่มต้นเป็น `pending`

**ตัวอย่าง**:
```
สร้าง Work Plan:
  job_code = "PRD001" (ข้าวผัดกุ้ง)

Trigger จะสร้าง Process Executions:
  1. เตรียมวัตถุดิบ (pending)
  2. ผัดข้าว (pending)
  3. บรรจุ (pending)
```

**ข้อควรระวัง**:
⚠️ ถ้า `job_code` ไม่มี Template หรือ Template ไม่มี `is_active = TRUE` จะไม่สร้าง Executions

---

## 🔗 แผนภาพความสัมพันธ์ (ER Diagram)

### โครงสร้างหลัก (Simplified)

```
users ──┐
        ├──> products ──> process_templates ──> process_executions ──> process_execution_operators
        │                       │                       │
        └──> work_plans ────────┴──> production_batches─┘
                │
                ├──> machines
                └──> production_rooms

production_statuses ──> work_plans
```

### แผนภาพรายละเอียด

```
┌─────────────┐
│   users     │
│ - id (PK)   │
│ - id_code   │
│ - name      │
└──────┬──────┘
       │ created_by
       ├──────────────────────────────────────┐
       │                                      │
       │                                      ▼
       │                            ┌─────────────────┐
       │                            │   products      │
       │                            │ - id (PK)       │
       │                            │ - product_code  │◄────┐
       │                            │ - product_name  │     │
       │                            └────────┬────────┘     │
       │                                     │              │
       │                                     │              │
       │                                     ▼              │
       │                            ┌──────────────────────┐│
       │                            │ process_templates    ││
       │                            │ - id (PK)            ││
       │                            │ - product_code (FK)  ├┘
       │                            │ - version            │
       │                            │ - process_number     │
       │                            └──────────┬───────────┘
       │                                       │ template_id
       │                                       │
       ├───────────────┐                       │
       │               │                       ▼
       │               ▼              ┌────────────────────┐
       │     ┌──────────────────┐    │ process_executions │
       │     │   work_plans     │    │ - id (PK)          │
       │     │ - id (PK)        │───>│ - work_plan_id (FK)│
       │     │ - job_code       │    │ - batch_id (FK)    │
       │     │ - status_id (FK) │    │ - template_id (FK) │
       │     └──────┬───────────┘    │ - product_code (FK)│
       │            │                 │ - duration_minutes │◄─────────┐
       │            │                 └──────────┬─────────┘          │
       │            │                            │ execution_id       │
       │            ▼                            │                    │
       │   ┌──────────────────┐                 ▼                    │
       │   │production_batches│    ┌──────────────────────────┐      │
       │   │ - id (PK)        │    │process_execution_operators│     │
       │   │ - work_plan_id   │    │ - id (PK)                │      │
       │   │ - batch_code     │    │ - execution_id (FK)      ├──────┘
       │   │ - product_code   │    │ - user_id (FK)           │
       │   └──────────────────┘    │ - role                   │
       │                            └──────────────────────────┘
       │
       └──> process_template_history
                 - product_code (FK)
                 - version
                 - change_type
                 - old_data (JSON)
                 - new_data (JSON)
```

---

## ⚠️ ข้อควรระวังในการดึงข้อมูล (Query Best Practices)

### 1. การดึงข้อมูล Process Executions

#### ❌ ผิด - Query ไม่มีประสิทธิภาพ
```sql
SELECT * FROM process_executions;
```

**ปัญหา**:
- ดึงข้อมูลทั้งหมดโดยไม่มีเงื่อนไข
- ไม่มี LIMIT
- ใช้ `SELECT *`

#### ✅ ถูก - Query ที่มีประสิทธิภาพ
```sql
SELECT 
  pe.id,
  pe.product_code,
  pe.process_number,
  pe.process_description,
  pe.status,
  pe.start_time,
  pe.end_time,
  pe.duration_minutes
FROM process_executions pe
WHERE pe.work_plan_id = 123
  AND pe.status IN ('in_progress', 'completed')
ORDER BY pe.process_number
LIMIT 100;
```

**ข้อดี**:
- ระบุ Column ที่ต้องการชัดเจน
- มี WHERE clause กรองข้อมูล
- ใช้ INDEX (work_plan_id, status)
- มี LIMIT ป้องกันข้อมูลมากเกินไป

---

### 2. การ JOIN ตาราง

#### ❌ ผิด - JOIN หลายตารางโดยไม่จำเป็น
```sql
SELECT *
FROM process_executions pe
JOIN process_templates pt ON pe.template_id = pt.id
JOIN products p ON pt.product_code = p.product_code
JOIN users u ON pt.created_by = u.id
JOIN work_plans wp ON pe.work_plan_id = wp.id
JOIN production_batches pb ON pe.batch_id = pb.id;
```

**ปัญหา**:
- JOIN มากเกินไป
- Query ช้า
- ข้อมูลที่ไม่จำเป็น

#### ✅ ถูก - ใช้ View แทน หรือ JOIN เฉพาะที่จำเป็น
```sql
-- วิธีที่ 1: ใช้ View
SELECT * FROM v_process_execution_summary
WHERE production_date = '2025-10-09';

-- วิธีที่ 2: JOIN เฉพาะที่ต้องการ
SELECT 
  pe.id,
  pe.process_description,
  pe.status,
  p.product_name
FROM process_executions pe
JOIN products p ON pe.product_code = p.product_code
WHERE pe.work_plan_id = 123;
```

---

### 3. การดึงข้อมูล Template เวอร์ชันล่าสุด

#### ❌ ผิด - Query ซับซ้อน
```sql
SELECT *
FROM process_templates pt1
WHERE pt1.version = (
  SELECT MAX(pt2.version)
  FROM process_templates pt2
  WHERE pt2.product_code = pt1.product_code
    AND pt2.is_active = TRUE
)
AND pt1.is_active = TRUE;
```

#### ✅ ถูก - ใช้ View
```sql
SELECT * FROM v_latest_process_templates
WHERE product_code = 'PRD001';
```

**ข้อดี**:
- Query สั้น อ่านง่าย
- Database optimize แล้ว
- Reusable

---

### 4. การนับจำนวน Executions

#### ❌ ผิด - นับโดยไม่มีเงื่อนไข
```sql
SELECT COUNT(*) FROM process_executions;
```

**ปัญหา**: ช้ามาก ถ้าข้อมูลเยอะ

#### ✅ ถูก - นับพร้อมกรองข้อมูล
```sql
-- นับตาม product และ status
SELECT 
  product_code,
  status,
  COUNT(*) as total
FROM process_executions
WHERE recorded_at >= '2025-10-01'
GROUP BY product_code, status;

-- หรือใช้ View
SELECT 
  product_code,
  total_executions,
  completed_count,
  in_progress_count
FROM v_product_process_statistics;
```

---

### 5. การดึงข้อมูล Generated Column

#### ⚠️ ข้อควรระวัง - duration_minutes
```sql
-- ❌ ผิด - WHERE กับ Generated Column (ช้า)
SELECT * FROM process_executions
WHERE duration_minutes > 60;

-- ✅ ถูก - ใช้ start_time และ end_time แทน
SELECT * FROM process_executions
WHERE TIMESTAMPDIFF(MINUTE, start_time, end_time) > 60
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL;

-- ✅ หรือใช้ View ที่มี Index แล้ว
SELECT * FROM v_process_execution_summary
WHERE duration_minutes > 60;
```

---

### 6. การอัปเดตข้อมูล

#### ❌ ผิด - อัปเดตโดยไม่ระบุเงื่อนไข
```sql
UPDATE process_executions
SET status = 'completed';
```

**อันตราย**: อัปเดตทุก Record!

#### ✅ ถูก - อัปเดตพร้อม WHERE clause
```sql
UPDATE process_executions
SET 
  status = 'completed',
  end_time = NOW()
WHERE id = 123
  AND status = 'in_progress';
```

---

### 7. การลบข้อมูล

#### ⚠️ ระวัง CASCADE DELETE

```sql
-- ลบ Work Plan
DELETE FROM work_plans WHERE id = 123;

-- ผลกระทบ (CASCADE):
-- ✅ production_batches (ON DELETE CASCADE) - ถูกลบด้วย
-- ✅ process_executions (ON DELETE CASCADE) - ถูกลบด้วย
-- ✅ process_execution_operators - ถูกลบด้วย (เพราะ execution ถูกลบ)
```

**คำแนะนำ**:
```sql
-- ตรวจสอบก่อนลบ
SELECT 
  (SELECT COUNT(*) FROM production_batches WHERE work_plan_id = 123) as batches,
  (SELECT COUNT(*) FROM process_executions WHERE work_plan_id = 123) as executions;

-- ถ้าไม่แน่ใจ ให้ปิดการใช้งานแทน (Soft Delete)
UPDATE work_plans 
SET status_id = 4  -- ยกเลิก
WHERE id = 123;
```

---

### 8. ข้อควรระวังเรื่อง Performance

#### 🚀 Index ที่สำคัญ

**ควรใช้ในการค้นหา**:
```sql
-- ใช้ Index
SELECT * FROM process_executions 
WHERE work_plan_id = 123;  -- ใช้ idx_work_plan

SELECT * FROM process_executions 
WHERE product_code = 'PRD001';  -- ใช้ idx_product

SELECT * FROM process_executions 
WHERE status = 'pending';  -- ใช้ idx_status
```

**หลีกเลี่ยงการทำลาย Index**:
```sql
-- ❌ ทำลาย Index
SELECT * FROM process_executions 
WHERE YEAR(recorded_at) = 2025;

-- ✅ ใช้ Index ได้
SELECT * FROM process_executions 
WHERE recorded_at >= '2025-01-01' 
  AND recorded_at < '2026-01-01';
```

---

## 📊 ตัวอย่างการ Query ข้อมูล

### 1. ดูแผนการผลิตวันนี้พร้อมรายละเอียด
```sql
SELECT 
  wp.id,
  wp.job_code,
  wp.job_name,
  wp.start_time,
  wp.end_time,
  ps.name as status_name,
  ps.color as status_color,
  m.machine_name,
  pr.room_name,
  u.name as created_by_name,
  (SELECT COUNT(*) 
   FROM process_executions pe 
   WHERE pe.work_plan_id = wp.id) as total_steps,
  (SELECT COUNT(*) 
   FROM process_executions pe 
   WHERE pe.work_plan_id = wp.id 
     AND pe.status = 'completed') as completed_steps
FROM work_plans wp
LEFT JOIN production_statuses ps ON wp.status_id = ps.id
LEFT JOIN machines m ON wp.machine_id = m.id
LEFT JOIN production_rooms pr ON wp.production_room_id = pr.id
LEFT JOIN users u ON wp.created_by = u.id
WHERE wp.production_date = CURDATE()
ORDER BY wp.start_time;
```

---

### 2. ดูความคืบหน้าของ Work Plan
```sql
SELECT 
  pe.process_number,
  pe.process_description,
  pe.status,
  pe.start_time,
  pe.end_time,
  pe.duration_minutes,
  pt.estimated_duration_minutes,
  CASE 
    WHEN pe.duration_minutes IS NULL THEN 'N/A'
    WHEN pe.duration_minutes <= pt.estimated_duration_minutes THEN 'On Time'
    ELSE 'Delayed'
  END as time_status,
  GROUP_CONCAT(u.name SEPARATOR ', ') as workers
FROM process_executions pe
JOIN process_templates pt ON pe.template_id = pt.id
LEFT JOIN process_execution_operators peo ON pe.id = peo.execution_id
LEFT JOIN users u ON peo.user_id = u.id
WHERE pe.work_plan_id = 123
GROUP BY pe.id
ORDER BY pe.process_number;
```

---

### 3. รายงานประสิทธิภาพการผลิตตามสินค้า
```sql
SELECT 
  p.product_code,
  p.product_name,
  COUNT(DISTINCT pe.id) as total_productions,
  AVG(pe.duration_minutes) as avg_duration,
  AVG(pt.estimated_duration_minutes) as avg_estimated,
  ROUND(
    AVG(pt.estimated_duration_minutes) / AVG(pe.duration_minutes) * 100, 
    2
  ) as avg_efficiency_percent,
  SUM(CASE WHEN pe.duration_minutes <= pt.estimated_duration_minutes 
      THEN 1 ELSE 0 END) as on_time_count,
  SUM(CASE WHEN pe.duration_minutes > pt.estimated_duration_minutes 
      THEN 1 ELSE 0 END) as delayed_count
FROM products p
JOIN process_executions pe ON p.product_code = pe.product_code
JOIN process_templates pt ON pe.template_id = pt.id
WHERE pe.status = 'completed'
  AND pe.recorded_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY p.product_code, p.product_name
ORDER BY total_productions DESC;
```

---

### 4. รายงานพนักงานที่ทำงานมากที่สุด
```sql
SELECT 
  u.id_code,
  u.name,
  u.department,
  COUNT(DISTINCT peo.execution_id) as total_tasks,
  COUNT(DISTINCT DATE(pe.start_time)) as working_days,
  SUM(pe.duration_minutes) as total_minutes,
  ROUND(SUM(pe.duration_minutes) / 60, 2) as total_hours
FROM users u
JOIN process_execution_operators peo ON u.id = peo.user_id
JOIN process_executions pe ON peo.execution_id = pe.id
WHERE pe.status = 'completed'
  AND pe.start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY u.id, u.id_code, u.name, u.department
ORDER BY total_hours DESC
LIMIT 20;
```

---

### 5. ตรวจสอบเครื่องจักรที่ใช้งานมากที่สุด
```sql
SELECT 
  m.machine_code,
  m.machine_name,
  m.machine_type,
  COUNT(DISTINCT pe.id) as usage_count,
  SUM(pe.duration_minutes) as total_usage_minutes,
  ROUND(SUM(pe.duration_minutes) / 60, 2) as total_usage_hours,
  MIN(pe.start_time) as first_used,
  MAX(pe.end_time) as last_used
FROM machines m
JOIN process_executions pe ON m.id = pe.machine_id
WHERE pe.status = 'completed'
  AND pe.start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY m.id, m.machine_code, m.machine_name, m.machine_type
ORDER BY total_usage_hours DESC;
```

---

### 6. ดูประวัติการแก้ไข Template
```sql
SELECT 
  pth.id,
  pth.product_code,
  p.product_name,
  pth.version,
  pth.change_type,
  u.name as changed_by_name,
  pth.changed_at,
  pth.change_note,
  pth.old_data,
  pth.new_data
FROM process_template_history pth
JOIN products p ON pth.product_code = p.product_code
LEFT JOIN users u ON pth.changed_by = u.id
WHERE pth.product_code = 'PRD001'
ORDER BY pth.changed_at DESC;
```

---

### 7. สร้าง Work Plan พร้อม Process Executions อัตโนมัติ
```sql
-- 1. สร้าง Work Plan
INSERT INTO work_plans 
  (production_date, job_code, job_name, start_time, end_time, 
   status_id, machine_id, production_room_id, created_by)
VALUES 
  ('2025-10-09', 'PRD001', 'ผลิตข้าวผัดกุ้ง', '08:00:00', '10:00:00',
   1, 1, 1, 1);

-- 2. Trigger after_work_plan_insert จะสร้าง process_executions อัตโนมัติ
-- จาก process_templates ที่ product_code = 'PRD001'

-- 3. ดูผลลัพธ์
SELECT * FROM process_executions 
WHERE work_plan_id = LAST_INSERT_ID();
```

---

### 8. เริ่มและจบการทำงานของขั้นตอน
```sql
-- เริ่มทำงาน
UPDATE process_executions 
SET 
  status = 'in_progress',
  start_time = NOW(),
  actual_worker_count = 3
WHERE id = 123;

-- เพิ่มพนักงานเข้าทำงาน
INSERT INTO process_execution_operators 
  (execution_id, user_id, role)
VALUES 
  (123, 5, 'operator'),
  (123, 8, 'operator'),
  (123, 10, 'supervisor');

-- จบการทำงาน
UPDATE process_executions 
SET 
  status = 'completed',
  end_time = NOW(),
  notes = 'ทำงานเสร็จตามแผน'
WHERE id = 123;

-- ดูผลลัพธ์ (duration_minutes คำนวณอัตโนมัติ)
SELECT * FROM v_process_execution_summary 
WHERE execution_id = 123;
```

---

## 🔐 การจัดการสิทธิ์และความปลอดภัย

### 1. สิทธิ์การเข้าถึงข้อมูล

**แนะนำ**: สร้าง User แยกตามหน้าที่
```sql
-- Read-Only User (สำหรับ Report)
CREATE USER 'report_user'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT ON manufacturing_system.* TO 'report_user'@'%';

-- Application User (สำหรับระบบ)
CREATE USER 'app_user'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE ON manufacturing_system.* TO 'app_user'@'%';
GRANT DELETE ON manufacturing_system.process_execution_operators TO 'app_user'@'%';

-- Admin User (ผู้ดูแลระบบ)
CREATE USER 'admin_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON manufacturing_system.* TO 'admin_user'@'%';
```

---

### 2. ข้อควรระวังด้านความปลอดภัย

⚠️ **ห้าม** ลบข้อมูลโดยตรง แนะนำให้ใช้ Soft Delete
```sql
-- ❌ ห้าม
DELETE FROM products WHERE product_code = 'PRD001';

-- ✅ แนะนำ
UPDATE products 
SET is_active = FALSE 
WHERE product_code = 'PRD001';
```

⚠️ **ระวัง** SQL Injection
```javascript
// ❌ อันตราย
const query = `SELECT * FROM products WHERE product_code = '${req.body.code}'`;

// ✅ ปลอดภัย - ใช้ Prepared Statement
const query = 'SELECT * FROM products WHERE product_code = ?';
connection.query(query, [req.body.code], callback);
```

---

## 📈 การดูแลรักษาและ Optimization

### 1. การสำรองข้อมูล (Backup)

**คำแนะนำ**: สำรองข้อมูลทุกวัน
```bash
# Backup ทั้งหมด
mysqldump -u root -p manufacturing_system > backup_$(date +%Y%m%d).sql

# Backup เฉพาะ Structure
mysqldump -u root -p --no-data manufacturing_system > structure_only.sql

# Backup เฉพาะ Data
mysqldump -u root -p --no-create-info manufacturing_system > data_only.sql
```

---

### 2. การทำความสะอาดข้อมูล

**ลบข้อมูล Log เก่า** (ถ้ามี)
```sql
-- ลบ Execution ที่เก่ากว่า 1 ปี และเสร็จสิ้นแล้ว
DELETE FROM process_executions 
WHERE status = 'completed'
  AND recorded_at < DATE_SUB(CURDATE(), INTERVAL 1 YEAR);

-- Archive History เก่า
INSERT INTO process_template_history_archive
SELECT * FROM process_template_history
WHERE changed_at < DATE_SUB(CURDATE(), INTERVAL 2 YEAR);

DELETE FROM process_template_history
WHERE changed_at < DATE_SUB(CURDATE(), INTERVAL 2 YEAR);
```

---

### 3. การตรวจสอบประสิทธิภาพ

**ดู Slow Queries**:
```sql
-- เปิด Slow Query Log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- Query ที่ช้ากว่า 2 วินาที

-- ดู Slow Queries
SELECT * FROM mysql.slow_log 
ORDER BY start_time DESC 
LIMIT 20;
```

**ตรวจสอบ Index Usage**:
```sql
-- ดู Index ที่ไม่ถูกใช้
SELECT 
  table_schema,
  table_name,
  index_name
FROM information_schema.statistics
WHERE table_schema = 'manufacturing_system'
  AND index_name NOT IN (
    SELECT DISTINCT index_name 
    FROM performance_schema.table_io_waits_summary_by_index_usage
  );
```

---

## 📚 สรุปและข้อแนะนำ

### ✅ ข้อดีของระบบใหม่

1. **แยกโครงสร้างชัดเจน**: Template vs Execution
2. **รองรับ Version Control**: จัดการเวอร์ชันขั้นตอนได้
3. **Audit Trail**: บันทึกประวัติการเปลี่ยนแปลง
4. **คำนวณอัตโนมัติ**: Generated Columns
5. **ป้องกันข้อมูลซ้ำ**: UNIQUE Constraints
6. **ความสัมพันธ์ชัดเจน**: Foreign Keys

---

### ⚠️ ข้อควรระวังสำคัญ

1. **CASCADE DELETE**: ระวังการลบข้อมูลที่มีความสัมพันธ์
2. **Generated Columns**: ห้าม INSERT/UPDATE โดยตรง
3. **Triggers**: ทำงานอัตโนมัติ อาจส่งผลกระทบต่อประสิทธิภาพ
4. **Performance**: ใช้ INDEX และ View อย่างเหมาะสม
5. **Data Integrity**: ตรวจสอบข้อมูลก่อน INSERT/UPDATE

---

### 🎯 Best Practices

1. **ใช้ Views**: แทนการ JOIN ซ้ำๆ
2. **ระบุ Columns**: อย่าใช้ `SELECT *`
3. **WHERE Clause**: กรองข้อมูลทุกครั้ง
4. **LIMIT**: จำกัดจำนวน Record
5. **Transaction**: ใช้สำหรับการแก้ไขที่สัมพันธ์กัน
6. **Soft Delete**: ใช้แทนการลบข้อมูลจริง
7. **Regular Backup**: สำรองข้อมูลเป็นประจำ
8. **Monitor Performance**: ติดตามประสิทธิภาพ

---

## 📞 ติดต่อและสนับสนุน

หากพบปัญหาหรือมีข้อสงสัยเกี่ยวกับโครงสร้างฐานข้อมูล กรุณาติดต่อทีมพัฒนา

---

**เอกสารนี้สร้างเมื่อ**: 9 ตุลาคม 2025  
**เวอร์ชัน**: 1.0  
**ผู้จัดทำ**: AI Assistant  
**อัปเดตล่าสุด**: 9 ตุลาคม 2025







