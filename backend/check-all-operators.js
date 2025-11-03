const { pool } = require('./config/database');

async function checkAllOperators() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล operators ทั้งหมด...\n');
    
    // 1. ตรวจสอบ users ทั้งหมด
    console.log('📋 1. Users ทั้งหมด:');
    const [users] = await pool.execute(`
      SELECT id, name, id_code 
      FROM users 
      ORDER BY name
    `);
    console.log(`   ✅ พบ ${users.length} users:`);
    users.forEach(u => {
      console.log(`      - ${u.name} (${u.id_code || 'N/A'}) - ID: ${u.id}`);
    });
    console.log('');
    
    // 2. ตรวจสอบงานทั้งหมดที่มี operators ใน work_plan_operators
    console.log('📋 2. งานทั้งหมดที่มี operators ใน work_plan_operators (ล่าสุด 20 รายการ):');
    const [workPlansWithOperators] = await pool.execute(`
      SELECT 
        wp.id,
        wp.production_date,
        wp.job_code,
        wp.job_name,
        wp.start_time,
        wp.end_time,
        GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join,
        GROUP_CONCAT(DISTINCT wpo.id_code ORDER BY wpo.id_code SEPARATOR ', ') as operator_codes,
        COUNT(DISTINCT wpo.id) as operator_count
      FROM work_plans wp
      LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
      LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
      WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
        AND wpo.id IS NOT NULL
      GROUP BY wp.id, wp.production_date, wp.job_code, wp.job_name, wp.start_time, wp.end_time
      ORDER BY wp.production_date DESC, wp.start_time ASC
      LIMIT 20
    `);
    
    console.log(`   ✅ พบ ${workPlansWithOperators.length} รายการ:\n`);
    workPlansWithOperators.forEach((wp, idx) => {
      console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
      console.log(`      - วันที่: ${wp.production_date}`);
      console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
      console.log(`      - operators_from_join: "${wp.operators_from_join || 'NULL'}"`);
      console.log(`      - เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
      console.log(`      - จำนวน operators: ${wp.operator_count}`);
      console.log('');
    });
    
    // 3. ตรวจสอบรายชื่อ operators ทั้งหมดที่อยู่ใน work_plan_operators
    console.log('\n📋 3. รายชื่อ operators ทั้งหมดที่อยู่ใน work_plan_operators:');
    const [allOperators] = await pool.execute(`
      SELECT 
        DISTINCT u.name as operator_name,
        u.id_code,
        COUNT(DISTINCT wpo.work_plan_id) as job_count
      FROM work_plan_operators wpo
      LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
      LEFT JOIN work_plans wp ON wpo.work_plan_id = wp.id
      WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
        AND u.name IS NOT NULL
      GROUP BY u.name, u.id_code
      ORDER BY u.name
    `);
    
    console.log(`   ✅ พบ ${allOperators.length} operators:\n`);
    allOperators.forEach((op, idx) => {
      console.log(`   ${idx + 1}. ${op.operator_name} (${op.id_code || 'N/A'}) - จำนวนงาน: ${op.job_count}`);
    });
    console.log('');
    
    // 4. ตรวจสอบงานที่อาจจะมีปัญหา (มี work_plan_operators แต่ไม่มีเวลา)
    console.log('\n📋 4. งานที่มี operators แต่ไม่มีเวลา (จะถูกกรองออก):');
    const [workPlansWithoutTime] = await pool.execute(`
      SELECT 
        wp.id,
        wp.production_date,
        wp.job_code,
        wp.job_name,
        wp.start_time,
        wp.end_time,
        GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join
      FROM work_plans wp
      LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
      LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
      WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
        AND wpo.id IS NOT NULL
        AND (wp.start_time IS NULL OR wp.end_time IS NULL)
      GROUP BY wp.id, wp.production_date, wp.job_code, wp.job_name, wp.start_time, wp.end_time
      ORDER BY wp.production_date DESC
      LIMIT 10
    `);
    
    if (workPlansWithoutTime.length > 0) {
      console.log(`   ⚠️  พบ ${workPlansWithoutTime.length} รายการ:\n`);
      workPlansWithoutTime.forEach((wp, idx) => {
        console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
        console.log(`      - วันที่: ${wp.production_date}`);
        console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
        console.log(`      - operators_from_join: "${wp.operators_from_join || 'NULL'}"`);
        console.log(`      - start_time: ${wp.start_time || 'NULL'}`);
        console.log(`      - end_time: ${wp.end_time || 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('   ✅ ไม่พบงานที่ไม่มีเวลา\n');
    }
    
    await pool.end();
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllOperators();

