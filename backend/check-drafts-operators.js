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

async function checkDraftsOperators() {
  let connection;
  
  try {
    console.log('🔍 ตรวจสอบ operators ใน work_plan_drafts...\n');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ เชื่อมต่อ database สำเร็จ\n');
    
    // =====================================================
    // ตรวจสอบ work_plan_drafts สำหรับงาน A, B, C, D
    // =====================================================
    console.log('📋 ตรวจสอบ work_plan_drafts สำหรับงาน A, B, C, D\n');
    
    const [drafts] = await connection.execute(`
      SELECT 
        id,
        job_code,
        job_name,
        production_date,
        workflow_status_id,
        operators,
        JSON_EXTRACT(operators, '$[*].name') as operator_names_json
      FROM work_plan_drafts
      WHERE job_code IN ('A', 'B', 'C', 'D')
      ORDER BY production_date DESC, job_code
      LIMIT 20
    `);
    
    if (drafts.length === 0) {
      console.log('⚠️  ไม่พบงาน A, B, C, D ใน work_plan_drafts\n');
    } else {
      console.log(`✅ พบงาน A, B, C, D ใน work_plan_drafts: ${drafts.length} รายการ\n`);
      
      drafts.forEach((draft, index) => {
        console.log(`${index + 1}. งาน ${draft.job_code}: ${draft.job_name}`);
        console.log(`   ID: ${draft.id}`);
        console.log(`   วันที่: ${draft.production_date}`);
        console.log(`   workflow_status_id: ${draft.workflow_status_id}`);
        
        // Parse operators JSON
        if (draft.operators) {
          try {
            const operators = JSON.parse(draft.operators);
            if (Array.isArray(operators) && operators.length > 0) {
              const operatorNames = operators
                .map(op => op.name || op.id_code || '')
                .filter(Boolean);
              console.log(`   ✅ Operators (JSON): ${operatorNames.join(', ')}`);
            } else {
              console.log(`   ⚠️  Operators (JSON): ว่างหรือไม่ถูกต้อง`);
            }
          } catch (e) {
            console.log(`   ⚠️  Operators (JSON): Parse error - ${e.message}`);
            console.log(`   Raw operators: ${draft.operators}`);
          }
        } else {
          console.log(`   ⚠️  Operators: ไม่มี`);
        }
        console.log('');
      });
    }
    
    // =====================================================
    // ตรวจสอบ work_plans operators column (ถ้ามี)
    // =====================================================
    console.log('━'.repeat(60));
    console.log('📋 ตรวจสอบ operators column ใน work_plans (ถ้ามี)\n');
    
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'work_plans' 
          AND COLUMN_NAME = 'operators'
      `, [dbConfig.database]);
      
      if (columns.length > 0) {
        console.log('✅ work_plans มี operators column\n');
        
        const [workPlansWithOperators] = await connection.execute(`
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
          ORDER BY production_date DESC, job_code
          LIMIT 10
        `);
        
        if (workPlansWithOperators.length > 0) {
          console.log(`✅ พบงานที่มี operators column: ${workPlansWithOperators.length} รายการ\n`);
          workPlansWithOperators.forEach(wp => {
            console.log(`   ${wp.job_code} (ID: ${wp.id}): "${wp.operators}"`);
          });
        } else {
          console.log('⚠️  ไม่พบงาน A, B, C, D ที่มี operators ใน operators column\n');
        }
      } else {
        console.log('⚠️  work_plans ไม่มี operators column\n');
      }
    } catch (error) {
      console.log(`⚠️  ตรวจสอบ operators column ไม่ได้: ${error.message}\n`);
    }
    
    // =====================================================
    // ตรวจสอบว่ามีข้อมูลในตารางอื่นหรือไม่
    // =====================================================
    console.log('━'.repeat(60));
    console.log('📋 ตรวจสอบฐานข้อมูล Move1112025 (ถ้ามี)\n');
    
    try {
      // ลองเชื่อมต่อกับ Move1112025 database
      const moveDbConfig = {
        ...dbConfig,
        database: 'Move1112025'
      };
      
      const moveConnection = await mysql.createConnection(moveDbConfig);
      console.log('✅ เชื่อมต่อ Move1112025 database สำเร็จ\n');
      
      const [moveDrafts] = await moveConnection.execute(`
        SELECT 
          id,
          job_code,
          job_name,
          production_date,
          operators
        FROM work_plan_drafts
        WHERE job_code IN ('A', 'B', 'C', 'D')
        ORDER BY production_date DESC, job_code
        LIMIT 10
      `);
      
      if (moveDrafts.length > 0) {
        console.log(`✅ พบงานใน Move1112025: ${moveDrafts.length} รายการ\n`);
        moveDrafts.forEach((draft, index) => {
          console.log(`${index + 1}. งาน ${draft.job_code}: ${draft.job_name}`);
          console.log(`   ID: ${draft.id}, วันที่: ${draft.production_date}`);
          if (draft.operators) {
            try {
              const operators = JSON.parse(draft.operators);
              if (Array.isArray(operators) && operators.length > 0) {
                const names = operators.map(op => op.name || '').filter(Boolean);
                console.log(`   ✅ Operators: ${names.join(', ')}`);
              }
            } catch (e) {
              console.log(`   Operators (raw): ${draft.operators.substring(0, 50)}...`);
            }
          }
          console.log('');
        });
      } else {
        console.log('⚠️  ไม่พบงานใน Move1112025\n');
      }
      
      await moveConnection.end();
    } catch (error) {
      console.log(`⚠️  ไม่สามารถเชื่อมต่อ Move1112025: ${error.message}\n`);
    }
    
    console.log('━'.repeat(60));
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
  checkDraftsOperators()
    .then(() => {
      console.log('\n✅ Script ทำงานเสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script เกิดข้อผิดพลาด:', error);
      process.exit(1);
    });
}

module.exports = { checkDraftsOperators };

