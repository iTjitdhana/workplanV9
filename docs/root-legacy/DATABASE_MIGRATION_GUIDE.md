# 🔄 คู่มือการย้าย Database จาก esp_tracker → manufacturing_system

**วันที่:** 2025-10-20  
**โปรเจกต์:** WorkPlan V6

---

## 📊 ภาพรวมการเปลี่ยนแปลง

### Database เดิม: `esp_tracker`
- โครงสร้างแบบง่าย (Flat Structure)
- ตารางหลัก: `process_steps`, `work_plans`, `fg`, `material`

### Database ใหม่: `manufacturing_system`
- โครงสร้างแบบ Template-Based
- ตารางหลัก: `process_templates`, `process_executions`, `products`, `materials`
- มี Version Control และ Audit Trail

---

## ✅ ไฟล์ที่ถูกอัพเดทแล้ว

| ไฟล์ | การเปลี่ยนแปลง | สถานะ |
|------|----------------|--------|
| `backend/.env.development` | DB_NAME → manufacturing_system | ✅ เสร็จ |
| `backend/.env.example` | DB_NAME → manufacturing_system | ✅ เสร็จ |
| `backend/config/database.js` | Fallback → manufacturing_system | ✅ เสร็จ |
| `backend/config/database.js` | Error messages อัพเดท | ✅ เสร็จ |

---

## 🚀 ขั้นตอนการ Import Database ใหม่

### Option 1: Import Structure เท่านั้น (แนะนำสำหรับทดสอบ)

```bash
# 1. เชื่อมต่อ MySQL
mysql -h 192.168.0.94 -u jitdhana -p

# 2. สร้าง Database ใหม่
CREATE DATABASE IF NOT EXISTS manufacturing_system 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

# 3. Exit MySQL
exit

# 4. Import Structure จากไฟล์
mysql -h 192.168.0.94 -u jitdhana -p manufacturing_system < database/sql/structure_manufacturing_system.sql
```

### Option 2: Import พร้อม Migrate ข้อมูลเดิม

```bash
# 1. Backup ข้อมูลเดิมก่อน
mysqldump -h 192.168.0.94 -u jitdhana -p esp_tracker > esp_tracker_backup_$(date +%Y%m%d).sql

# 2. สร้าง Database ใหม่
mysql -h 192.168.0.94 -u jitdhana -p -e "CREATE DATABASE IF NOT EXISTS manufacturing_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Import Structure
mysql -h 192.168.0.94 -u jitdhana -p manufacturing_system < database/sql/structure_manufacturing_system.sql

# 4. Migrate ข้อมูล (ดูรายละเอียดด้านล่าง)
```

---

## 📥 การ Migrate ข้อมูลจาก esp_tracker → manufacturing_system

### 🔄 ตารางที่ต้อง Migrate

#### 1. Users (พนักงาน) - ✅ ง่าย
```sql
-- ตาราง users มีโครงสร้างเหมือนกัน แค่เพิ่ม field
INSERT INTO manufacturing_system.users 
  (id, id_code, name, is_active, created_at, updated_at)
SELECT 
  id, id_code, name, 
  1 as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM esp_tracker.users;
```

#### 2. Machines - ✅ ง่าย
```sql
INSERT INTO manufacturing_system.machines 
  (id, machine_code, machine_name, machine_type, location, status, description)
SELECT 
  id, machine_code, machine_name, machine_type, location, status, description
FROM esp_tracker.machines;
```

#### 3. Production Rooms - ✅ ง่าย
```sql
INSERT INTO manufacturing_system.production_rooms 
  (id, room_code, room_name, room_type, capacity, location, status, description)
SELECT 
  id, room_code, room_name, room_type, capacity, location, status, description
FROM esp_tracker.production_rooms;
```

#### 4. Production Statuses - ✅ ง่าย
```sql
INSERT INTO manufacturing_system.production_statuses 
  (id, name, description, color, is_active)
SELECT 
  id, name, description, color, is_active
FROM esp_tracker.production_statuses;
```

#### 5. Products (จาก fg) - ⚠️ ต้องแปลง
```sql
-- แปลงจาก fg → products
INSERT INTO manufacturing_system.products 
  (product_code, product_name, product_type, description, unit, is_active)
SELECT 
  FG_Code as product_code,
  FG_Name as product_name,
  'FG' as product_type,
  CONCAT('Size: ', FG_Size, ', Unit: ', FG_Unit) as description,
  base_unit as unit,
  1 as is_active
FROM esp_tracker.fg;
```

