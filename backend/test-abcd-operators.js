const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'MNF_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function checkABCDOperators() {
  let connection;
  
  try {
    console.log('🔍 เริ่มตรวจสอบข้อมูลงาน A, B, C, D...\n');
    console.log('📊 Database:', dbConfig.database);
    console.log('📊 Host:', dbConfig.host);
    console.log('━'.repeat(60));
    
    // สร้าง connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ เชื่อมต่อ database สำเร็จ\n');
    
    // =====================================================
    // ขั้นตอนที่ 1: ตรวจสอบว่ามีงาน A, B, C, D หรือไม่
    // =====================================================
    console.log('📋 ขั้นตอนที่ 1: ตรวจสอบงาน A, B, C, D\n');
    
    const [workPlans] = await connection.execute(`
      SELECT 
        id,
        job_code,
        job_name,
        production_date,
        workflow_status,
        job_type,
        status_id,
        start_time,
        end_time
      FROM work_plans
      WHERE job_code IN ('A', 'B', 'C', 'D')
      ORDER BY production_date DESC, job_code
      LIMIT 20
    `);
    
    if (workPlans.length === 0) {
      console.log('⚠️  ไม่พบงาน A, B, C, D ในระบบ\n');
      return;
    }
    
    console.log(`✅ พบงาน A, B, C, D ทั้งหมด ${workPlans.length} รายการ\n`);
    
    // แสดงรายละเอียดงาน
    workPlans.forEach((wp, index) => {
      console.log(`${index + 1}. งาน ${wp.job_code}: ${wp.job_name}`);
      console.log(`   ID: ${wp.id}`);
      console.log(`   วันที่: ${wp.production_date}`);
      console.log(`   สถานะ: ${wp.workflow_status || 'N/A'} (job_type: ${wp.job_type || 'N/A'})`);
      console.log(`   เวลา: ${wp.start_time || 'N/A'} - ${wp.end_time || 'N/A'}`);
      console.log('');
    });
    
    // =====================================================
    // ขั้นตอนที่ 2: ตรวจสอบ operators ของงาน A, B, C, D
    // =====================================================
    console.log('━'.repeat(60));
    console.log('👥 ขั้นตอนที่ 2: ตรวจสอบ Operators\n');
    
    const workPlanIds = workPlans.map(wp => wp.id);
    const placeholders = workPlanIds.map(() => '?').join(',');
    
    const [operatorsData] = await connection.execute(`
      SELECT 
        wp.id,
        wp.job_code,
        wp.job_name,
        wp.production_date,
        wpo.id as operator_id,
        wpo.user_id,
        wpo.id_code,
        u.id as user_table_id,
        u.name as operator_name
      FROM work_plans wp
      LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
      LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
      WHERE wp.id IN (${placeholders})
      ORDER BY wp.job_code, u.name
    `, workPlanIds);
    
    console.log(`✅ พบ operators ทั้งหมด ${operatorsData.length} รายการ\n`);
    
    // จัดกลุ่มตาม work_plan_id
    const operatorsByWorkPlan = {};
    operatorsData.forEach(op => {
      if (!operatorsByWorkPlan[op.id]) {
        operatorsByWorkPlan[op.id] = {
          job_code: op.job_code,
          job_name: op.job_name,
          production_date: op.production_date,
          operators: []
        };
      }
      if (op.operator_name) {
        operatorsByWorkPlan[op.id].operators.push(op.operator_name);
      }
    });
    
    // แสดงผล
    Object.values(operatorsByWorkPlan).forEach(plan => {
      console.log(`📌 งาน ${plan.job_code}: ${plan.job_name}`);
      console.log(`   วันที่: ${plan.production_date}`);
      if (plan.operators.length > 0) {
        console.log(`   👥 ผู้ปฏิบัติงาน (${plan.operators.length} คน): ${plan.operators.join(', ')}`);
      } else {
        console.log(`   ⚠️  ไม่มีผู้ปฏิบัติงาน`);
      }
      console.log('');
    });
    
    // =====================================================
    // ขั้นตอนที่ 3: ตรวจสอบด้วย query ที่ Backend ใช้จริง
    // =====================================================
    console.log('━'.repeat(60));
    console.log('🔍 ขั้นตอนที่ 3: ตรวจสอบด้วย Backend Query (GROUP_CONCAT)\n');
    
    const [backendQuery] = await connection.execute(`
      SELECT 
        wpo.work_plan_id,
        GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators_from_join,
        GROUP_CONCAT(DISTINCT wpo.id_code ORDER BY wpo.id_code SEPARATOR ', ') as operator_codes
      FROM work_plan_operators wpo
      LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
      WHERE wpo.work_plan_id IN (${placeholders})
      GROUP BY wpo.work_plan_id
    `, workPlanIds);
    
    console.log(`✅ Backend query result: ${backendQuery.length} รายการ\n`);
    
    // สร้าง map สำหรับแสดงผล
    const backendOperatorsMap = {};
    backendQuery.forEach(row => {
      backendOperatorsMap[row.work_plan_id] = {
        operators_from_join: row.operators_from_join || '',
        operator_codes: row.operator_codes || ''
      };
    });
    
    // แสดงผลพร้อมเทียบกับงาน
    workPlans.forEach(wp => {
      console.log(`📌 งาน ${wp.job_code}: ${wp.job_name} (ID: ${wp.id})`);
      const operators = backendOperatorsMap[wp.id];
      if (operators && operators.operators_from_join) {
        console.log(`   ✅ operators_from_join: "${operators.operators_from_join}"`);
        console.log(`   ✅ operator_codes: "${operators.operator_codes}"`);
      } else {
        console.log(`   ⚠️  ไม่มี operators_from_join (ไม่มีข้อมูลใน work_plan_operators)`);
      }
      console.log('');
    });
    
    // =====================================================
    // ขั้นตอนที่ 4: สรุปผล
    // =====================================================
    console.log('━'.repeat(60));
    console.log('📊 สรุปผลการตรวจสอบ\n');
    
    const plansWithOperators = workPlans.filter(wp => {
      return backendOperatorsMap[wp.id] && backendOperatorsMap[wp.id].operators_from_join;
    });
    
    const plansWithoutOperators = workPlans.filter(wp => {
      return !backendOperatorsMap[wp.id] || !backendOperatorsMap[wp.id].operators_from_join;
    });
    
    console.log(`✅ งานที่มี operators: ${plansWithOperators.length} รายการ`);
    plansWithOperators.forEach(wp => {
      console.log(`   - ${wp.job_code}: ${wp.job_name} (${wp.production_date})`);
    });
    
    console.log(`\n⚠️  งานที่ไม่มี operators: ${plansWithoutOperators.length} รายการ`);
    plansWithoutOperators.forEach(wp => {
      console.log(`   - ${wp.job_code}: ${wp.job_name} (${wp.production_date})`);
    });
    
    // =====================================================
    // ขั้นตอนที่ 5: ตรวจสอบ users table
    // =====================================================
    console.log('\n━'.repeat(60));
    console.log('👤 ขั้นตอนที่ 5: ตรวจสอบ Users Table\n');
    
    const [users] = await connection.execute(`
      SELECT id, id_code, name
      FROM users
      ORDER BY name
    `);
    
    console.log(`✅ พบ users ทั้งหมด ${users.length} รายการ\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (id_code: ${user.id_code || 'N/A'}, id: ${user.id})`);
    });
    
    console.log('\n━'.repeat(60));
    console.log('✅ การตรวจสอบเสร็จสิ้น\n');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 ปิดการเชื่อมต่อ database แล้ว');
    }
  }
}

// รันสคริปต์
if (require.main === module) {
  checkABCDOperators()
    .then(() => {
      console.log('\n✅ Script ทำงานเสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script เกิดข้อผิดพลาด:', error);
      process.exit(1);
    });
}

module.exports = { checkABCDOperators };

