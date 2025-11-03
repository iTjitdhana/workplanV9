const { pool } = require('./config/database');

async function checkManInWorkPlans() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล "แมน" ใน work_plans.operators (JSON column)...\n');
    
    // 1. ตรวจสอบ work_plans ที่มี operators column (JSON) และมี "แมน"
    console.log('📋 1. ตรวจสอบ work_plans.operators column:');
    const [workPlans] = await pool.execute(`
      SELECT 
        wp.id,
        wp.production_date,
        wp.job_code,
        wp.job_name,
        wp.operators,
        wp.start_time,
        wp.end_time,
        wp.workflow_status,
        wp.status_id
      FROM work_plans wp
      WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
        AND wp.operators IS NOT NULL
        AND wp.operators != ''
        AND wp.operators != '[]'
        AND (
          wp.operators LIKE '%แมน%' 
          OR wp.operators LIKE '%man%'
          OR wp.operators LIKE '%EMP007%'
        )
      ORDER BY wp.production_date DESC, wp.start_time ASC
      LIMIT 20
    `);
    
    console.log(`   ✅ พบ ${workPlans.length} รายการที่มี "แมน" ใน operators column:\n`);
    
    if (workPlans.length > 0) {
      workPlans.forEach((wp, idx) => {
        console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
        console.log(`      - วันที่: ${wp.production_date}`);
        console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
        console.log(`      - operators (JSON): ${wp.operators}`);
        console.log(`      - เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
        console.log(`      - Status: ${wp.workflow_status} (status_id: ${wp.status_id})`);
        
        // Parse JSON operators
        try {
          let operatorsData = wp.operators;
          if (typeof operatorsData === 'string') {
            operatorsData = JSON.parse(operatorsData);
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
          } else {
            console.log(`      - Parsed operators: ${operatorsData}`);
          }
        } catch (e) {
          console.log(`      - ⚠️  Cannot parse operators JSON: ${e.message}`);
        }
        
        console.log('');
      });
      
      // 2. ตรวจสอบว่า work_plan_operators มีข้อมูลหรือไม่
      console.log('\n📋 2. ตรวจสอบว่า work_plan_operators มีข้อมูลหรือไม่:');
      const workPlanIds = workPlans.map(wp => wp.id);
      const placeholders = workPlanIds.map(() => '?').join(',');
      
      const [workPlanOperators] = await pool.execute(`
        SELECT 
          wpo.work_plan_id,
          wpo.user_id,
          wpo.id_code,
          u.name as operator_name,
          wp.job_code,
          wp.job_name
        FROM work_plan_operators wpo
        LEFT JOIN work_plans wp ON wpo.work_plan_id = wp.id
        LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE wpo.work_plan_id IN (${placeholders})
      `, workPlanIds);
      
      console.log(`   ✅ พบ ${workPlanOperators.length} รายการใน work_plan_operators:\n`);
      
      if (workPlanOperators.length > 0) {
        // Group by work_plan_id
        const grouped = {};
        workPlanOperators.forEach(wpo => {
          if (!grouped[wpo.work_plan_id]) {
            grouped[wpo.work_plan_id] = {
              work_plan_id: wpo.work_plan_id,
              job_code: wpo.job_code,
              job_name: wpo.job_name,
              operators: []
            };
          }
          grouped[wpo.work_plan_id].operators.push(wpo.operator_name || wpo.id_code);
        });
        
        Object.values(grouped).forEach((group, idx) => {
          console.log(`   ${idx + 1}. Work Plan ID: ${group.work_plan_id}`);
          console.log(`      - งาน: ${group.job_code} - ${group.job_name}`);
          console.log(`      - operators: [${group.operators.join(', ')}]`);
          console.log('');
        });
      } else {
        console.log('   ❌ ไม่พบข้อมูลใน work_plan_operators สำหรับงานเหล่านี้\n');
        console.log('   💡 สาเหตุ: ข้อมูล operators ใน work_plans.operators ยังไม่ได้ migrate ไป work_plan_operators\n');
      }
      
      // 3. ตรวจสอบว่ามี "แมน" ใน work_plan_operators หรือไม่
      console.log('\n📋 3. ตรวจสอบว่ามี "แมน" ใน work_plan_operators หรือไม่:');
      const [manInOperators] = await pool.execute(`
        SELECT 
          wpo.work_plan_id,
          wp.job_code,
          wp.job_name,
          u.name as operator_name,
          u.id_code
        FROM work_plan_operators wpo
        LEFT JOIN work_plans wp ON wpo.work_plan_id = wp.id
        LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE (u.name LIKE '%แมน%' OR u.id_code LIKE '%EMP007%')
          AND wp.job_code NOT IN ('A', 'B', 'C', 'D')
      `);
      
      if (manInOperators.length > 0) {
        console.log(`   ✅ พบ ${manInOperators.length} รายการที่มี "แมน" ใน work_plan_operators:\n`);
        manInOperators.forEach((op, idx) => {
          console.log(`   ${idx + 1}. Work Plan ID: ${op.work_plan_id}`);
          console.log(`      - งาน: ${op.job_code} - ${op.job_name}`);
          console.log(`      - Operator: ${op.operator_name} (${op.id_code})`);
          console.log('');
        });
      } else {
        console.log('   ❌ ไม่พบ "แมน" ใน work_plan_operators\n');
        console.log('   💡 สรุป: ข้อมูล "แมน" อยู่ใน work_plans.operators แต่ยังไม่ได้ migrate ไป work_plan_operators\n');
      }
    } else {
      console.log('   ❌ ไม่พบงานที่มี "แมน" ใน work_plans.operators column\n');
    }
    
    await pool.end();
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkManInWorkPlans();

