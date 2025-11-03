-- =====================================================
-- สคริปต์สำหรับย้ายข้อมูลงาน A, B, C, D 
-- จาก Move1112025.work_plan_drafts 
-- ไปยัง MNF_database.work_plans
-- =====================================================

-- หมายเหตุ: 
-- 1. ตรวจสอบข้อมูลก่อนย้ายด้วย SELECT ด้านล่าง
-- 2. แนะนำให้ Backup ฐานข้อมูลก่อนดำเนินการ
-- 3. คอลัมน์อาจแตกต่างกันระหว่างตาราง 2 ตาราง

-- =====================================================
-- ขั้นตอนที่ 1: ตรวจสอบข้อมูลที่จะย้าย
-- =====================================================

SELECT 
    id,
    production_date,
    job_code,
    job_name,
    start_time,
    end_time,
    machine_id,
    production_room_id,
    notes,
    workflow_status_id,
    operators,
    is_special,
    created_at,
    updated_at
FROM Move1112025.work_plan_drafts
WHERE job_code IN ('A', 'B', 'C', 'D')
ORDER BY production_date, job_code;

-- ตรวจสอบจำนวนข้อมูลที่จะย้าย
SELECT 
    COUNT(*) as total_records,
    job_code,
    COUNT(*) as count_by_job
FROM Move1112025.work_plan_drafts
WHERE job_code IN ('A', 'B', 'C', 'D')
GROUP BY job_code;

-- =====================================================
-- ขั้นตอนที่ 2: ตรวจสอบข้อมูลที่ซ้ำในตารางปลายทาง
-- (เพื่อป้องกันการ insert ซ้ำ)
-- =====================================================

SELECT 
    wp.production_date,
    wp.job_code,
    COUNT(*) as existing_count
FROM MNF_database.work_plans wp
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
GROUP BY wp.production_date, wp.job_code
HAVING existing_count > 0;

-- =====================================================
-- ขั้นตอนที่ 3: INSERT ข้อมูล
-- =====================================================

-- ⚠️ สำคัญ: ให้ตรวจสอบโครงสร้างตาราง work_plans ก่อน
-- โดยใช้คำสั่ง: DESCRIBE MNF_database.work_plans;
-- หรือ: SHOW COLUMNS FROM MNF_database.work_plans;

-- =====================================================
-- วิธีที่ 1: INSERT แบบ Full (ถ้ามีคอลัมน์ครบทั้งหมด)
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
    'default' as job_type,  -- งาน A, B, C, D เป็น default เสมอ
    CASE 
        WHEN wpd.workflow_status_id = 1 THEN 'draft'
        WHEN wpd.workflow_status_id = 2 THEN 'completed'
        ELSE 'draft'
    END as workflow_status,
    CASE 
        WHEN wpd.workflow_status_id = 1 THEN 1  -- draft = status_id 1
        WHEN wpd.workflow_status_id = 2 THEN 2  -- completed = status_id 2
        ELSE 1
    END as status_id,
    0 as is_printed,  -- ยังไม่พิมพ์ (0)
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
-- วิธีที่ 2: INSERT แบบพื้นฐาน (ใช้เฉพาะคอลัมน์ที่จำเป็น)
-- ใช้เมื่อตาราง work_plans ไม่มีบางคอลัมน์ เช่น job_type, workflow_status, is_printed
-- =====================================================

-- ยกเลิก comment เพื่อใช้งาน
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
-- วิธีที่ 3: INSERT พร้อมป้องกันข้อมูลซ้ำ (ใช้ INSERT IGNORE)
-- ใช้เมื่อต้องการข้ามข้อมูลที่ซ้ำ โดยไม่เกิด error
-- =====================================================

-- ยกเลิก comment เพื่อใช้งาน
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
-- ขั้นตอนที่ 5: INSERT พร้อม UPDATE operators ไปที่ work_plan_operators
-- (ถ้าต้องการแยก operators ไปตาราง work_plan_operators)
-- =====================================================

-- หลังจาก INSERT ข้อมูลแล้ว ให้ INSERT operators ไปที่ work_plan_operators
-- (ต้อง parse JSON จาก operators column)
-- ตัวอย่าง:
/*
INSERT INTO MNF_database.work_plan_operators (work_plan_id, user_id, id_code)
SELECT 
    wp.id,
    NULL as user_id,  -- ต้องหาจาก users table ถ้ามี
    JSON_UNQUOTE(JSON_EXTRACT(wpd.operators, CONCAT('$[', idx, '].name'))) as id_code
FROM MNF_database.work_plans wp
INNER JOIN Move1112025.work_plan_drafts wpd 
    ON wp.production_date = wpd.production_date 
    AND wp.job_code = wpd.job_code
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
    AND wpd.operators IS NOT NULL
    AND JSON_LENGTH(wpd.operators) > 0;
*/

-- =====================================================
-- ขั้นตอนที่ 6: ตรวจสอบผลลัพธ์หลัง INSERT
-- =====================================================

