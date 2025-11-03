const { pool } = require('./config/database');

async function verifyManAfterMigrate() {
  try {
    console.log('🔍 ตรวจสอบว่า "แมน" มีข้อมูลใน work_plan_operators หลัง migrate...\n');
    
    // 1. ตรวจสอบงานที่ไม่ใช่ default ที่มี "แมน"
    const [manJobs] = await pool.execute(`
      SELECT 
        wp.id,
        wp.production_date,
        wp.job_code,
        wp.job_name,
        wp.start_time,
        wp.end_time,
        GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join,
        COUNT(DISTINCT wpo.id) as operator_count
      FROM MNF_database.work_plans wp
      LEFT JOIN MNF_database.work_plan_operators wpo ON wp.id = wpo.work_plan_id
      LEFT JOIN MNF_database.users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
      WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
        AND (u.name LIKE '%แมน%' OR u.id_code LIKE '%man%' OR u.id_code LIKE '%EMP007%')
      GROUP BY wp.id, wp.production_date, wp.job_code, wp.job_name, wp.start_time, wp.end_time
      ORDER BY wp.production_date DESC, wp.start_time ASC
      LIMIT 20
    `);
    
    console.log(`📋 พบ ${manJobs.length} รายการที่มี "แมน" ใน work_plan_operators:\n`);
    
    if (manJobs.length > 0) {
      manJobs.forEach((job, idx) => {
        console.log(`   ${idx + 1}. Work Plan ID: ${job.id}`);
        console.log(`      - วันที่: ${job.production_date}`);
        console.log(`      - งาน: ${job.job_code} - ${job.job_name}`);
        console.log(`      - operators_from_join: "${job.operators_from_join || 'NULL'}"`);
        console.log(`      - เวลา: ${job.start_time || 'N/A'} - ${job.end_time || 'N/A'}`);
        console.log(`      - จำนวน operators: ${job.operator_count}`);
        console.log('');
      });
      
      // 2. ตรวจสอบงานล่าสุด (Nov 01 และ Oct 31)
      console.log('\n📋 งานล่าสุดที่มี "แมน":\n');
      const recentDates = ['2025-11-01', '2025-10-31'];
      
      for (const date of recentDates) {
        const [recentJobs] = await pool.execute(`
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
          WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
            AND DATE(wp.production_date) = ?
            AND (u.name LIKE '%แมน%' OR u.id_code LIKE '%man%' OR u.id_code LIKE '%EMP007%')
          GROUP BY wp.id, wp.production_date, wp.job_code, wp.job_name, wp.start_time, wp.end_time
          ORDER BY wp.start_time ASC
        `, [date]);
        
        if (recentJobs.length > 0) {
          console.log(`   📅 วันที่ ${date}:\n`);
          recentJobs.forEach((job, idx) => {
            console.log(`   ${idx + 1}. ${job.job_code} - ${job.job_name}`);
            console.log(`      - เวลา: ${job.start_time || 'N/A'} - ${job.end_time || 'N/A'}`);
            console.log(`      - operators: "${job.operators_from_join}"`);
            console.log('');
          });
        }
      }
      
      // 3. สรุปจำนวนงานทั้งหมด
      const [totalCount] = await pool.execute(`
        SELECT COUNT(DISTINCT wp.id) as total
        FROM MNF_database.work_plans wp
        LEFT JOIN MNF_database.work_plan_operators wpo ON wp.id = wpo.work_plan_id
        LEFT JOIN MNF_database.users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
          AND (u.name LIKE '%แมน%' OR u.id_code LIKE '%man%' OR u.id_code LIKE '%EMP007%')
      `);
      
      console.log(`\n✅ สรุป: พบงานทั้งหมด ${totalCount[0].total} รายการที่มี "แมน" ใน work_plan_operators\n`);
      console.log('✅ ตอนนี้ "แมน" ควรจะแสดงใน TimeTablePopup แล้วสำหรับงานที่ไม่ใช่ A, B, C, D\n');
      
    } else {
      console.log('   ❌ ยังไม่พบงานที่มี "แมน" ใน work_plan_operators\n');
    }
    
    await pool.end();
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyManAfterMigrate();

