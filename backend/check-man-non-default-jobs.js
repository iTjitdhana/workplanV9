const { pool } = require('./config/database');

async function checkManNonDefaultJobs() {
  try {
    console.log('🔍 ตรวจสอบงานที่ไม่ใช่ default ที่มี "แมน" ใน MNF_database...\n');
    
    // 1. ตรวจสอบงาน 215308 และ 135004 ที่มี "แมน"
    console.log('📋 1. ตรวจสอบงานที่ไม่ใช่ A, B, C, D ที่มี "แมน" ใน MNF_database.work_plans:');
    const [workPlans] = await pool.execute(`
      SELECT 
        wp.id,
        wp.production_date,
        wp.job_code,
        wp.job_name,
        wp.start_time,
        wp.end_time,
        wp.workflow_status,
        wp.status_id,
        wp.job_type
      FROM MNF_database.work_plans wp
      WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
        AND (
          wp.job_code = '215308' 
          OR wp.job_code = '135004'
        )
      ORDER BY wp.production_date DESC, wp.start_time ASC
      LIMIT 20
    `);
    
    console.log(`   ✅ พบ ${workPlans.length} รายการ:\n`);
    
    if (workPlans.length > 0) {
      workPlans.forEach((wp, idx) => {
        console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
        console.log(`      - วันที่: ${wp.production_date}`);
        console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
        console.log(`      - job_type: ${wp.job_type || 'NULL'}`);
        console.log(`      - เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
        console.log(`      - Status: ${wp.workflow_status} (status_id: ${wp.status_id})`);
        console.log('');
      });
      
      // 2. ตรวจสอบว่า work_plan_operators มี "แมน" หรือไม่
      console.log('\n📋 2. ตรวจสอบว่า work_plan_operators มี "แมน" สำหรับงานเหล่านี้:');
      const workPlanIds = workPlans.map(wp => wp.id);
      const placeholders = workPlanIds.map(() => '?').join(',');
      
      const [operators] = await pool.execute(`
        SELECT 
          wpo.work_plan_id,
          wp.job_code,
          wp.job_name,
          wp.production_date,
          wp.start_time,
          wp.end_time,
          GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join,
          GROUP_CONCAT(DISTINCT wpo.id_code ORDER BY wpo.id_code SEPARATOR ', ') as operator_codes,
          COUNT(DISTINCT wpo.id) as operator_count
        FROM MNF_database.work_plan_operators wpo
        LEFT JOIN MNF_database.work_plans wp ON wpo.work_plan_id = wp.id
        LEFT JOIN MNF_database.users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE wpo.work_plan_id IN (${placeholders})
        GROUP BY wpo.work_plan_id, wp.job_code, wp.job_name, wp.production_date, wp.start_time, wp.end_time
        ORDER BY wp.production_date DESC, wp.start_time ASC
      `, workPlanIds);
      
      if (operators.length > 0) {
        console.log(`   ✅ พบ ${operators.length} รายการที่มี operators:\n`);
        operators.forEach((op, idx) => {
          console.log(`   ${idx + 1}. Work Plan ID: ${op.work_plan_id}`);
          console.log(`      - วันที่: ${op.production_date}`);
          console.log(`      - งาน: ${op.job_code} - ${op.job_name}`);
          console.log(`      - operators_from_join: "${op.operators_from_join || 'NULL'}"`);
          console.log(`      - เวลา: ${op.start_time || 'N/A'} - ${op.end_time || 'N/A'}`);
          console.log(`      - จำนวน operators: ${op.operator_count}`);
          
          const hasMan = op.operators_from_join && (
            op.operators_from_join.includes('แมน') || 
            op.operators_from_join.toLowerCase().includes('man')
          );
          if (hasMan) {
            console.log(`      - ✅ พบ "แมน" ใน operators_from_join`);
          } else {
            console.log(`      - ❌ ไม่พบ "แมน" ใน operators_from_join`);
          }
          console.log('');
        });
      } else {
        console.log('   ❌ ไม่พบ operators ใน work_plan_operators สำหรับงานเหล่านี้\n');
      }
      
      // 3. ตรวจสอบว่ามี "แมน" ใน operators column (JSON) หรือไม่
      console.log('\n📋 3. ตรวจสอบว่ามี "แมน" ใน work_plans.operators (JSON column):');
      const [workPlansWithOperators] = await pool.execute(`
        SELECT 
          wp.id,
          wp.production_date,
          wp.job_code,
          wp.job_name,
          wp.operators,
          wp.start_time,
          wp.end_time
        FROM MNF_database.work_plans wp
        WHERE wp.id IN (${placeholders})
          AND wp.operators IS NOT NULL
          AND wp.operators != ''
          AND (
            wp.operators LIKE '%แมน%' 
            OR wp.operators LIKE '%man%'
            OR wp.operators LIKE '%EMP007%'
          )
      `, workPlanIds);
      
      if (workPlansWithOperators.length > 0) {
        console.log(`   ✅ พบ ${workPlansWithOperators.length} รายการที่มี "แมน" ใน operators column:\n`);
        workPlansWithOperators.forEach((wp, idx) => {
          console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
          console.log(`      - วันที่: ${wp.production_date}`);
          console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
          console.log(`      - เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
          
          try {
            let operatorsData = wp.operators;
            if (typeof operatorsData === 'string') {
              try {
                operatorsData = JSON.parse(operatorsData);
              } catch (e) {
                operatorsData = operatorsData;
              }
            }
            
            if (Array.isArray(operatorsData)) {
              const operatorNames = operatorsData.map(op => {
                if (typeof op === 'string') return op;
                if (typeof op === 'object' && op !== null) {
                  return op.name || op.id_code || JSON.stringify(op);
                }
                return String(op);
              }).filter(Boolean);
              console.log(`      - Parsed operators: [${operatorNames.join(', ')}]`);
              
              const hasMan = operatorNames.some(name => 
                name.includes('แมน') || 
                name.toLowerCase().includes('man')
              );
              if (hasMan) {
                console.log(`      - ✅ พบ "แมน" ใน operators array`);
              }
            }
          } catch (e) {
            console.log(`      - ⚠️  Cannot parse operators: ${e.message}`);
          }
          console.log('');
        });
      } else {
        console.log('   ❌ ไม่พบ "แมน" ใน work_plans.operators column\n');
      }
      
      // 4. สรุปผลการตรวจสอบ
      console.log('\n📋 4. สรุปผลการตรวจสอบ:\n');
      
      // ตรวจสอบงาน Sep 01 2025 โดยเฉพาะ
      const [sep01Jobs] = await pool.execute(`
        SELECT 
          wp.id,
          wp.production_date,
          wp.job_code,
          wp.job_name,
          wp.start_time,
          wp.end_time,
          GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join
        FROM MNF_database.work_plans wp
        LEFT JOIN MNF_database.work_plan_operators wpo ON wp.id = wpo.work_plan_id
        LEFT JOIN MNF_database.users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE wp.job_code IN ('215308', '135004')
          AND DATE(wp.production_date) = '2025-09-01'
        GROUP BY wp.id, wp.production_date, wp.job_code, wp.job_name, wp.start_time, wp.end_time
      `);
      
      if (sep01Jobs.length > 0) {
        console.log('   ✅ พบงานวันที่ Sep 01 2025:\n');
        sep01Jobs.forEach((job, idx) => {
          console.log(`   ${idx + 1}. Work Plan ID: ${job.id}`);
          console.log(`      - งาน: ${job.job_code} - ${job.job_name}`);
          console.log(`      - operators_from_join: "${job.operators_from_join || 'NULL'}"`);
          console.log(`      - เวลา: ${job.start_time || 'N/A'} - ${job.end_time || 'N/A'}`);
          
          const hasMan = job.operators_from_join && (
            job.operators_from_join.includes('แมน') || 
            job.operators_from_join.toLowerCase().includes('man')
          );
          if (hasMan) {
            console.log(`      - ✅ พบ "แมน" - ควรแสดงใน TimeTablePopup`);
          } else {
            console.log(`      - ❌ ไม่พบ "แมน" - ไม่แสดงใน TimeTablePopup`);
          }
          console.log('');
        });
      } else {
        console.log('   ❌ ไม่พบงานวันที่ Sep 01 2025 ใน MNF_database\n');
        console.log('   💡 สรุป: งานเหล่านี้ยังไม่ได้ถูก migrate ไป MNF_database\n');
      }
    } else {
      console.log('   ❌ ไม่พบงาน 215308 หรือ 135004 ใน MNF_database\n');
    }
    
    await pool.end();
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkManNonDefaultJobs();

