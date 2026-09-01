const { pool } = require('../config/database');
const { formatDateForDatabase } = require('../utils/dateUtils');

class DraftWorkPlan {
  static async getAll(date = null) {
    let query = `
      SELECT 
        wd.*,
        DATE_FORMAT(wd.production_date, "%Y-%m-%d") as production_date,
        pr.room_name as production_room_name,
        m.machine_name as machine_name
      FROM work_plan_drafts wd
      LEFT JOIN production_rooms pr ON wd.production_room_id = pr.id
      LEFT JOIN machines m ON wd.machine_id = m.id
    `;
    
    const params = [];
    
    // ✅ กรองตามวันที่ถ้ามี
    if (date) {
      query += ' WHERE DATE(wd.production_date) = ?';
      params.push(date);
    }
    
    query += ' ORDER BY wd.production_date DESC, wd.id DESC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }
  static async getById(id) {
    const [rows] = await pool.execute(`
      SELECT 
        wd.*,
        pr.room_name as production_room_name,
        m.machine_name as machine_name
      FROM work_plan_drafts wd
      LEFT JOIN production_rooms pr ON wd.production_room_id = pr.id
      LEFT JOIN machines m ON wd.machine_id = m.id
      WHERE wd.id = ?
    `, [id]);
    return rows[0] || null;
  }
  static async create(data) {
    const { production_date, job_code, job_name, start_time, end_time, machine_id, production_room_id, notes, workflow_status_id, operators } = data;
    // เช็คซ้ำก่อน insert
    const [existing] = await pool.execute(
      'SELECT * FROM work_plan_drafts WHERE production_date = ? AND job_code = ? AND job_name = ? LIMIT 1',
      [production_date, job_code, job_name]
    );
    if (existing.length > 0) {
      return existing[0]; // ถ้ามีอยู่แล้ว return draft เดิม
    }
    const [result] = await pool.execute(
      'INSERT INTO work_plan_drafts (production_date, job_code, job_name, start_time, end_time, machine_id, production_room_id, notes, workflow_status_id, operators) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [production_date, job_code, job_name, start_time, end_time, machine_id, production_room_id, notes || '', workflow_status_id || 1, JSON.stringify(operators || [])]
    );
    return { id: result.insertId, ...data };
  }
  static async update(id, data) {
    const { production_date, job_code, job_name, start_time, end_time, machine_id, production_room_id, notes, workflow_status_id, operators } = data;
    
    // ตรวจสอบและจัดการ undefined values
    const safeProductionDate = production_date || null;
    const safeJobCode = job_code || null;
    const safeJobName = job_name || null;
    const safeStartTime = start_time || null;
    const safeEndTime = end_time || null;
    const safeMachineId = machine_id || null;
    const safeProductionRoomId = production_room_id || null;
    const safeNotes = notes || '';
    const safeWorkflowStatusId = workflow_status_id || 1;
    const safeOperators = operators || [];
    
    await pool.execute(
      'UPDATE work_plan_drafts SET production_date=?, job_code=?, job_name=?, start_time=?, end_time=?, machine_id=?, production_room_id=?, notes=?, workflow_status_id=?, operators=? WHERE id=?',
      [safeProductionDate, safeJobCode, safeJobName, safeStartTime, safeEndTime, safeMachineId, safeProductionRoomId, safeNotes, safeWorkflowStatusId, JSON.stringify(safeOperators), id]
    );
    return { id, ...data };
  }
  static async delete(id) {
    await pool.execute('DELETE FROM work_plan_drafts WHERE id = ?', [id]);
    return true;
  }
  static async syncDraftsToPlans(targetDate = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      let query = 'SELECT * FROM work_plan_drafts WHERE workflow_status_id = 2 AND job_code NOT IN (\'A\', \'B\', \'C\', \'D\')';
      let params = [];
      
      // ถ้ามีการระบุวันที่ ให้ sync เฉพาะวันที่นั้น
      if (targetDate) {
        // แปลงวันที่ให้เป็นรูปแบบที่ถูกต้อง
        const formattedDate = formatDateForDatabase(targetDate);
        query += ' AND DATE(production_date) = ?';
        params.push(formattedDate);
        console.log('🔄 [DEBUG] Formatted target date:', formattedDate);
      }
      
      query += ' ORDER BY production_date ASC, start_time ASC';
      
      console.log('🔄 Sync query:', query);
      console.log('🔄 Sync params:', params);
      console.log('🔄 [PROTECTION] กรองออกงาน A, B, C, D จาก sync');
      
      // ดึง drafts ที่มีสถานะ "บันทึกเสร็จสิ้น" (workflow_status_id = 2) และไม่ใช่ A, B, C, D
      const [drafts] = await connection.execute(query, params);
      
      console.log('🔄 Found drafts to sync:', drafts.length);
      drafts.forEach((draft, index) => {
        console.log(`🔄 Draft ${index + 1}:`, {
          id: draft.id,
          job_name: draft.job_name,
          production_date: draft.production_date,
          workflow_status_id: draft.workflow_status_id
        });
      });
      
      let syncedCount = 0;
      const syncedDrafts = [];
      
      // 1. บันทึก log การ sync
      let syncLogId = null;
      // 2. ดึงเวลาซิงค์ล่าสุดของวันนั้น (ก่อน insert log ใหม่)
      let lastSyncTime = null;
      if (targetDate) {
        const formattedDate = formatDateForDatabase(targetDate);
        const [syncRows] = await connection.execute(
          'SELECT synced_at FROM workplan_sync_log WHERE DATE(production_date) = ? ORDER BY synced_at DESC LIMIT 1',
          [formattedDate]
        );
        if (syncRows.length > 0) {
          lastSyncTime = new Date(syncRows[0].synced_at);
          console.log(`[SYNC] Last sync time for ${formattedDate}:`, lastSyncTime);
        } else {
          console.log(`[SYNC] No previous sync found for ${formattedDate}`);
        }
      }
      
      for (const draft of drafts) {
        try {
          // แปลง operators จาก JSON string เป็น array (robust)
          let operators = [];
          try {
            if (typeof draft.operators === 'string' && (draft.operators.trim().startsWith('[') || draft.operators.trim().startsWith('{'))) {
              operators = JSON.parse(draft.operators);
            } else if (Array.isArray(draft.operators)) {
              operators = draft.operators;
            } else {
              operators = [];
            }
          } catch (e) {
            operators = [];
          }
          
          // ตรวจสอบว่ามีงานในวันนั้นอยู่แล้วหรือไม่ (เฉพาะที่ไม่ใช่ A, B, C, D)
          const defaultCodes = ['A', 'B', 'C', 'D'];
          const isDefaultJob = defaultCodes.includes(draft.job_code);
          // เช็คว่ามี A, B, C, D ใน workplans จริงของวันนั้นหรือยัง
          const [existingDefault] = await connection.execute(
            'SELECT COUNT(*) as count FROM work_plans WHERE DATE(production_date) = DATE(?) AND job_code = ?',
            [draft.production_date, draft.job_code]
          );
          const [existingPlans] = await connection.execute(
            'SELECT COUNT(*) as count FROM work_plans WHERE DATE(production_date) = DATE(?) AND job_code NOT IN (\'A\', \'B\', \'C\', \'D\')',
            [draft.production_date]
          );
          const isSpecialJob = existingPlans[0].count > 0 && !isDefaultJob;
          // 3. เช็คว่า draft นี้ถูกสร้างหลัง sync หรือไม่ (is_special)
          let isSpecialDraft = false;
          if (lastSyncTime && draft.created_at) {
            const draftCreatedAt = new Date(draft.created_at);
            isSpecialDraft = draftCreatedAt > lastSyncTime;
            console.log(`[SYNC] Draft ${draft.job_code} ${draft.job_name}:`, {
              draftCreatedAt: draftCreatedAt,
              lastSyncTime: lastSyncTime,
              isSpecialDraft: isSpecialDraft
            });
          } else {
            console.log(`[SYNC] Draft ${draft.job_code} ${draft.job_name}: No lastSyncTime or created_at, isSpecialDraft = false`);
          }
          // 4. ไม่เติม prefix งานพิเศษใน job_code/job_name
          let jobCode = draft.job_code;
          let jobName = draft.job_name;
          // log debug
          console.log(`[SYNC] draft: ${draft.job_code} ${draft.job_name}, isSpecialDraft: ${isSpecialDraft}`);
          // สร้าง work plan ใหม่
          let insertQuery, insertParams;
          // ตรวจสอบว่ามี status_id และ is_special column หรือไม่
          const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'work_plans' 
            AND COLUMN_NAME IN ('status_id', 'is_special', 'machine_id', 'production_room_id')
          `);
          const hasStatusColumn = columns.some(col => col.COLUMN_NAME === 'status_id');
          const hasIsSpecialColumn = columns.some(col => col.COLUMN_NAME === 'is_special');
          const hasMachineIdColumn = columns.some(col => col.COLUMN_NAME === 'machine_id');
          const hasProductionRoomIdColumn = columns.some(col => col.COLUMN_NAME === 'production_room_id');
          console.log('🔄 Has status_id column:', hasStatusColumn, 'Has is_special column:', hasIsSpecialColumn);
          console.log('🔄 Has machine_id column:', hasMachineIdColumn, 'Has production_room_id column:', hasProductionRoomIdColumn);
          // ตรวจสอบว่ามี operators column หรือไม่
          const [operatorsColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'work_plans' 
            AND COLUMN_NAME = 'operators'
          `);
          const hasOperatorsColumn = operatorsColumns.length > 0;
          console.log('🔄 Has operators column:', hasOperatorsColumn);
          
                    if (hasStatusColumn && hasIsSpecialColumn && hasOperatorsColumn && hasMachineIdColumn && hasProductionRoomIdColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, status_id, is_special, notes, operators, machine_id, production_room_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date,
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              isSpecialDraft ? 10 : 3, // 10 = งานพิเศษ, 3 = พิมพ์แล้ว (สำหรับงานที่บันทึกเสร็จสิ้นแล้ว)
              isSpecialDraft ? 1 : 0,   // is_special
              draft.notes || null,      // notes
              JSON.stringify(operators), // operators
              draft.machine_id || null,  // machine_id
              draft.production_room_id || null // production_room_id
            ];
          } else if (hasStatusColumn && hasOperatorsColumn && hasMachineIdColumn && hasProductionRoomIdColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, status_id, notes, operators, machine_id, production_room_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date, 
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              isSpecialDraft ? 10 : 3, // 10 = งานพิเศษ, 3 = พิมพ์แล้ว (สำหรับงานที่บันทึกเสร็จสิ้นแล้ว)
              draft.notes || null,     // notes
              JSON.stringify(operators), // operators
              draft.machine_id || null,  // machine_id
              draft.production_room_id || null // production_room_id
            ];
          } else if (hasStatusColumn && hasIsSpecialColumn && hasMachineIdColumn && hasProductionRoomIdColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, status_id, is_special, notes, machine_id, production_room_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date, 
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              isSpecialDraft ? 10 : 3, // 10 = งานพิเศษ, 3 = พิมพ์แล้ว (สำหรับงานที่บันทึกเสร็จสิ้นแล้ว)
              isSpecialDraft ? 1 : 0,   // is_special
              draft.notes || null,      // notes
              draft.machine_id || null,  // machine_id
              draft.production_room_id || null // production_room_id
            ];
          } else if (hasStatusColumn && hasMachineIdColumn && hasProductionRoomIdColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, status_id, notes, machine_id, production_room_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date, 
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              isSpecialDraft ? 10 : 3, // 10 = งานพิเศษ, 3 = พิมพ์แล้ว (สำหรับงานที่บันทึกเสร็จสิ้นแล้ว)
              draft.notes || null,     // notes
              draft.machine_id || null,  // machine_id
              draft.production_room_id || null // production_room_id
            ];
          } else if (hasMachineIdColumn && hasProductionRoomIdColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, notes, machine_id, production_room_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date, 
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              draft.notes || null,     // notes
              draft.machine_id || null,  // machine_id
              draft.production_room_id || null // production_room_id
            ];
          } else if (hasStatusColumn && hasIsSpecialColumn && hasOperatorsColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, status_id, is_special, notes, operators) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date,
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              isSpecialDraft ? 10 : 3, // 10 = งานพิเศษ, 3 = พิมพ์แล้ว (สำหรับงานที่บันทึกเสร็จสิ้นแล้ว)
              isSpecialDraft ? 1 : 0,   // is_special
              draft.notes || null,      // notes
              JSON.stringify(operators) // operators
            ];
          } else if (hasStatusColumn && hasOperatorsColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, status_id, notes, operators) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date, 
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              isSpecialDraft ? 10 : 3, // 10 = งานพิเศษ, 3 = พิมพ์แล้ว (สำหรับงานที่บันทึกเสร็จสิ้นแล้ว)
              draft.notes || null,     // notes
              JSON.stringify(operators) // operators
            ];
          } else if (hasStatusColumn && hasIsSpecialColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, status_id, is_special, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date, 
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              isSpecialDraft ? 10 : 3, // 10 = งานพิเศษ, 3 = พิมพ์แล้ว (สำหรับงานที่บันทึกเสร็จสิ้นแล้ว)
              isSpecialDraft ? 1 : 0,   // is_special
              draft.notes || null       // notes
            ];
          } else if (hasStatusColumn) {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, status_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date, 
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              isSpecialDraft ? 10 : 3, // 10 = งานพิเศษ, 3 = พิมพ์แล้ว (สำหรับงานที่บันทึกเสร็จสิ้นแล้ว)
              draft.notes || null      // notes
            ];
          } else {
            insertQuery = 'INSERT INTO work_plans (production_date, job_code, job_name, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?, ?)';
            insertParams = [
              draft.production_date, 
              jobCode, 
              jobName, 
              draft.start_time, 
              draft.end_time,
              draft.notes || null      // notes
            ];
          }
          console.log('🔄 Insert query:', insertQuery);
          console.log('🔄 Insert params:', insertParams);
          console.log('🔄 Machine ID from draft:', draft.machine_id, 'Production Room ID from draft:', draft.production_room_id);
          const [result] = await connection.execute(insertQuery, insertParams);
          const workPlanId = result.insertId;
          // เพิ่ม operators
          for (const operator of operators) {
            await connection.execute(
              'INSERT INTO work_plan_operators (work_plan_id, user_id, id_code) VALUES (?, ?, ?)',
              [workPlanId, operator.user_id || null, operator.id_code || null]
            );
          }
          // ลบ draft หลังจาก sync สำเร็จ
          console.log('🔄 Deleting draft ID:', draft.id);
          await connection.execute('DELETE FROM work_plan_drafts WHERE id = ?', [draft.id]);
          syncedCount++;
          syncedDrafts.push({ draftId: draft.id, workPlanId });
          console.log('🔄 Successfully synced draft:', {
            draft_id: draft.id,
            work_plan_id: workPlanId,
            job_name: jobName
          });
          
        } catch (err) {
          console.error(`Error syncing draft ${draft.id}:`, err);
          // ไม่ rollback ทั้งหมด แต่ข้าม draft ที่มีปัญหา
          continue;
        }
      }
      
      // 3. บันทึก log การ sync (ย้ายมาหลัง loop)
      if (targetDate) {
        const formattedDate = formatDateForDatabase(targetDate);
        const [syncLogResult] = await connection.execute(
          'INSERT INTO workplan_sync_log (production_date) VALUES (?)',
          [formattedDate]
        );
        syncLogId = syncLogResult.insertId;
        console.log(`[SYNC] Inserted sync log with ID: ${syncLogId}`);
      }
      
      console.log('🔄 Committing transaction...');
      await connection.commit();
      
      console.log('🔄 Sync completed. Total synced:', syncedCount);
      
      return {
        success: true,
        synced: syncedCount,
        drafts: syncedDrafts,
        message: `Sync สำเร็จ ${syncedCount} รายการ`
      };
      
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error syncing drafts to plans: ${error.message}`);
    } finally {
      connection.release();
    }
  }
}

module.exports = DraftWorkPlan;
