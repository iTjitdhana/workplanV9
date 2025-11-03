const { pool } = require('./config/database');

async function checkManRecentDates() {
  try {
    console.log('🔍 ตรวจสอบ "แมน" ในวันที่ Nov 01 และ Oct 31...\n');
    
    const dates = ['2025-11-01', '2025-10-31'];
    
    for (const date of dates) {
      console.log(`📅 วันที่ ${date}:\n`);
      
      const [jobs] = await pool.execute(`
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
        WHERE DATE(wp.production_date) = ?
          AND wp.job_code NOT IN ('A', 'B', 'C', 'D')
        GROUP BY wp.id, wp.production_date, wp.job_code, wp.job_name, wp.start_time, wp.end_time
        ORDER BY wp.start_time ASC
      `, [date]);
      
      if (jobs.length > 0) {
        console.log(`   ✅ พบ ${jobs.length} งาน:\n`);
        
        jobs.forEach((job, idx) => {
          const hasMan = job.operators_from_join && (
            job.operators_from_join.includes('แมน') || 
            job.operators_from_join.toLowerCase().includes('man')
          );
          
          console.log(`   ${idx + 1}. ${job.job_code} - ${job.job_name}`);
          console.log(`      - เวลา: ${job.start_time || 'N/A'} - ${job.end_time || 'N/A'}`);
          console.log(`      - operators: "${job.operators_from_join || 'NULL'}"`);
          console.log(`      - จำนวน operators: ${job.operator_count}`);
          if (hasMan) {
            console.log(`      - ✅ พบ "แมน"`);
          } else {
            console.log(`      - ❌ ไม่มี "แมน"`);
          }
          console.log('');
        });
      } else {
        console.log(`   ❌ ไม่พบงานที่ไม่ใช่ default\n`);
      }
    }
    
    await pool.end();
    console.log('✅ ตรวจสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkManRecentDates();

