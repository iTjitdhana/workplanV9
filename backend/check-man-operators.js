const { pool } = require('./config/database');

async function checkManOperators() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล "แมน" ใน database...\n');
    
    // 1. ตรวจสอบ users table
    console.log('📋 1. ตรวจสอบ users table:');
    const [users] = await pool.execute(`
      SELECT id, name, id_code 
      FROM users 
      WHERE name LIKE '%แมน%' OR id_code LIKE '%man%'
    `);
    
    if (users.length === 0) {
      console.log('   ❌ ไม่พบ "แมน" ใน users table\n');
    } else {
      console.log('   ✅ พบ "แมน":', users);
      const manUser = users[0];
      
      // 2. ตรวจสอบ work_plan_operators table
      console.log('\n📋 2. ตรวจสอบ work_plan_operators table:');
      const [operators] = await pool.execute(`
        SELECT 
          wpo.id,
          wpo.work_plan_id,
          wpo.user_id,
          wpo.id_code,
          wp.production_date,
          wp.job_code,
          wp.job_name,
          wp.start_time,
          wp.end_time,
          wp.workflow_status,
          wp.status_id,
          u.name as operator_name
        FROM work_plan_operators wpo
        LEFT JOIN work_plans wp ON wpo.work_plan_id = wp.id
        LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE (wpo.user_id = ? OR wpo.id_code = ? OR u.name LIKE '%แมน%')
          AND wp.job_code NOT IN ('A', 'B', 'C', 'D')
        ORDER BY wp.production_date DESC, wp.start_time ASC
        LIMIT 20
      `, [manUser.id, manUser.id_code]);
      
      console.log(`   ✅ พบ ${operators.length} รายการที่มี "แมน":\n`);
      
      if (operators.length > 0) {
        operators.forEach((op, idx) => {
          console.log(`   ${idx + 1}. Work Plan ID: ${op.work_plan_id}`);
          console.log(`      - วันที่: ${op.production_date}`);
          console.log(`      - งาน: ${op.job_code} - ${op.job_name}`);
          console.log(`      - เวลา: ${op.start_time || 'N/A'} - ${op.end_time || 'N/A'}`);
          console.log(`      - Status: ${op.workflow_status} (status_id: ${op.status_id})`);
          console.log(`      - Operator Name: ${op.operator_name}`);
          console.log('');
        });
        
        // 3. ตรวจสอบว่ามี operators_from_join หรือไม่
        console.log('📋 3. ตรวจสอบ operators_from_join สำหรับงานเหล่านี้:');
        const workPlanIds = operators.map(op => op.work_plan_id);
        
        if (workPlanIds.length > 0) {
          const placeholders = workPlanIds.map(() => '?').join(',');
          const [joinedOperators] = await pool.execute(`
            SELECT 
              wp.id as work_plan_id,
              wp.job_code,
              wp.job_name,
              GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join,
              GROUP_CONCAT(DISTINCT wpo.id_code ORDER BY wpo.id_code SEPARATOR ', ') as operator_codes,
              wp.start_time,
              wp.end_time
            FROM work_plans wp
            LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
            LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
            WHERE wp.id IN (${placeholders})
            GROUP BY wp.id, wp.job_code, wp.job_name, wp.start_time, wp.end_time
          `, workPlanIds);
          
          console.log(`   ✅ ผลการ JOIN:\n`);
          joinedOperators.forEach((wp, idx) => {
            console.log(`   ${idx + 1}. Work Plan ID: ${wp.work_plan_id}`);
            console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
            console.log(`      - operators_from_join: "${wp.operators_from_join || 'NULL'}"`);
            console.log(`      - operator_codes: "${wp.operator_codes || 'NULL'}"`);
            console.log(`      - เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
            console.log('');
          });
          
          // 4. ตรวจสอบว่างานเหล่านี้ถูกส่งไป frontend หรือไม่
          console.log('📋 4. ตรวจสอบว่างานเหล่านี้มี start_time และ end_time หรือไม่:');
          const [workPlansWithTime] = await pool.execute(`
            SELECT 
              wp.id,
              wp.job_code,
              wp.job_name,
              wp.start_time,
              wp.end_time,
              CASE 
                WHEN wp.start_time IS NULL OR wp.end_time IS NULL THEN '❌ ไม่มีเวลา'
                ELSE '✅ มีเวลา'
              END as time_status
            FROM work_plans wp
            WHERE wp.id IN (${placeholders})
          `, workPlanIds);
          
          console.log(`   ✅ ผลการตรวจสอบเวลา:\n`);
          workPlansWithTime.forEach((wp, idx) => {
            console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
            console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
            console.log(`      - ${wp.time_status}`);
            if (wp.start_time || wp.end_time) {
              console.log(`      - start_time: ${wp.start_time || 'NULL'}`);
              console.log(`      - end_time: ${wp.end_time || 'NULL'}`);
            }
            console.log('');
          });
        }
      } else {
        console.log('   ❌ ไม่พบงานที่มี "แมน" ใน work_plan_operators\n');
      }
    }
    
    // 5. ตรวจสอบงานทั้งหมดที่มี operators แต่ไม่มี start_time หรือ end_time
    console.log('\n📋 5. ตรวจสอบงานทั้งหมดที่มี operators แต่ไม่มีเวลา (ที่อาจถูกกรองออก):');
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
      console.log(`   ⚠️  พบ ${workPlansWithoutTime.length} รายการที่ไม่มีเวลา:\n`);
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

checkManOperators();

