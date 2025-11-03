-- =====================================================
-- SQL สำหรับย้ายข้อมูลงาน A, B, C, D 
-- จาก Move1112025.work_plan_drafts ไป MNF_database.work_plans
-- เวอร์ชันเรียบง่าย - พร้อมใช้งานใน MySQL Workbench
-- =====================================================

-- ขั้นตอนที่ 1: ตรวจสอบโครงสร้างตาราง work_plans ก่อน
-- รันคำสั่งนี้เพื่อดูคอลัมน์ที่มีในตาราง
DESCRIBE MNF_database.work_plans;

-- หรือ
SHOW COLUMNS FROM MNF_database.work_plans;

-- =====================================================
-- ขั้นตอนที่ 2: ตรวจสอบข้อมูลที่จะย้าย
-- =====================================================

SELECT 
    COUNT(*) as total_records,
    job_code,
    COUNT(*) as count_by_job
FROM Move1112025.work_plan_drafts
WHERE job_code IN ('A', 'B', 'C', 'D')
GROUP BY job_code;

-- =====================================================
-- ขั้นตอนที่ 3: INSERT ข้อมูล
-- เลือกใช้ตามโครงสร้างตาราง work_plans ของคุณ
-- =====================================================

-- =====================================================
-- ตัวเลือก A: ถ้ามีคอลัมน์ job_type, workflow_status, is_printed
-- =====================================================

INSERT INTO MNF_database.work_plans 
(
    production_date,
    job_code,
    job_name,
    job_type,
    workflow_status,
    status_id,
    is_printed,
    start_time,
    end_time,
    machine_id,
    production_room_id,
    notes,
    is_special,
    operators
)
SELECT 
    wpd.production_date,
    wpd.job_code,
    wpd.job_name,
    'default' as job_type,
    CASE 
        WHEN wpd.workflow_status_id = 1 THEN 'draft'
        WHEN wpd.workflow_status_id = 2 THEN 'completed'
        ELSE 'draft'
    END as workflow_status,
    CASE 
        WHEN wpd.workflow_status_id = 1 THEN 1
        WHEN wpd.workflow_status_id = 2 THEN 2
        ELSE 1
    END as status_id,
    0 as is_printed,
    wpd.start_time,
    wpd.end_time,
    wpd.machine_id,
    wpd.production_room_id,
    wpd.notes,
    COALESCE(wpd.is_special, 0) as is_special,
    wpd.operators
FROM Move1112025.work_plan_drafts wpd
WHERE wpd.job_code IN ('A', 'B', 'C', 'D')
ORDER BY wpd.production_date, wpd.job_code;

-- =====================================================
-- ตัวเลือก B: ถ้าไม่มีคอลัมน์ job_type, workflow_status, is_printed
-- (ใช้เฉพาะคอลัมน์พื้นฐาน)
-- =====================================================

/*
INSERT INTO MNF_database.work_plans 
(
    production_date,
    job_code,
    job_name,
    start_time,
    end_time,
    machine_id,
    production_room_id,
    notes,
    status_id,
    is_special,
    operators
)
SELECT 
    wpd.production_date,
    wpd.job_code,
    wpd.job_name,
    wpd.start_time,
    wpd.end_time,
    wpd.machine_id,
    wpd.production_room_id,
    wpd.notes,
    CASE 
        WHEN wpd.workflow_status_id = 1 THEN 1
        WHEN wpd.workflow_status_id = 2 THEN 2
        ELSE 1
    END as status_id,
    COALESCE(wpd.is_special, 0) as is_special,
    wpd.operators
FROM Move1112025.work_plan_drafts wpd
WHERE wpd.job_code IN ('A', 'B', 'C', 'D')
ORDER BY wpd.production_date, wpd.job_code;
*/

-- =====================================================
-- ตัวเลือก C: ถ้าต้องการข้ามข้อมูลซ้ำ (ใช้ INSERT IGNORE)
-- =====================================================

/*
INSERT IGNORE INTO MNF_database.work_plans 
(
    production_date,
    job_code,
    job_name,
    job_type,
    workflow_status,
    status_id,
    is_printed,
    start_time,
    end_time,
    machine_id,
    production_room_id,
    notes,
    is_special,
    operators
)
SELECT 
    wpd.production_date,
    wpd.job_code,
    wpd.job_name,
    'default' as job_type,
    CASE 
        WHEN wpd.workflow_status_id = 1 THEN 'draft'
        WHEN wpd.workflow_status_id = 2 THEN 'completed'
        ELSE 'draft'
    END as workflow_status,
    CASE 
        WHEN wpd.workflow_status_id = 1 THEN 1
        WHEN wpd.workflow_status_id = 2 THEN 2
        ELSE 1
    END as status_id,
    0 as is_printed,
    wpd.start_time,
    wpd.end_time,
    wpd.machine_id,
    wpd.production_room_id,
    wpd.notes,
    COALESCE(wpd.is_special, 0) as is_special,
    wpd.operators
FROM Move1112025.work_plan_drafts wpd
WHERE wpd.job_code IN ('A', 'B', 'C', 'D')
ORDER BY wpd.production_date, wpd.job_code;
*/

-- =====================================================
-- ขั้นตอนที่ 4: ตรวจสอบผลลัพธ์หลัง INSERT
-- =====================================================

SELECT 
    COUNT(*) as total_inserted,
    job_code,
    COUNT(*) as count_by_job
FROM MNF_database.work_plans
WHERE job_code IN ('A', 'B', 'C', 'D')
GROUP BY job_code;

-- ดูข้อมูลที่ INSERT ไปล่าสุด
SELECT 
    id,
    production_date,
    job_code,
    job_name,
    start_time,
    end_time,
    status_id,
    machine_id,
    production_room_id
FROM MNF_database.work_plans
WHERE job_code IN ('A', 'B', 'C', 'D')
ORDER BY production_date DESC, job_code
LIMIT 20;
