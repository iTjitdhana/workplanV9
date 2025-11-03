const { pool } = require('./config/database');

async function migrateOperatorsFromMove1112025(dryRun = true) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🔍 เริ่ม migrate operators จาก Move1112025.work_plans ไปยัง MNF_database.work_plan_operators...\n');
    
    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - ไม่มีการแก้ไขข้อมูลจริง\n');
    } else {
      console.log('✅ PRODUCTION MODE - จะทำการ migrate จริง\n');
    }
    
    // 1. ดึงข้อมูลจาก Move1112025.work_plans ที่มี operators และไม่ใช่ A, B, C, D
    console.log('📋 1. ดึงข้อมูลจาก Move1112025.work_plans...');
    const [sourceWorkPlans] = await connection.execute(`
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
        AND wp.operators IS NOT NULL
        AND wp.operators != ''
        AND wp.operators != '[]'
      ORDER BY wp.production_date DESC, wp.start_time ASC
    `);
    
    console.log(`   ✅ พบ ${sourceWorkPlans.length} รายการ\n`);
    
    // 2. ดึงข้อมูล users ทั้งหมดเพื่อ map
    console.log('📋 2. ดึงข้อมูล users เพื่อ map operators...');
    const [users] = await connection.execute(`
      SELECT id, name, id_code
      FROM MNF_database.users
    `);
    
    const userMapByName = new Map();
    const userMapByIdCode = new Map();
    users.forEach(u => {
      if (u.name) userMapByName.set(u.name.trim().toLowerCase(), u);
      if (u.id_code) userMapByIdCode.set(u.id_code.trim().toLowerCase(), u);
    });
    
    console.log(`   ✅ พบ ${users.length} users\n`);
    
    // 3. เริ่ม migrate
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const errors = [];
    
    console.log('📋 3. เริ่ม migrate operators...\n');
    
    for (const sourceWP of sourceWorkPlans) {
      try {
        // หา work_plan_id ที่ตรงกันใน MNF_database
        const [targetWorkPlans] = await connection.execute(`
          SELECT id, job_code, production_date
          FROM MNF_database.work_plans
          WHERE DATE(production_date) = DATE(?)
            AND job_code = ?
          LIMIT 1
        `, [sourceWP.production_date, sourceWP.job_code]);
        
        if (targetWorkPlans.length === 0) {
          totalSkipped++;
          continue; // ไม่พบ work_plan ที่ตรงกัน
        }
        
        const targetWP = targetWorkPlans[0];
        
        // ตรวจสอบว่ามี operators ใน work_plan_operators แล้วหรือยัง
        const [existingOperators] = await connection.execute(`
          SELECT COUNT(*) as count
          FROM MNF_database.work_plan_operators
          WHERE work_plan_id = ?
        `, [targetWP.id]);
        
        if (existingOperators[0].count > 0) {
          totalSkipped++;
          continue; // มี operators อยู่แล้ว
        }
        
        // Parse operators JSON
        let operatorsData = sourceWP.operators;
        if (typeof operatorsData === 'string') {
          try {
            operatorsData = JSON.parse(operatorsData);
          } catch (e) {
            // ถ้า parse ไม่ได้ อาจจะเป็น string ธรรมดา
            operatorsData = operatorsData.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        
        if (!Array.isArray(operatorsData)) {
          totalSkipped++;
          continue;
        }
        
        // Map operators เป็น user_id และ id_code
        const operatorsToInsert = [];
        for (const op of operatorsData) {
          let operatorName = '';
          let operatorIdCode = '';
          
          if (typeof op === 'string') {
            operatorName = op.trim();
          } else if (typeof op === 'object' && op !== null) {
            operatorName = (op.name || '').trim();
            operatorIdCode = (op.id_code || '').trim();
          }
          
          if (!operatorName && !operatorIdCode) continue;
          
          // หา user จาก name หรือ id_code
          const user = operatorName 
            ? userMapByName.get(operatorName.toLowerCase())
            : null;
          
          const userByIdCode = operatorIdCode
            ? userMapByIdCode.get(operatorIdCode.toLowerCase())
            : null;
          
          const matchedUser = user || userByIdCode;
          
          if (matchedUser) {
            operatorsToInsert.push({
              work_plan_id: targetWP.id,
              user_id: matchedUser.id,
              id_code: operatorIdCode || matchedUser.id_code || null
            });
          } else {
            // ถ้าหา user ไม่เจอ ใช้ id_code เท่านั้น
            if (operatorIdCode) {
              operatorsToInsert.push({
                work_plan_id: targetWP.id,
                user_id: null,
                id_code: operatorIdCode
              });
            }
          }
        }
        
        if (operatorsToInsert.length === 0) {
          totalSkipped++;
          continue;
        }
        
        // Insert operators
        if (!dryRun) {
          for (const opData of operatorsToInsert) {
            try {
              await connection.execute(`
                INSERT IGNORE INTO MNF_database.work_plan_operators 
                (work_plan_id, user_id, id_code)
                VALUES (?, ?, ?)
              `, [opData.work_plan_id, opData.user_id, opData.id_code]);
            } catch (e) {
              // Ignore duplicate errors
            }
          }
        }
        
        totalProcessed++;
        totalInserted += operatorsToInsert.length;
        
        if (totalProcessed % 50 === 0) {
          console.log(`   ⏳ ประมวลผลแล้ว ${totalProcessed} รายการ...`);
        }
        
      } catch (error) {
        totalErrors++;
        errors.push({
          source_id: sourceWP.id,
          job_code: sourceWP.job_code,
          error: error.message
        });
        console.error(`   ❌ Error processing work_plan ${sourceWP.id}: ${error.message}`);
      }
    }
    
    if (dryRun) {
      await connection.rollback();
      console.log('\n✅ DRY RUN เสร็จสิ้น (ไม่มีการแก้ไขข้อมูลจริง)\n');
    } else {
      await connection.commit();
      console.log('\n✅ Migrate เสร็จสิ้น\n');
    }
    
    // สรุปผล
    console.log('📊 สรุปผลการ migrate:\n');
    console.log(`   ✅ ประมวลผล: ${totalProcessed} work plans`);
    console.log(`   ✅ Insert operators: ${totalInserted} รายการ`);
    console.log(`   ⏭️  Skip: ${totalSkipped} work plans (ไม่มี work_plan ที่ตรงกัน หรือมี operators อยู่แล้ว)`);
    console.log(`   ❌ Errors: ${totalErrors} รายการ`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n   ⚠️  รายละเอียด Errors:');
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. Work Plan ID: ${err.source_id}, Job Code: ${err.job_code}`);
        console.log(`      Error: ${err.error}`);
      });
    }
    
    if (dryRun && totalProcessed > 0) {
      console.log('\n💡 หากต้องการ migrate จริง ให้รัน: node migrate-operators-from-move1112025.js false');
    }
    
    connection.release();
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error:', error);
    connection.release();
    process.exit(1);
  }
}

// รับ argument จาก command line
const dryRun = process.argv[2] !== 'false';

migrateOperatorsFromMove1112025(dryRun).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

