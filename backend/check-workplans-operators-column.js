const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'MNF_database',
};

async function checkWorkPlansOperatorsColumn() {
  let connection;
  
  try {
    console.log('🔍 ตรวจสอบคอลัมน์ operators ใน work_plans...\n');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ เชื่อมต่อ database สำเร็จ\n');
    
    // =====================================================
    // ตรวจสอบว่ามีคอลัมน์ operators หรือไม่
    // =====================================================
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'work_plans' 
        AND COLUMN_NAME = 'operators'
    `, [dbConfig.database]);
    
    if (columns.length === 0) {
      console.log('⚠️  work_plans ไม่มีคอลัมน์ operators\n');
      return;
    }
    
    console.log(`✅ พบคอลัมน์ operators: ${columns[0].DATA_TYPE} (${columns[0].COLUMN_TYPE})\n`);
    
    // =====================================================
    // ตรวจสอบข้อมูล operators สำหรับงาน A, B, C, D
    // =====================================================
    console.log('━'.repeat(60));
    console.log('📋 ตรวจสอบข้อมูล operators สำหรับงาน A, B, C, D\n');
    
    const [workPlans] = await connection.execute(`
      SELECT 
        id,
        job_code,
        job_name,
        production_date,
        operators
      FROM work_plans
      WHERE job_code IN ('A', 'B', 'C', 'D')
        AND operators IS NOT NULL
        AND operators != ''
        AND operators != '[]'
        AND JSON_VALID(operators) = 1
      ORDER BY production_date DESC, job_code
      LIMIT 20
    `);
    
    if (workPlans.length === 0) {
      console.log('⚠️  ไม่พบงาน A, B, C, D ที่มี operators ในคอลัมน์ operators\n');
      
      // ตรวจสอบทั้งหมด (รวมที่ไม่ใช่ JSON)
      const [allWorkPlans] = await connection.execute(`
        SELECT 
          id,
          job_code,
          job_name,
          production_date,
          operators,
          CASE 
            WHEN operators IS NULL THEN 'NULL'
            WHEN operators = '' THEN 'EMPTY'
            WHEN operators = '[]' THEN 'EMPTY_ARRAY'
            WHEN JSON_VALID(operators) = 0 THEN 'INVALID_JSON'
            ELSE 'VALID_JSON'
          END as operators_status
        FROM work_plans
        WHERE job_code IN ('A', 'B', 'C', 'D')
        ORDER BY production_date DESC, job_code
        LIMIT 10
      `);
      
      if (allWorkPlans.length > 0) {
        console.log('\n📊 สถานะ operators column:\n');
        allWorkPlans.forEach(wp => {
          console.log(`   ${wp.job_code} (ID: ${wp.id}, ${wp.production_date}): ${wp.operators_status}`);
          if (wp.operators && wp.operators.length > 0 && wp.operators.length < 100) {
            console.log(`      Raw: ${wp.operators}`);
          }
        });
      }
      
      return;
    }
    
    console.log(`✅ พบงานที่มี operators: ${workPlans.length} รายการ\n`);
    
    let plansWithValidOperators = [];
    
    workPlans.forEach((wp, index) => {
      console.log(`${index + 1}. งาน ${wp.job_code}: ${wp.job_name}`);
      console.log(`   ID: ${wp.id}`);
      console.log(`   วันที่: ${wp.production_date}`);
      
      try {
        // MySQL JSON type อาจส่งมาเป็น object หรือ string
        let operators;
        if (typeof wp.operators === 'string') {
          operators = JSON.parse(wp.operators);
        } else if (typeof wp.operators === 'object' && wp.operators !== null) {
          operators = wp.operators;
        } else {
          console.log(`   ⚠️  Operators: ไม่ใช่ string หรือ object`);
          return;
        }
        
        if (Array.isArray(operators) && operators.length > 0) {
          const operatorNames = operators
            .map(op => {
              if (typeof op === 'string') return op;
              if (typeof op === 'object' && op !== null) {
                return op.name || op.id_code || '';
              }
              return String(op);
            })
            .filter(Boolean);
          
          console.log(`   ✅ Operators (${operatorNames.length} คน): ${operatorNames.join(', ')}`);
          
          plansWithValidOperators.push({
            id: wp.id,
            job_code: wp.job_code,
            job_name: wp.job_name,
            production_date: wp.production_date,
            operators: operators,
            operatorNames: operatorNames
          });
        } else {
          console.log(`   ⚠️  Operators: Array ว่างหรือไม่มีข้อมูล`);
        }
      } catch (e) {
        console.log(`   ⚠️  Operators: Parse error - ${e.message}`);
        const rawValue = typeof wp.operators === 'string' 
          ? wp.operators.substring(0, 100) 
          : JSON.stringify(wp.operators).substring(0, 100);
        console.log(`   Raw: ${rawValue}...`);
      }
      console.log('');
    });
    
    // =====================================================
    // สรุปผล
    // =====================================================
    console.log('━'.repeat(60));
    console.log('📊 สรุปผลการตรวจสอบ\n');
    console.log(`✅ งานที่มี operators ที่สามารถ migrate ได้: ${plansWithValidOperators.length} รายการ\n`);
    
    if (plansWithValidOperators.length > 0) {
      console.log('ตัวอย่างข้อมูลที่สามารถ migrate:\n');
      plansWithValidOperators.slice(0, 5).forEach((plan, index) => {
        console.log(`${index + 1}. งาน ${plan.job_code} (ID: ${plan.id})`);
        console.log(`   วันที่: ${plan.production_date}`);
        console.log(`   Operators: ${plan.operatorNames.join(', ')}`);
        console.log(`   JSON structure:`, JSON.stringify(plan.operators, null, 2));
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 ปิดการเชื่อมต่อ database แล้ว');
    }
  }
}

if (require.main === module) {
  checkWorkPlansOperatorsColumn()
    .then(() => {
      console.log('\n✅ Script ทำงานเสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script เกิดข้อผิดพลาด:', error);
      process.exit(1);
    });
}

module.exports = { checkWorkPlansOperatorsColumn };

