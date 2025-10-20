/**
 * ตรวจสอบข้อมูล work_plans และ work_plan_drafts
 * ใน manufacturing_system (192.168.0.96)
 */

const { pool, oldPool } = require('./config/database');

async function main() {
  console.log('\n========================================');
  console.log('🔍 ตรวจสอบข้อมูล Work Plans');
  console.log('========================================\n');
  
  try {
    // =====================
    // 1. ข้อมูลใน NEW Database (manufacturing_system - 192.168.0.96)
    // =====================
    console.log('📊 NEW Database (manufacturing_system - 192.168.0.96):\n');
    
    // นับจำนวน work_plans
    const [newPlans] = await pool.query('SELECT COUNT(*) as count FROM work_plans');
    console.log('✅ work_plans:', newPlans[0].count, 'records');
    
    // นับจำนวน work_plan_drafts
    const [newDrafts] = await pool.query('SELECT COUNT(*) as count FROM work_plan_drafts');
    console.log('✅ work_plan_drafts:', newDrafts[0].count, 'records');
    
    // แสดงตัวอย่าง work_plans ล่าสุด
    const [latestPlans] = await pool.query(`
      SELECT 
        id, 
        DATE_FORMAT(production_date, '%Y-%m-%d') as production_date,
        job_code, 
        job_name,
        start_time,
        end_time,
        status_id
      FROM work_plans 
      ORDER BY production_date DESC, id DESC 
      LIMIT 5
    `);
    console.log('\n📋 Work Plans ล่าสุด 5 รายการ:');
    latestPlans.forEach((plan, i) => {
      console.log(`   ${i+1}. ID: ${plan.id} | Date: ${plan.production_date} | Code: ${plan.job_code} | Name: ${plan.job_name}`);
    });
    
    // แสดงตัวอย่าง drafts ล่าสุด
    const [latestDrafts] = await pool.query(`
      SELECT 
        id,
        DATE_FORMAT(production_date, '%Y-%m-%d') as production_date,
        job_code,
        job_name,
        workflow_status_id
      FROM work_plan_drafts
      ORDER BY production_date DESC, id DESC
      LIMIT 5
    `);
    console.log('\n📝 Drafts ล่าสุด 5 รายการ:');
    latestDrafts.forEach((draft, i) => {
      console.log(`   ${i+1}. ID: ${draft.id} | Date: ${draft.production_date} | Code: ${draft.job_code} | Name: ${draft.job_name} | Status: ${draft.workflow_status_id}`);
    });
    
    // นับตามวันที่
    const [plansByDate] = await pool.query(`
      SELECT 
        DATE_FORMAT(production_date, '%Y-%m-%d') as date,
        COUNT(*) as count
      FROM work_plans
      GROUP BY DATE(production_date)
      ORDER BY production_date DESC
      LIMIT 10
    `);
    console.log('\n📅 Work Plans ตามวันที่:');
    plansByDate.forEach(row => {
      console.log(`   ${row.date}: ${row.count} plans`);
    });
    
    // =====================
    // 2. ข้อมูลใน OLD Database (esp_tracker - 192.168.0.94)
    // =====================
    console.log('\n\n📊 OLD Database (esp_tracker - 192.168.0.94):\n');
    
    const [oldPlans] = await oldPool.query('SELECT COUNT(*) as count FROM work_plans');
    console.log('✅ work_plans:', oldPlans[0].count, 'records');
    
    const [oldDrafts] = await oldPool.query('SELECT COUNT(*) as count FROM work_plan_drafts');
    console.log('✅ work_plan_drafts:', oldDrafts[0].count, 'records');
    
    // =====================
    // 3. เปรียบเทียบ
    // =====================
    console.log('\n\n========================================');
    console.log('📊 เปรียบเทียบข้อมูล');
    console.log('========================================\n');
    
    console.log('Work Plans:');
    console.log(`   Old DB: ${oldPlans[0].count} records`);
    console.log(`   New DB: ${newPlans[0].count} records`);
    console.log(`   ผลต่าง: ${newPlans[0].count - oldPlans[0].count}`);
    
    console.log('\nWork Plan Drafts:');
    console.log(`   Old DB: ${oldDrafts[0].count} records`);
    console.log(`   New DB: ${newDrafts[0].count} records`);
    console.log(`   ผลต่าง: ${newDrafts[0].count - oldDrafts[0].count}`);
    
    // ตรวจสอบ API ที่จะถูกเรียก
    console.log('\n\n========================================');
    console.log('🔍 ทดสอบ Query ที่ API ใช้');
    console.log('========================================\n');
    
    // ทดสอบ query แบบที่ WorkPlan.getAll ใช้
    const testDate = '2025-10-20';
    const [testPlans] = await pool.query(`
      SELECT 
        wp.id,
        DATE_FORMAT(wp.production_date, '%Y-%m-%d') as production_date,
        wp.job_code,
        wp.job_name,
        wp.start_time,
        wp.end_time
      FROM work_plans wp
      WHERE (DATE(wp.production_date) = ? OR wp.production_date = ?)
      ORDER BY wp.start_time ASC
      LIMIT 10
    `, [testDate, testDate]);
    
    console.log(`📅 Work Plans วันที่ ${testDate}:`, testPlans.length, 'records');
    if (testPlans.length > 0) {
      console.log('   ตัวอย่าง:', testPlans[0]);
    }
    
    // ทดสอบ drafts
    const [testDrafts] = await pool.query(`
      SELECT COUNT(*) as count
      FROM work_plan_drafts
      WHERE DATE(production_date) = ?
    `, [testDate]);
    console.log(`📝 Drafts วันที่ ${testDate}:`, testDrafts[0].count, 'records');
    
    console.log('\n✅ ตรวจสอบเสร็จสิ้น!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
    await oldPool.end();
  }
}

main().catch(console.error);

