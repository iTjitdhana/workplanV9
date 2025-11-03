const { pool } = require('./config/database');

async function checkManInMove1112025() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล "แมน" ใน database Move1112025...\n');
    
    // 1. ตรวจสอบ work_plan_drafts ใน Move1112025
    console.log('📋 1. ตรวจสอบ work_plan_drafts ใน Move1112025:');
    const [drafts] = await pool.execute(`
      SELECT 
        wpd.id,
        wpd.production_date,
        wpd.job_code,
        wpd.job_name,
        wpd.operators,
        wpd.start_time,
        wpd.end_time,
        wpd.workflow_status_id,
        wpd.is_special
      FROM Move1112025.work_plan_drafts wpd
      WHERE (
        wpd.operators LIKE '%แมน%' 
        OR wpd.operators LIKE '%man%'
        OR wpd.operators LIKE '%EMP007%'
        OR wpd.operators LIKE '%"แมน"%'
        OR wpd.operators LIKE '%"man"%'
      )
      ORDER BY wpd.production_date DESC, wpd.start_time ASC
      LIMIT 30
    `);
    
    console.log(`   ✅ พบ ${drafts.length} รายการที่มี "แมน" ใน work_plan_drafts:\n`);
    
    if (drafts.length > 0) {
      drafts.forEach((draft, idx) => {
        console.log(`   ${idx + 1}. Draft ID: ${draft.id}`);
        console.log(`      - วันที่: ${draft.production_date}`);
        console.log(`      - งาน: ${draft.job_code} - ${draft.job_name}`);
        console.log(`      - workflow_status_id: ${draft.workflow_status_id}`);
        console.log(`      - is_special: ${draft.is_special}`);
        
        const operatorsStr = typeof draft.operators === 'string' 
          ? draft.operators.substring(0, 200) 
          : JSON.stringify(draft.operators).substring(0, 200);
        console.log(`      - operators: ${draft.operators ? operatorsStr + '...' : 'NULL'}`);
        console.log(`      - เวลา: ${draft.start_time || 'N/A'} - ${draft.end_time || 'N/A'}`);
        
        // Parse JSON operators
        try {
          let operatorsData = draft.operators;
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
          }
        } catch (e) {
          console.log(`      - ⚠️  Cannot parse operators: ${e.message}`);
        }
        
        console.log('');
      });
      
      // 2. นับจำนวนงานทั้งหมดที่มี "แมน"
      const [countResult] = await pool.execute(`
        SELECT COUNT(*) as total_count
        FROM Move1112025.work_plan_drafts wpd
        WHERE (
          wpd.operators LIKE '%แมน%' 
          OR wpd.operators LIKE '%man%'
          OR wpd.operators LIKE '%EMP007%'
        )
      `);
      console.log(`\n   📊 จำนวนงานทั้งหมดที่มี "แมน": ${countResult[0].total_count} รายการ\n`);
      
      // 3. ตรวจสอบว่างานเหล่านี้เป็นงาน A, B, C, D หรือไม่
      const [jobTypeStats] = await pool.execute(`
        SELECT 
          wpd.job_code,
          COUNT(*) as count
        FROM Move1112025.work_plan_drafts wpd
        WHERE (
          wpd.operators LIKE '%แมน%' 
          OR wpd.operators LIKE '%man%'
          OR wpd.operators LIKE '%EMP007%'
        )
        GROUP BY wpd.job_code
        ORDER BY count DESC
      `);
      
      console.log('   📊 จำนวนงานแยกตาม job_code:\n');
      jobTypeStats.forEach((stat, idx) => {
        const isDefault = ['A', 'B', 'C', 'D'].includes(stat.job_code);
        console.log(`   ${idx + 1}. Job Code: ${stat.job_code} - จำนวน: ${stat.count} รายการ ${isDefault ? '(default)' : '(งานอื่น)'}`);
      });
      console.log('');
      
    } else {
      console.log('   ❌ ไม่พบงานที่มี "แมน" ใน work_plan_drafts\n');
    }
    
    // 4. ตรวจสอบว่ามีงานที่ไม่ใช่ A, B, C, D ที่มี "แมน" หรือไม่
    console.log('\n📋 2. ตรวจสอบงานที่ไม่ใช่ A, B, C, D ที่มี "แมน":');
    const [nonDefaultJobs] = await pool.execute(`
      SELECT 
        wpd.id,
        wpd.production_date,
        wpd.job_code,
        wpd.job_name,
        wpd.operators,
        wpd.start_time,
        wpd.end_time
      FROM Move1112025.work_plan_drafts wpd
      WHERE wpd.job_code NOT IN ('A', 'B', 'C', 'D')
        AND (
          wpd.operators LIKE '%แมน%' 
          OR wpd.operators LIKE '%man%'
          OR wpd.operators LIKE '%EMP007%'
        )
      ORDER BY wpd.production_date DESC, wpd.start_time ASC
      LIMIT 20
    `);
    
    console.log(`   ✅ พบ ${nonDefaultJobs.length} รายการที่ไม่ใช่ A, B, C, D:\n`);
    
    if (nonDefaultJobs.length > 0) {
      nonDefaultJobs.forEach((job, idx) => {
        console.log(`   ${idx + 1}. Draft ID: ${job.id}`);
        console.log(`      - วันที่: ${job.production_date}`);
        console.log(`      - งาน: ${job.job_code} - ${job.job_name}`);
        console.log(`      - เวลา: ${job.start_time || 'N/A'} - ${job.end_time || 'N/A'}`);
        
        const operatorsStr = typeof job.operators === 'string' 
          ? job.operators.substring(0, 150) 
          : JSON.stringify(job.operators).substring(0, 150);
        console.log(`      - operators: ${job.operators ? operatorsStr + '...' : 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('   ❌ ไม่พบงานที่ไม่ใช่ A, B, C, D ที่มี "แมน"\n');
    }
    
    // 5. ตรวจสอบว่างานเหล่านี้ถูก migrate ไป MNF_database หรือยัง
    if (nonDefaultJobs.length > 0) {
      console.log('\n📋 3. ตรวจสอบว่างานเหล่านี้ถูก migrate ไป MNF_database.work_plans หรือยัง:');
      const draftIds = nonDefaultJobs.map(j => j.id);
      const placeholders = draftIds.map(() => '?').join(',');
      
      const [migrated] = await pool.execute(`
        SELECT 
          wp.id,
          wp.job_code,
          wp.job_name,
          wp.production_date,
          GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join,
          wp.start_time,
          wp.end_time
        FROM MNF_database.work_plans wp
        LEFT JOIN MNF_database.work_plan_operators wpo ON wp.id = wpo.work_plan_id
        LEFT JOIN MNF_database.users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE wp.job_code IN (
          SELECT DISTINCT job_code 
          FROM Move1112025.work_plan_drafts 
          WHERE id IN (${placeholders})
        )
        AND wp.production_date IN (
          SELECT DISTINCT production_date 
          FROM Move1112025.work_plan_drafts 
          WHERE id IN (${placeholders})
        )
        GROUP BY wp.id, wp.job_code, wp.job_name, wp.production_date, wp.start_time, wp.end_time
        ORDER BY wp.production_date DESC
        LIMIT 20
      `, [...draftIds, ...draftIds]);
      
      if (migrated.length > 0) {
        console.log(`   ✅ พบ ${migrated.length} รายการที่อาจจะถูก migrate แล้ว:\n`);
        migrated.forEach((wp, idx) => {
          console.log(`   ${idx + 1}. Work Plan ID: ${wp.id}`);
          console.log(`      - วันที่: ${wp.production_date}`);
          console.log(`      - งาน: ${wp.job_code} - ${wp.job_name}`);
          console.log(`      - operators_from_join: "${wp.operators_from_join || 'NULL'}"`);
          const hasMan = wp.operators_from_join && (
            wp.operators_from_join.includes('แมน') || 
            wp.operators_from_join.toLowerCase().includes('man')
          );
          if (hasMan) {
            console.log(`      - ✅ พบ "แมน" ใน operators_from_join`);
          } else {
            console.log(`      - ❌ ไม่พบ "แมน" ใน operators_from_join`);
          }
          console.log(`      - เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('   ❌ ไม่พบงานที่ถูก migrate ไป MNF_database\n');
      }
    }
    
    await pool.end();
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkManInMove1112025();