SELECT 
    COUNT(*) as total_inserted,
    job_code,
    COUNT(*) as count_by_job,
    MIN(production_date) as min_date,
    MAX(production_date) as max_date
FROM MNF_database.work_plans
WHERE job_code IN ('A', 'B', 'C', 'D')
GROUP BY job_code;

-- ตรวจสอบข้อมูลที่ INSERT ไป
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

-- =====================================================
-- ขั้นตอนที่ 7: แก้ไขข้อมูลถ้าจำเป็น
-- =====================================================

-- ตั้งค่า job_type สำหรับงาน A, B, C, D ที่ INSERT ไปแล้ว (ถ้ายังไม่มี)
-- UPDATE MNF_database.work_plans
-- SET job_type = 'default'
-- WHERE job_code IN ('A', 'B', 'C', 'D')
--     AND (job_type IS NULL OR job_type != 'default');

-- ตั้งค่า workflow_status (ถ้ายังไม่มี)
-- UPDATE MNF_database.work_plans wp
-- INNER JOIN Move1112025.work_plan_drafts wpd
--     ON wp.production_date = wpd.production_date
--     AND wp.job_code = wpd.job_code
-- SET wp.workflow_status = CASE 
--         WHEN wpd.workflow_status_id = 1 THEN 'draft'
--         WHEN wpd.workflow_status_id = 2 THEN 'completed'
--         ELSE 'draft'
--     END
-- WHERE wp.job_code IN ('A', 'B', 'C', 'D');

-- =====================================================
-- ขั้นตอนที่ 8: INSERT operators ไปที่ work_plan_operators
-- (ถ้าต้องการแยกข้อมูล operators ไปตาราง work_plan_operators)
-- =====================================================

-- หมายเหตุ: ต้องรันขั้นตอนที่ 3 ก่อน เพื่อให้มี work_plan_id แล้ว
-- วิธีนี้จะ parse JSON operators และ INSERT ไปที่ work_plan_operators

-- ยกเลิก comment เพื่อใช้งาน (ต้องแก้ไขให้เหมาะสมกับโครงสร้างข้อมูล)
/*
-- ขั้นตอน 8.1: ตรวจสอบ operators ก่อน
SELECT 
    wp.id as work_plan_id,
    wp.job_code,
    wp.production_date,
    wpd.operators,
    JSON_LENGTH(wpd.operators) as operator_count
FROM MNF_database.work_plans wp
INNER JOIN Move1112025.work_plan_drafts wpd 
    ON wp.production_date = wpd.production_date 
    AND wp.job_code = wpd.job_code
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
    AND wpd.operators IS NOT NULL
    AND JSON_LENGTH(wpd.operators) > 0;

-- ขั้นตอน 8.2: INSERT operators (ต้องปรับให้เหมาะสมกับโครงสร้าง)
-- ตัวอย่าง: ถ้า operators เป็น JSON array ที่มี structure: [{"name": "ชื่อ"}, ...]
INSERT INTO MNF_database.work_plan_operators (work_plan_id, id_code)
SELECT DISTINCT
    wp.id as work_plan_id,
    JSON_UNQUOTE(JSON_EXTRACT(wpd.operators, CONCAT('$[', n.n, '].name'))) as id_code
FROM MNF_database.work_plans wp
INNER JOIN Move1112025.work_plan_drafts wpd 
    ON wp.production_date = wpd.production_date 
    AND wp.job_code = wpd.job_code
CROSS JOIN (
    SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
    SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
) n
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
    AND wpd.operators IS NOT NULL
    AND JSON_LENGTH(wpd.operators) > n.n
    AND JSON_UNQUOTE(JSON_EXTRACT(wpd.operators, CONCAT('$[', n.n, '].name'))) IS NOT NULL;
*/

-- =====================================================
-- หมายเหตุสำคัญ:
-- =====================================================
-- 1. ตรวจสอบโครงสร้างตาราง work_plans ก่อน: 
--    DESCRIBE MNF_database.work_plans;
--
-- 2. ใช้ INSERT IGNORE เพื่อข้ามข้อมูลที่ซ้ำ (ถ้ามี unique constraint)
--
-- 3. ถ้าต้องการแทนที่ข้อมูลเก่า ใช้ REPLACE INTO แทน INSERT
--
-- 4. ถ้าต้องการอัพเดทข้อมูลเก่า ใช้ INSERT ... ON DUPLICATE KEY UPDATE
--
-- 5. ตรวจสอบ foreign key constraints:
--    - machine_id ต้องมีในตาราง machines
--    - production_room_id ต้องมีในตาราง production_rooms  
--    - status_id ต้องมีในตาราง production_statuses
--
-- 6. ตรวจสอบว่า operators column รองรับ JSON หรือไม่
--
-- 7. งาน A, B, C, D จะถูกตั้งเป็น job_type = 'default' อัตโนมัติ
--
-- 8. ตรวจสอบข้อมูลหลัง INSERT ด้วยคำสั่งในขั้นตอนที่ 6
-- =====================================================