#### 6. Materials (จาก material) - ⚠️ ต้องแปลง
```sql
-- แปลงจาก material → materials (เพิ่ม s)
INSERT INTO manufacturing_system.materials 
  (material_code, material_name, unit, price)
SELECT 
  Mat_Id as material_code,
  Mat_Name as material_name,
  Mat_Unit as unit,
  price
FROM esp_tracker.material;
```

#### 7. Work Plans - ⚠️ ซับซ้อน
```sql
-- ต้องตรวจสอบ foreign keys
INSERT INTO manufacturing_system.work_plans 
  (id, production_date, job_code, job_name, start_time, end_time, 
   status_id, machine_id, production_room_id, notes, is_special, created_at, updated_at)
SELECT 
  id, production_date, job_code, job_name, start_time, end_time,
  status_id, machine_id, production_room_id, notes, is_special, 
  NOW() as created_at, NOW() as updated_at
FROM esp_tracker.work_plans;
```

#### 8. Process Steps → Process Templates - 🔥 ยากที่สุด

**ปัญหา:** ข้อมูลเก่าไม่มี Template/Version
**แนวทาง:** สร้าง Template จากข้อมูลที่มี

```sql
-- สร้าง Process Templates จาก process_steps ที่มีอยู่
INSERT INTO manufacturing_system.process_templates 
  (product_code, version, process_number, process_description, 
   standard_worker_count, is_active, created_at)
SELECT DISTINCT
  job_code as product_code,
  1 as version,  -- เริ่มที่ version 1
  process_number,
  process_description,
  worker_count as standard_worker_count,
  1 as is_active,
  MIN(date_recorded) as created_at
FROM esp_tracker.process_steps
GROUP BY job_code, process_number, process_description, worker_count
ORDER BY job_code, process_number;
```

---

## ⚠️ สิ่งที่ต้องระวัง

### 1. **Foreign Key Constraints**
- Manufacturing_system มี Foreign Keys เข้มงวดกว่า
- ต้อง Migrate ตามลำดับ: Users → Machines → Rooms → Statuses → Products → Work Plans

### 2. **ข้อมูลที่ไม่ตรงกัน**
- `job_code` ใน work_plans อาจไม่ตรงกับ `product_code` ใน products
- ต้องทำ Data Cleaning ก่อน

### 3. **Generated Columns**
- `duration_minutes` ใน process_executions คำนวณอัตโนมัติ
- ห้าม INSERT ค่าโดยตรง

### 4. **Triggers**
- Manufacturing_system มี Triggers ที่ทำงานอัตโนมัติ
- เช่น สร้าง Work Plan จะสร้าง Process Executions อัตโนมัติ

---

## 🧪 การทดสอบหลัง Migrate

### 1. ทดสอบ Connection
```bash
# รัน Backend
cd backend
npm run dev

# ดู Console Output
# ควรเห็น: "Database: manufacturing_system"
```

### 2. ทดสอบ API
```bash
# Health Check
curl http://localhost:3101/health

# ทดสอบ API ต่างๆ
curl http://localhost:3101/api/users
curl http://localhost:3101/api/work-plans
curl http://localhost:3101/api/machines
```

### 3. ตรวจสอบ Database
```sql
-- เชื่อมต่อ MySQL
mysql -h 192.168.0.94 -u jitdhana -p manufacturing_system

-- ตรวจสอบจำนวนข้อมูล
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'work_plans', COUNT(*) FROM work_plans
UNION ALL
SELECT 'process_templates', COUNT(*) FROM process_templates;

-- ดู Views
SELECT * FROM v_latest_process_templates LIMIT 5;
SELECT * FROM v_product_process_statistics LIMIT 5;
```

---

## 🔄 การ Rollback (ถ้ามีปัญหา)

### ถ้าต้องการกลับไปใช้ esp_tracker

```bash
# 1. แก้ไข backend/.env.development
DB_NAME=esp_tracker

# 2. Restart Backend
cd backend
npm run dev
```

### หรือใช้ Git
```bash
# Checkout ไฟล์เดิม
git checkout backend/config/database.js
git checkout backend/.env.development

# Restart
npm run dev
```

---

## 📊 Mapping Table (เปรียบเทียบ)

| esp_tracker (เก่า) | manufacturing_system (ใหม่) | หมายเหตุ |
|---------------------|------------------------------|----------|
| `fg` | `products` | เพิ่ม product_type, category |
| `material` | `materials` | เปลี่ยนชื่อ field: Mat_Id → material_code |
| `process_steps` | `process_templates` + `process_executions` | แยก Template กับ Execution |
| `work_plans` | `work_plans` | เพิ่ม template_version, created_by |
| `production_batches` | `production_batches` | เปลี่ยน fg_code → product_code |
| `users` | `users` | เพิ่ม email, phone, position, department |

