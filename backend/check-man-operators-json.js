const { pool } = require('./config/database');

async function checkManOperatorsJson() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล "แมน" ใน work_plans.operators (JSON) ทั้งหมด...\n');
    
    // 1. ตรวจสอบงานทั้งหมดที่มี operators column (JSON) และมี "แมน" หรือ "man" หรือ "EMP007"
    console.log('📋 1. ตรวจสอบงานทั้งหมดที่มี "แมน" ใน work_plans.operators (JSON):');
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
        wp.status_id,
        wp.job_type
      FROM work_plans wp
      WHERE (
        wp.operators LIKE '%แมน%' 
        OR wp.operators LIKE '%man%'
        OR wp.operators LIKE '%EMP007%'
        OR wp.operators LIKE '%"แมน"%'
        OR wp.operators LIKE '%"man"%'
      )
      ORDER BY wp.production_date DESC, wp.start_time ASC
      LIMIT 30
    `);
    
    console.log(`   ✅ พบ ${workPlans.length} รายการที่มี "แมน" ใน operators column:\n`);
    
    if (workPlans.length > 0) {
      workPlans.forEach((wp, idx) => {
        console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
        console.log(`      - วันที่: ${wp.production_date}`);
        console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
        console.log(`      - job_type: ${wp.job_type || 'NULL'}`);
        const operatorsStr = typeof wp.operators === 'string' 
          ? wp.operators.substring(0, 200) 
          : JSON.stringify(wp.operators).substring(0, 200);
        console.log(`      - operators (JSON): ${wp.operators ? operatorsStr + '...' : 'NULL'}`);
        console.log(`      - เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
        console.log(`      - Status: ${wp.workflow_status} (status_id: ${wp.status_id})`);
        
        // Parse JSON operators
        try {
          let operatorsData = wp.operators;
          if (typeof operatorsData === 'string') {
            try {
              operatorsData = JSON.parse(operatorsData);
            } catch (e) {
              // ถ้า parse ไม่ได้ อาจจะเป็น string ธรรมดา
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
            
            // ตรวจสอบว่ามี "แมน" หรือไม่
            const hasMan = operatorNames.some(name => 
              name.includes('แมน') || 
              name.toLowerCase().includes('man') || 
              name.includes('EMP007')
            );
            if (hasMan) {
              console.log(`      - ✅ พบ "แมน" ใน operators array`);
            }
          } else if (typeof operatorsData === 'string') {
            console.log(`      - Operators (string): "${operatorsData}"`);
            if (operatorsData.includes('แมน') || operatorsData.toLowerCase().includes('man')) {
              console.log(`      - ✅ พบ "แมน" ใน operators string`);
            }
          } else {
            console.log(`      - Parsed operators: ${JSON.stringify(operatorsData)}`);
          }
        } catch (e) {
          console.log(`      - ⚠️  Cannot parse operators: ${e.message}`);
        }
        
        console.log('');
      });
      
      // 2. ตรวจสอบว่า work_plan_operators มีข้อมูลหรือไม่
      console.log('\n📋 2. ตรวจสอบว่า work_plan_operators มีข้อมูลสำหรับงานเหล่านี้หรือไม่:');
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
        ORDER BY wpo.work_plan_id
      `, workPlanIds);
      
      if (workPlanOperators.length > 0) {
        console.log(`   ✅ พบ ${workPlanOperators.length} รายการใน work_plan_operators\n`);
        
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
          const hasMan = group.operators.some(op => 
            op.includes('แมน') || op.toLowerCase().includes('man')
          );
          if (hasMan) {
            console.log(`      - ✅ พบ "แมน" ใน work_plan_operators`);
          } else {
            console.log(`      - ❌ ไม่พบ "แมน" ใน work_plan_operators (ต้อง migrate)`);
          }
          console.log('');
        });
      } else {
        console.log('   ❌ ไม่พบข้อมูลใน work_plan_operators สำหรับงานเหล่านี้\n');
        console.log('   💡 สรุป: ข้อมูล "แมน" อยู่ใน work_plans.operators แต่ยังไม่ได้ migrate ไป work_plan_operators\n');
      }
    } else {
      console.log('   ❌ ไม่พบงานที่มี "แมน" ใน work_plans.operators column\n');
      console.log('   💡 สรุป: "แมน" ไม่มีงานใดในระบบเลย (ทั้ง work_plans.operators และ work_plan_operators)\n');
    }
    
    await pool.end();
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkManOperatorsJson();

