const { pool } = require('./config/database');

async function checkManInMove1112025WorkPlans() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล "แมน" ใน Move1112025.work_plans.operators...\n');
    
    // 1. ตรวจสอบงานทั้งหมดที่มี "แมน" ใน work_plans.operators
    console.log('📋 1. ตรวจสอบงานทั้งหมดที่มี "แมน" ใน Move1112025.work_plans.operators:');
    const [workPlans] = await pool.execute(`
      SELECT 
        wp.id,
        wp.production_date,
        wp.job_code,
        wp.job_name,
        wp.operators,
        wp.start_time,
        wp.end_time
      FROM Move1112025.work_plans wp
      WHERE (
        wp.operators LIKE '%แมน%' 
        OR wp.operators LIKE '%man%'
        OR wp.operators LIKE '%EMP007%'
        OR wp.operators LIKE '%"แมน"%'
        OR wp.operators LIKE '%"man"%'
      )
      ORDER BY wp.production_date DESC, wp.start_time ASC
      LIMIT 50
    `);
    
    console.log(`   ✅ พบ ${workPlans.length} รายการที่มี "แมน" ใน operators column:\n`);
    
    if (workPlans.length > 0) {
      workPlans.forEach((wp, idx) => {
        console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
        console.log(`      - วันที่: ${wp.production_date}`);
        console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
        
        const operatorsStr = typeof wp.operators === 'string' 
          ? wp.operators.substring(0, 200) 
          : JSON.stringify(wp.operators).substring(0, 200);
        console.log(`      - operators: ${wp.operators ? operatorsStr + '...' : 'NULL'}`);
        console.log(`      - เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
        
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
      
      // 2. นับจำนวนงานทั้งหมดที่มี "แมน"
      const [countResult] = await pool.execute(`
        SELECT COUNT(*) as total_count
        FROM Move1112025.work_plans wp
        WHERE (
          wp.operators LIKE '%แมน%' 
          OR wp.operators LIKE '%man%'
          OR wp.operators LIKE '%EMP007%'
        )
      `);
      console.log(`\n   📊 จำนวนงานทั้งหมดที่มี "แมน": ${countResult[0].total_count} รายการ\n`);
      
      // 3. ตรวจสอบว่างานเหล่านี้เป็นงาน A, B, C, D หรือไม่
      const [jobTypeStats] = await pool.execute(`
        SELECT 
          wp.job_code,
          COUNT(*) as count
        FROM Move1112025.work_plans wp
        WHERE (
          wp.operators LIKE '%แมน%' 
          OR wp.operators LIKE '%man%'
          OR wp.operators LIKE '%EMP007%'
        )
        GROUP BY wp.job_code
        ORDER BY count DESC
      `);
      
      console.log('   📊 จำนวนงานแยกตาม job_code:\n');
      jobTypeStats.forEach((stat, idx) => {
        const isDefault = ['A', 'B', 'C', 'D'].includes(stat.job_code);
        console.log(`   ${idx + 1}. Job Code: ${stat.job_code} - จำนวน: ${stat.count} รายการ ${isDefault ? '(default)' : '(งานอื่น)'}`);
      });
      console.log('');
      
      // 4. ตรวจสอบว่ามีงานที่ไม่ใช่ A, B, C, D ที่มี "แมน" หรือไม่
      console.log('\n📋 2. ตรวจสอบงานที่ไม่ใช่ A, B, C, D ที่มี "แมน":');
      const [nonDefaultJobs] = await pool.execute(`
        SELECT 
          wp.id,
          wp.production_date,
          wp.job_code,
          wp.job_name,
          wp.operators,
          wp.start_time,
          wp.end_time
        FROM Move1112025.work_plans wp
        WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
          AND (
            wp.operators LIKE '%แมน%' 
            OR wp.operators LIKE '%man%'
            OR wp.operators LIKE '%EMP007%'
          )
        ORDER BY wp.production_date DESC, wp.start_time ASC
        LIMIT 30
      `);
      
      console.log(`   ✅ พบ ${nonDefaultJobs.length} รายการที่ไม่ใช่ A, B, C, D:\n`);
      
      if (nonDefaultJobs.length > 0) {
        nonDefaultJobs.forEach((job, idx) => {
          console.log(`   ${idx + 1}. Work Plan ID: ${job.id}`);
          console.log(`      - วันที่: ${job.production_date}`);
          console.log(`      - งาน: ${job.job_code} - ${job.job_name}`);
          console.log(`      - เวลา: ${job.start_time || 'N/A'} - ${job.end_time || 'N/A'}`);
          
          const operatorsStr = typeof job.operators === 'string' 
            ? job.operators.substring(0, 150) 
            : JSON.stringify(job.operators).substring(0, 150);
          console.log(`      - operators: ${job.operators ? operatorsStr + '...' : 'NULL'}`);
          
          // Parse และแสดง operators
          try {
            let operatorsData = job.operators;
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
            } else if (typeof operatorsData === 'string') {
              console.log(`      - Operators (string): "${operatorsData}"`);
            }
          } catch (e) {
            // ignore parse errors
          }
          
          console.log('');
        });
      } else {
        console.log('   ❌ ไม่พบงานที่ไม่ใช่ A, B, C, D ที่มี "แมน"\n');
      }
      
      // 5. ตรวจสอบวันที่ล่าสุดที่มีงานที่ไม่ใช่ default
      if (nonDefaultJobs.length > 0) {
        console.log('\n📋 3. สรุปวันที่ที่มีงานที่ไม่ใช่ default:');
        const [dateStats] = await pool.execute(`
          SELECT 
            DATE(wp.production_date) as production_date,
            COUNT(*) as count,
            GROUP_CONCAT(DISTINCT wp.job_code ORDER BY wp.job_code SEPARATOR ', ') as job_codes
          FROM Move1112025.work_plans wp
          WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
            AND (
              wp.operators LIKE '%แมน%' 
              OR wp.operators LIKE '%man%'
              OR wp.operators LIKE '%EMP007%'
            )
          GROUP BY DATE(wp.production_date)
          ORDER BY production_date DESC
          LIMIT 10
        `);
        
        console.log(`   ✅ พบ ${dateStats.length} วันที่:\n`);
        dateStats.forEach((stat, idx) => {
          console.log(`   ${idx + 1}. ${stat.production_date} - จำนวน: ${stat.count} งาน (${stat.job_codes})`);
        });
        console.log('');
      }
    } else {
      console.log('   ❌ ไม่พบงานที่มี "แมน" ใน Move1112025.work_plans.operators\n');
    }
    
    await pool.end();
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkManInMove1112025WorkPlans();

