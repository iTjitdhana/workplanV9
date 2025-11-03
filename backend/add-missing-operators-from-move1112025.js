const { pool } = require('./config/database');

async function addMissingOperatorsFromMove1112025(dryRun = true) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🔍 เพิ่ม operators ที่ขาดหายไปจาก Move1112025.work_plans...\n');
    
    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - ไม่มีการแก้ไขข้อมูลจริง\n');
    } else {
      console.log('✅ PRODUCTION MODE - จะทำการเพิ่มจริง\n');
    }
    
    // 1. ดึงข้อมูล users
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
    
    // 2. ดึงข้อมูลจาก Move1112025 ที่มี operators
    const [sourceWorkPlans] = await connection.execute(`
      SELECT 
        wp.id,
        wp.production_date,
        wp.job_code,
        wp.job_name,
        wp.operators
      FROM Move1112025.work_plans wp
      WHERE wp.job_code NOT IN ('A', 'B', 'C', 'D')
        AND wp.operators IS NOT NULL
        AND wp.operators != ''
        AND wp.operators != '[]'
        AND DATE(wp.production_date) >= '2025-10-01'
      ORDER BY wp.production_date DESC
    `);
    
    console.log(`📋 พบ ${sourceWorkPlans.length} รายการใน Move1112025 (ตั้งแต่ Oct 01 เป็นต้นมา)\n`);
    
    let totalProcessed = 0;
    let totalAdded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    // 3. สำหรับแต่ละงานใน Move1112025
    for (const sourceWP of sourceWorkPlans) {
      try {
        // หา work_plan_id ที่ตรงกันใน MNF_database
        const [targetWorkPlans] = await connection.execute(`
          SELECT id
          FROM MNF_database.work_plans
          WHERE DATE(production_date) = DATE(?)
            AND job_code = ?
          LIMIT 1
        `, [sourceWP.production_date, sourceWP.job_code]);
        
        if (targetWorkPlans.length === 0) {
          totalSkipped++;
          continue;
        }
        
        const targetWPId = targetWorkPlans[0].id;
        
        // ดึง operators ที่มีอยู่แล้วใน MNF_database
        const [existingOperators] = await connection.execute(`
          SELECT 
            wpo.user_id,
            wpo.id_code,
            u.name
          FROM MNF_database.work_plan_operators wpo
          LEFT JOIN MNF_database.users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
          WHERE wpo.work_plan_id = ?
        `, [targetWPId]);
        
        const existingOperatorNames = new Set();
        const existingUserIds = new Set();
        existingOperators.forEach(op => {
          if (op.name) existingOperatorNames.add(op.name.trim().toLowerCase());
          if (op.user_id) existingUserIds.add(op.user_id);
        });
        
        // Parse operators จาก Move1112025
        let operatorsData = sourceWP.operators;
        if (typeof operatorsData === 'string') {
          try {
            operatorsData = JSON.parse(operatorsData);
          } catch (e) {
            operatorsData = operatorsData.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        
        if (!Array.isArray(operatorsData)) continue;
        
        // หา operators ที่ยังไม่มี
        const operatorsToAdd = [];
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
          
          // ตรวจสอบว่ามีอยู่แล้วหรือไม่
          const alreadyExists = operatorName 
            ? existingOperatorNames.has(operatorName.toLowerCase())
            : false;
          
          if (alreadyExists) continue;
          
          // หา user
          const user = operatorName 
            ? userMapByName.get(operatorName.toLowerCase())
            : null;
          
          const userByIdCode = operatorIdCode
            ? userMapByIdCode.get(operatorIdCode.toLowerCase())
            : null;
          
          const matchedUser = user || userByIdCode;
          
          if (matchedUser && !existingUserIds.has(matchedUser.id)) {
            operatorsToAdd.push({
              work_plan_id: targetWPId,
              user_id: matchedUser.id,
              id_code: operatorIdCode || matchedUser.id_code || null
            });
          } else if (operatorIdCode && !matchedUser) {
            // ถ้าหา user ไม่เจอ แต่มี id_code ให้เพิ่มด้วย id_code
            operatorsToAdd.push({
              work_plan_id: targetWPId,
              user_id: null,
              id_code: operatorIdCode
            });
          }
        }
        
        if (operatorsToAdd.length === 0) {
          totalSkipped++;
          continue;
        }
        
        // Insert operators
        if (!dryRun) {
          for (const opData of operatorsToAdd) {
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
        totalAdded += operatorsToAdd.length;
        
        if (totalProcessed % 10 === 0) {
          console.log(`   ⏳ ประมวลผลแล้ว ${totalProcessed} รายการ...`);
        }
        
      } catch (error) {
        totalErrors++;
        console.error(`   ❌ Error processing ${sourceWP.job_code} (${sourceWP.production_date}): ${error.message}`);
      }
    }
    
    if (dryRun) {
      await connection.rollback();
      console.log('\n✅ DRY RUN เสร็จสิ้น (ไม่มีการแก้ไขข้อมูลจริง)\n');
    } else {
      await connection.commit();
      console.log('\n✅ เพิ่ม operators เสร็จสิ้น\n');
    }
    
    console.log('📊 สรุปผล:\n');
    console.log(`   ✅ ประมวลผล: ${totalProcessed} work plans`);
    console.log(`   ✅ เพิ่ม operators: ${totalAdded} รายการ`);
    console.log(`   ⏭️  Skip: ${totalSkipped} work plans (มี operators ครบแล้ว)`);
    console.log(`   ❌ Errors: ${totalErrors} รายการ`);
    
    if (dryRun && totalProcessed > 0) {
      console.log('\n💡 หากต้องการเพิ่มจริง ให้รัน: node add-missing-operators-from-move1112025.js false');
    }
    
    connection.release();
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error:', error);
    connection.release();
    process.exit(1);
  }
}

const dryRun = process.argv[2] !== 'false';
addMissingOperatorsFromMove1112025(dryRun).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