---

## 📝 Script การ Migrate แบบเต็ม

สร้างไฟล์ `migrate_data.sql`:

```sql
-- ===========================================
-- Migration Script: esp_tracker → manufacturing_system
-- วันที่: 2025-10-20
-- ===========================================

USE manufacturing_system;

-- 1. Disable Foreign Key Checks
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Clear existing data (ถ้ามี)
TRUNCATE TABLE users;
TRUNCATE TABLE machines;
TRUNCATE TABLE production_rooms;
TRUNCATE TABLE production_statuses;
TRUNCATE TABLE products;
TRUNCATE TABLE materials;

-- 3. Import Users
INSERT INTO users (id, id_code, name, is_active)
SELECT id, id_code, name, 1
FROM esp_tracker.users;

-- 4. Import Machines
INSERT INTO machines (id, machine_code, machine_name, machine_type, location, status, description)
SELECT id, machine_code, machine_name, machine_type, location, status, description
FROM esp_tracker.machines;

-- 5. Import Production Rooms
INSERT INTO production_rooms (id, room_code, room_name, room_type, capacity, location, status, description)
SELECT id, room_code, room_name, room_type, capacity, location, status, description
FROM esp_tracker.production_rooms;

-- 6. Import Production Statuses
INSERT INTO production_statuses (id, name, description, color, is_active)
SELECT id, name, description, color, is_active
FROM esp_tracker.production_statuses;

-- 7. Import Products (จาก fg)
INSERT INTO products (product_code, product_name, product_type, description, unit, is_active)
SELECT 
  FG_Code,
  FG_Name,
  'FG',
  CONCAT('Size: ', FG_Size),
  base_unit,
  1
FROM esp_tracker.fg;

-- 8. Import Materials
INSERT INTO materials (material_code, material_name, unit, price)
SELECT Mat_Id, Mat_Name, Mat_Unit, price
FROM esp_tracker.material;

-- 9. Enable Foreign Key Checks
SET FOREIGN_KEY_CHECKS = 1;

-- 10. Verify
SELECT 'Migration Summary' as info;
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'materials', COUNT(*) FROM materials
UNION ALL SELECT 'machines', COUNT(*) FROM machines
UNION ALL SELECT 'production_rooms', COUNT(*) FROM production_rooms;
```

**วิธีรัน:**
```bash
mysql -h 192.168.0.94 -u jitdhana -p < migrate_data.sql
```

---

## ✅ Checklist การ Migrate

- [x] อัพเดท `.env.development`
- [x] อัพเดท `.env.example`
- [x] อัพเดท `backend/config/database.js`
- [ ] สร้าง Database `manufacturing_system`
- [ ] Import Structure จาก `database/sql/structure_manufacturing_system.sql`
- [ ] Migrate ข้อมูลพื้นฐาน (users, machines, rooms)
- [ ] Migrate Products และ Materials
- [ ] สร้าง Process Templates
- [ ] ทดสอบ Connection
- [ ] ทดสอบ API
- [ ] ตรวจสอบ Frontend

---

## 🆘 Troubleshooting

### ปัญหา: Access Denied
```bash
# ตรวจสอบสิทธิ์
mysql -h 192.168.0.94 -u jitdhana -p -e "SHOW GRANTS FOR 'jitdhana'@'%';"

# ถ้าไม่มีสิทธิ์ ให้ admin grant ให้
GRANT ALL PRIVILEGES ON manufacturing_system.* TO 'jitdhana'@'%';
FLUSH PRIVILEGES;
```

### ปัญหา: Foreign Key Constraint
```bash
# ปิด Foreign Key Check ชั่วคราว
SET FOREIGN_KEY_CHECKS = 0;
-- ทำ migration
SET FOREIGN_KEY_CHECKS = 1;
```

### ปัญหา: Database ไม่มี
```bash
# สร้าง Database
mysql -h 192.168.0.94 -u jitdhana -p -e "CREATE DATABASE manufacturing_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## 📚 เอกสารอ้างอิง

- `docs/root-legacy/DATABASE_STRUCTURE.md` - โครงสร้าง manufacturing_system
- `database/sql/structure_manufacturing_system.sql` - SQL Structure
- `docs/root-legacy/DEV_STANDARD.md` - มาตรฐานการพัฒนา

---

**สร้างโดย:** AI Assistant  
**วันที่:** 2025-10-20  
**เวอร์ชัน:** 1.0

