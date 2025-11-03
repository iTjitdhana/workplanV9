-- =====================================================
-- SQL Script สำหรับตรวจสอบ Operators ของงาน A, B, C, D
-- =====================================================

-- ขั้นตอนที่ 1: ตรวจสอบว่ามีงาน A, B, C, D หรือไม่
SELECT 
    id,
    job_code,
    job_name,
    production_date,
    workflow_status,
    job_type,
    status_id
FROM work_plans
WHERE job_code IN ('A', 'B', 'C', 'D')
  AND DATE(production_date) = '2025-11-01'  -- เปลี่ยนเป็นวันที่ที่ต้องการตรวจสอบ
ORDER BY job_code;

-- =====================================================
-- ขั้นตอนที่ 2: ตรวจสอบ operators ของงาน A, B, C, D
-- =====================================================

SELECT 
    wp.id,
    wp.job_code,
    wp.job_name,
    wp.production_date,
    wpo.id as operator_id,
    wpo.user_id,
    wpo.id_code,
    u.id as user_table_id,
    u.name as operator_name
FROM work_plans wp
LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
  AND DATE(wp.production_date) = '2025-11-01'  -- เปลี่ยนเป็นวันที่ที่ต้องการตรวจสอบ
ORDER BY wp.job_code, u.name;

-- =====================================================
-- ขั้นตอนที่ 3: สรุปจำนวน operators ของแต่ละงาน
-- =====================================================

SELECT 
    wp.id,
    wp.job_code,
    wp.job_name,
    COUNT(wpo.id) as operator_count,
    GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operator_names,
    GROUP_CONCAT(DISTINCT wpo.id_code ORDER BY wpo.id_code SEPARATOR ', ') as operator_codes
FROM work_plans wp
LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
  AND DATE(wp.production_date) = '2025-11-01'  -- เปลี่ยนเป็นวันที่ที่ต้องการตรวจสอบ
GROUP BY wp.id, wp.job_code, wp.job_name
ORDER BY wp.job_code;

-- =====================================================
-- ขั้นตอนที่ 4: ตรวจสอบว่า Backend จะดึงข้อมูลอย่างไร
-- (จำลอง query ที่ Backend ใช้)
-- =====================================================

SELECT 
    wpo.work_plan_id,
    GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join,
    GROUP_CONCAT(DISTINCT wpo.id_code ORDER BY wpo.id_code SEPARATOR ', ') as operator_codes
FROM work_plan_operators wpo
LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
WHERE wpo.work_plan_id IN (
    SELECT id FROM work_plans 
    WHERE job_code IN ('A', 'B', 'C', 'D')
      AND DATE(production_date) = '2025-11-01'  -- เปลี่ยนเป็นวันที่ที่ต้องการตรวจสอบ
)
GROUP BY wpo.work_plan_id;

-- =====================================================
-- ขั้นตอนที่ 5: ตรวจสอบข้อมูล users ทั้งหมด
-- (เพื่อดูว่ามีชื่อผู้ใช้ที่ถูกต้องหรือไม่)
-- =====================================================

SELECT id, id_code, name
FROM users
ORDER BY name;

-- =====================================================
-- ขั้นตอนที่ 6: เพิ่ม operators (ตัวอย่าง)
-- ใช้เฉพาะเมื่อต้องการเพิ่ม operators ให้กับงาน A, B, C, D
-- =====================================================

-- หา work_plan_id ของงาน A, B, C, D
-- SELECT id, job_code FROM work_plans 
-- WHERE job_code IN ('A', 'B', 'C', 'D')
--   AND DATE(production_date) = '2025-11-01';

-- เพิ่ม operators ให้กับงาน A (ตัวอย่าง)
-- เปลี่ยน work_plan_id และ id_code ให้ตรงกับข้อมูลจริง
/*
INSERT INTO work_plan_operators (work_plan_id, user_id, id_code)
VALUES 
  (123, NULL, 'พี่ภา'),   -- เปลี่ยน 123 เป็น work_plan_id จริงของงาน A
  (123, NULL, 'แจ็ค');
*/

-- เพิ่ม operators ให้กับงาน B (ตัวอย่าง)
/*
INSERT INTO work_plan_operators (work_plan_id, user_id, id_code)
VALUES 
  (124, NULL, 'แมน'),    -- เปลี่ยน 124 เป็น work_plan_id จริงของงาน B
  (124, NULL, 'อาร์ม');
*/

-- =====================================================
-- ขั้นตอนที่ 7: ลบ operators (ถ้าต้องการลบและเพิ่มใหม่)
-- =====================================================

-- ลบ operators ของงาน A, B, C, D (ระวัง! ลบข้อมูลจริง)
/*
DELETE wpo FROM work_plan_operators wpo
INNER JOIN work_plans wp ON wpo.work_plan_id = wp.id
WHERE wp.job_code IN ('A', 'B', 'C', 'D')
  AND DATE(wp.production_date) = '2025-11-01';
*/

-- =====================================================
-- หมายเหตุ:
-- =====================================================
-- 1. เปลี่ยนวันที่ '2025-11-01' เป็นวันที่ที่ต้องการตรวจสอบ
-- 2. ตรวจสอบว่า id_code ใน work_plan_operators ตรงกับ id_code ใน users table
-- 3. ถ้าไม่มี operators → ต้องเพิ่มข้อมูลใน work_plan_operators table
-- 4. ถ้ามี operators แต่ไม่แสดง → ตรวจสอบ Frontend และ Backend code
-- =====================================================

