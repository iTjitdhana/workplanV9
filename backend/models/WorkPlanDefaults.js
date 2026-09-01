const { pool } = require('../config/database');
const { formatDateForDatabase } = require('../utils/dateUtils');

class WorkPlanDefaults {
  // สร้างงาน Default (ABCD) อัตโนมัติ
  // ✅ ปรับปรุง: เช็คทีละ job_code แทนการเช็ครวม (ละเอียดและแม่นยำกว่า)
  static async createDefaultTasks(production_date) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const formattedDate = formatDateForDatabase(production_date);
      if (!formattedDate) {
        throw new Error('วันที่ผลิต (production_date) ไม่ถูกต้อง หรือเป็นค่าว่าง');
      }
      
      console.log('🔍 Checking existing default tasks for:', formattedDate);
      
      // เช็คว่ามีงาน A, B, C, D ใดบ้างที่ยังไม่มีในวันนั้น (ไม่ใช้ job_type เพื่อรองรับ DB ที่ยังไม่มีคอลัมน์นี้)
      const [existing] = await connection.execute(`
        SELECT job_code
        FROM work_plans 
        WHERE DATE(production_date) = ? 
          AND job_code IN ('A', 'B', 'C', 'D')
      `, [formattedDate]);
      
      const existingCodes = existing.map(row => row.job_code);
      console.log('📋 Existing default tasks:', existingCodes);
      
      // สร้างงาน ABCD
      const defaultTasks = [
        { code: 'A', name: 'เบิกของส่งสาขา-ผัก' },
        { code: 'B', name: 'เบิกของส่งสาขา-สด' },
        { code: 'C', name: 'เบิกของส่งสาขา-แห้ง' },
        { code: 'D', name: 'ตวงสูตร' }
      ];
      
      const createdIds = [];
      const skippedCodes = [];
      
      // ✅ สร้างเฉพาะงานที่ยังไม่มี
      for (const task of defaultTasks) {
        if (existingCodes.includes(task.code)) {
          console.log(`⏭️  Skipping ${task.code} - ${task.name} (already exists)`);
          skippedCodes.push(task.code);
          continue;
        }
        
        console.log(`🆕 Creating ${task.code} - ${task.name}...`);
        // ใช้เฉพาะคอลัมน์ที่มีในตาราง work_plans ทุก environment (รองรับ DB ที่ยังไม่มี job_type, workflow_status, is_printed)
        const [result] = await connection.execute(`
          INSERT INTO work_plans 
          (production_date, job_code, job_name, status_id, start_time, end_time)
          VALUES (?, ?, ?, 1, '08:00:00', '09:00:00')
        `, [formattedDate, task.code, task.name]);
        
        createdIds.push(result.insertId);
        console.log(`✅ Created: ${task.code} - ${task.name} (ID: ${result.insertId}) - Time: 08:00-09:00`);
      }
      
      await connection.commit();
      
      // สรุปผลลัพธ์
      const totalCreated = createdIds.length;
      const totalSkipped = skippedCodes.length;
      
      console.log(`🎉 Completed: Created ${totalCreated} tasks, Skipped ${totalSkipped} tasks`);
      
      if (totalCreated === 0 && totalSkipped > 0) {
        return { 
          success: true, 
          message: `All default tasks already exist (${totalSkipped} tasks)`,
          created: false,
          createdCount: 0,
          skippedCount: totalSkipped,
          skippedCodes: skippedCodes,
          createdIds: []
        };
      }
      
      return { 
        success: true, 
        message: `Default tasks processed: ${totalCreated} created, ${totalSkipped} skipped`,
        created: totalCreated > 0,
        createdCount: totalCreated,
        skippedCount: totalSkipped,
        skippedCodes: skippedCodes,
        ids: createdIds 
      };
      
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error creating default tasks:', error);
      throw new Error(`Error creating default tasks: ${error.message}`);
    } finally {
      connection.release();
    }
  }

}

module.exports = WorkPlanDefaults;
