const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'MNF_database',
};

async function migrateOperatorsToWorkPlanOperators(dryRun = true) {
  let connection;
  
  try {
    console.log('🔄 เริ่ม Migrate Operators...\n');
    console.log(`📋 Mode: ${dryRun ? '🔍 DRY RUN (ตรวจสอบเท่านั้น ไม่บันทึกข้อมูล)' : '✏️  ACTUAL RUN (จะบันทึกข้อมูลจริง)'}\n`);
    console.log('━'.repeat(60));
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ เชื่อมต่อ database สำเร็จ\n');
    
    // =====================================================
    // ขั้นตอนที่ 1: ดึงข้อมูลงาน A, B, C, D ที่มี operators
    // =====================================================
    console.log('📋 ขั้นตอนที่ 1: ดึงข้อมูลงาน A, B, C, D ที่มี operators\n');
    
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
    `);
    
    if (workPlans.length === 0) {
      console.log('⚠️  ไม่พบงาน A, B, C, D ที่มี operators\n');
      return;
    }
    
    console.log(`✅ พบงานที่มี operators: ${workPlans.length} รายการ\n`);
    
    // =====================================================
    // ขั้นตอนที่ 2: ดึงข้อมูล users ทั้งหมด (เพื่อหา user_id จาก id_code)
    // =====================================================
    console.log('━'.repeat(60));
    console.log('👤 ขั้นตอนที่ 2: ดึงข้อมูล Users\n');
    
    const [users] = await connection.execute(`
      SELECT id, id_code, name
      FROM users
    `);
    
    // สร้าง map: id_code -> user_id และ name -> user_id
    const idCodeToUserId = new Map();
    const nameToUserId = new Map();
    
    users.forEach(user => {
      if (user.id_code) {
        idCodeToUserId.set(user.id_code, user.id);
      }
      if (user.name) {
        nameToUserId.set(user.name, user.id);
      }
    });
    
    console.log(`✅ โหลด users ทั้งหมด: ${users.length} รายการ`);
    console.log(`   - id_code mappings: ${idCodeToUserId.size} รายการ`);
    console.log(`   - name mappings: ${nameToUserId.size} รายการ\n`);
    
    // =====================================================
    // ขั้นตอนที่ 3: Parse operators และเตรียมข้อมูลสำหรับ INSERT
    // =====================================================
    console.log('━'.repeat(60));
    console.log('📝 ขั้นตอนที่ 3: Parse Operators และเตรียมข้อมูล\n');
    
    const recordsToInsert = [];
    const skippedRecords = [];
    
    for (const wp of workPlans) {
      try {
        // Parse JSON operators
        let operators;
        if (typeof wp.operators === 'string') {
          operators = JSON.parse(wp.operators);
        } else if (typeof wp.operators === 'object' && wp.operators !== null) {
          operators = wp.operators;
        } else {
          skippedRecords.push({
            work_plan_id: wp.id,
            job_code: wp.job_code,
            reason: 'Operators ไม่ใช่ string หรือ object'
          });
          continue;
        }
        
        if (!Array.isArray(operators) || operators.length === 0) {
          skippedRecords.push({
            work_plan_id: wp.id,
            job_code: wp.job_code,
            reason: 'Operators เป็น array ว่าง'
          });
          continue;
        }
        
        // ตรวจสอบว่ามี operators ใน work_plan_operators แล้วหรือยัง
        const [existing] = await connection.execute(`
          SELECT COUNT(*) as count
          FROM work_plan_operators
          WHERE work_plan_id = ?
        `, [wp.id]);
        
        if (existing[0].count > 0) {
          skippedRecords.push({
            work_plan_id: wp.id,
            job_code: wp.job_code,
            reason: `มี operators ใน work_plan_operators แล้ว (${existing[0].count} รายการ)`
          });
          continue;
        }
        
        // Parse แต่ละ operator
        operators.forEach((op, index) => {
          let operatorName = '';
          let operatorIdCode = '';
          
          if (typeof op === 'string') {
            operatorName = op;
            // ลองหา id_code จาก name
            operatorIdCode = users.find(u => u.name === op)?.id_code || '';
          } else if (typeof op === 'object' && op !== null) {
            operatorName = op.name || '';
            operatorIdCode = op.id_code || '';
          }
          
          if (!operatorName && !operatorIdCode) {
            skippedRecords.push({
              work_plan_id: wp.id,
              job_code: wp.job_code,
              reason: `Operator #${index + 1} ไม่มี name หรือ id_code`
            });
            return;
          }
          
          // หา user_id
          let user_id = null;
          if (operatorIdCode && idCodeToUserId.has(operatorIdCode)) {
            user_id = idCodeToUserId.get(operatorIdCode);
          } else if (operatorName && nameToUserId.has(operatorName)) {
            user_id = nameToUserId.get(operatorName);
          }
          
          recordsToInsert.push({
            work_plan_id: wp.id,
            job_code: wp.job_code,
            job_name: wp.job_name,
            production_date: wp.production_date,
            user_id: user_id,
            id_code: operatorIdCode || null,
            operator_name: operatorName,
            found_user: user_id !== null
          });
        });
        
      } catch (error) {
        skippedRecords.push({
          work_plan_id: wp.id,
          job_code: wp.job_code,
          reason: `Parse error: ${error.message}`
        });
      }
    }
    
    console.log(`✅ เตรียมข้อมูลเสร็จ:`);
    console.log(`   - Records ที่จะ insert: ${recordsToInsert.length} รายการ`);
    console.log(`   - Records ที่ skip: ${skippedRecords.length} รายการ\n`);
    
    // =====================================================
    // ขั้นตอนที่ 4: แสดงตัวอย่างข้อมูลที่จะ insert
    // =====================================================
    console.log('━'.repeat(60));
    console.log('📊 ขั้นตอนที่ 4: ตัวอย่างข้อมูลที่จะ Insert\n');
    
    if (recordsToInsert.length > 0) {
      console.log('ตัวอย่าง 10 รายการแรก:\n');
      recordsToInsert.slice(0, 10).forEach((record, index) => {
        console.log(`${index + 1}. งาน ${record.job_code} (ID: ${record.work_plan_id})`);
        console.log(`   วันที่: ${record.production_date}`);
        console.log(`   Operator: ${record.operator_name} (id_code: ${record.id_code || 'N/A'})`);
        console.log(`   user_id: ${record.user_id || 'NULL'} ${record.found_user ? '✅' : '⚠️ ไม่พบใน users table'}`);
        console.log('');
      });
    }
    
    if (skippedRecords.length > 0) {
      console.log('\n⚠️  Records ที่ skip:\n');
      skippedRecords.slice(0, 10).forEach((record, index) => {
        console.log(`${index + 1}. งาน ${record.job_code} (ID: ${record.work_plan_id}): ${record.reason}`);
      });
      if (skippedRecords.length > 10) {
        console.log(`   ... และอีก ${skippedRecords.length - 10} รายการ`);
      }
    }
    
    // =====================================================
    // ขั้นตอนที่ 5: INSERT ข้อมูล (ถ้าไม่ใช่ dry run)
    // =====================================================
    if (!dryRun && recordsToInsert.length > 0) {
      console.log('\n━'.repeat(60));
      console.log('💾 ขั้นตอนที่ 5: กำลัง INSERT ข้อมูล...\n');
      
      let insertedCount = 0;
      let errorCount = 0;
      
      for (const record of recordsToInsert) {
        try {
          await connection.execute(`
            INSERT INTO work_plan_operators (work_plan_id, user_id, id_code)
            VALUES (?, ?, ?)
          `, [record.work_plan_id, record.user_id, record.id_code]);
          
          insertedCount++;
        } catch (error) {
          errorCount++;
          console.error(`❌ Error inserting work_plan_id ${record.work_plan_id}: ${error.message}`);
        }
      }
      
      console.log(`\n✅ Migrate เสร็จสิ้น:`);
      console.log(`   - Insert สำเร็จ: ${insertedCount} รายการ`);
      console.log(`   - Error: ${errorCount} รายการ`);
    } else if (dryRun) {
      console.log('\n━'.repeat(60));
      console.log('🔍 DRY RUN - ไม่ได้ INSERT ข้อมูลจริง\n');
      console.log('💡 ต้องการให้ INSERT จริง ให้รัน:');
      console.log('   node migrate-operators-to-work-plan-operators.js --execute\n');
    }
    
    console.log('━'.repeat(60));
    console.log('✅ Script ทำงานเสร็จสิ้น\n');
    
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
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  
  migrateOperatorsToWorkPlanOperators(dryRun)
    .then(() => {
      console.log('\n✅ Script ทำงานเสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script เกิดข้อผิดพลาด:', error);
      process.exit(1);
    });
}

module.exports = { migrateOperatorsToWorkPlanOperators };

