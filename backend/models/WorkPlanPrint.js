const { pool } = require('../config/database');
const { formatDateForDatabase } = require('../utils/dateUtils');

class WorkPlanPrint {
  static async getPrintDetails(id) {
    try {
      const [rows] = await pool.execute(
        `
          SELECT 
            wp.id,
            DATE_FORMAT(wp.production_date, '%Y-%m-%d') AS production_date,
            wp.job_code,
            wp.job_name,
            TIME_FORMAT(wp.start_time, '%H:%i') AS start_time,
            TIME_FORMAT(wp.end_time, '%H:%i') AS end_time,
            wp.notes,
            m.machine_name,
            pr.room_name,
            fg.FG_Name AS fg_name,
            fg.FG_Code AS fg_code,
            fg.FG_Unit AS fg_unit,
            fg.FG_Size AS fg_size,
            fg.base_unit AS fg_base_unit,
            fg.conversion_rate AS fg_conversion_rate,
            fg.conversion_description AS fg_conversion_description
          FROM work_plans wp
          LEFT JOIN fg ON fg.FG_Code = wp.job_code
          LEFT JOIN machines m ON wp.machine_id = m.id
          LEFT JOIN production_rooms pr ON wp.production_room_id = pr.id
          WHERE wp.id = ?
          LIMIT 1
        `,
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      const workPlan = rows[0];
      
      // ตรวจสอบและแก้ไข job_code ถ้าจำเป็น
      // ถ้า job_code เป็นตัวเลข (1, 2, 3...) หรือ 'NEW' หรือไม่มีสูตร ให้ค้นหาใหม่
      const isNumericJobCode = /^\d+$/.test(workPlan.job_code || '');
      const isInvalidJobCode = !workPlan.job_code || workPlan.job_code === 'NEW' || isNumericJobCode;
      
      let finalJobCode = workPlan.job_code;
      let shouldUpdateJobCode = false;
      
      if (isInvalidJobCode && workPlan.job_name) {
        // ค้นหา job_code ที่ถูกต้องจาก job_name
        const foundJobCode = await this.findJobCodeByName(workPlan.job_name);
        if (foundJobCode) {
          console.log(`🔍 [Print] Found correct job_code for "${workPlan.job_name}": ${foundJobCode} (was: ${workPlan.job_code})`);
          finalJobCode = foundJobCode;
          shouldUpdateJobCode = true;
        }
      }
      
      // ตรวจสอบว่ามีสูตรหรือไม่ ถ้าไม่มีสูตรและ job_code ไม่ถูกต้อง ให้ค้นหาใหม่
      if (finalJobCode && !isInvalidJobCode) {
        const [ingredientCheck] = await pool.execute(
          `SELECT COUNT(*) as count FROM fg_bom WHERE FG_Code = ?`,
          [finalJobCode]
        );
        if (ingredientCheck[0].count === 0 && workPlan.job_name) {
          // ไม่มีสูตร ให้ค้นหา job_code ใหม่
          const foundJobCode = await this.findJobCodeByName(workPlan.job_name);
          if (foundJobCode) {
            console.log(`🔍 [Print] No recipe found for job_code "${finalJobCode}", found correct one: ${foundJobCode}`);
            finalJobCode = foundJobCode;
            shouldUpdateJobCode = true;
          }
        }
      }
      
      // อัพเดท job_code ในฐานข้อมูลถ้าพบว่าไม่ถูกต้อง
      if (shouldUpdateJobCode && finalJobCode) {
        try {
          await pool.execute(
            `UPDATE work_plans SET job_code = ? WHERE id = ?`,
            [finalJobCode, workPlan.id]
          );
          console.log(`✅ [Print] Updated job_code for work_plan ${workPlan.id} from "${workPlan.job_code}" to "${finalJobCode}"`);
          // อัพเดท workPlan.job_code เพื่อใช้ในส่วนถัดไป
          workPlan.job_code = finalJobCode;
          
          // ดึงข้อมูล work_plan ใหม่เพื่อให้ได้ข้อมูลที่อัพเดทแล้ว (รวมถึง start_time, end_time)
          const [updatedRows] = await pool.execute(
            `
              SELECT 
                wp.id,
                DATE_FORMAT(wp.production_date, '%Y-%m-%d') AS production_date,
                wp.job_code,
                wp.job_name,
                TIME_FORMAT(wp.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(wp.end_time, '%H:%i') AS end_time,
                wp.notes,
                m.machine_name,
                pr.room_name
              FROM work_plans wp
              LEFT JOIN machines m ON wp.machine_id = m.id
              LEFT JOIN production_rooms pr ON wp.production_room_id = pr.id
              WHERE wp.id = ?
              LIMIT 1
            `,
            [workPlan.id]
          );
          
          if (updatedRows && updatedRows.length > 0) {
            // อัพเดทข้อมูล workPlan ด้วยข้อมูลใหม่ (รวมถึง start_time, end_time)
            workPlan.start_time = updatedRows[0].start_time;
            workPlan.end_time = updatedRows[0].end_time;
            workPlan.notes = updatedRows[0].notes;
            workPlan.machine_name = updatedRows[0].machine_name;
            workPlan.room_name = updatedRows[0].room_name;
            console.log(`✅ [Print] Refreshed work_plan data after job_code update`);
          }
        } catch (updateError) {
          console.error('❌ [Print] Error updating job_code:', updateError);
          // ยังคงใช้ job_code ที่ค้นหาได้แม้ว่าจะอัพเดทไม่สำเร็จ
        }
      }
      
      // ดึงข้อมูล fg ใหม่ถ้า job_code ถูกแก้ไข
      let fgData = {
        fg_name: workPlan.fg_name,
        fg_code: workPlan.fg_code,
        fg_unit: workPlan.fg_unit,
        fg_size: workPlan.fg_size,
        fg_base_unit: workPlan.fg_base_unit,
        fg_conversion_rate: workPlan.fg_conversion_rate,
        fg_conversion_description: workPlan.fg_conversion_description
      };
      
      if (shouldUpdateJobCode && finalJobCode && finalJobCode !== workPlan.job_code) {
        // ดึงข้อมูล fg ใหม่ด้วย job_code ที่ถูกต้อง
        const [fgRows] = await pool.execute(
          `SELECT FG_Name, FG_Code, FG_Unit, FG_Size, base_unit, conversion_rate, conversion_description
           FROM fg WHERE FG_Code = ? LIMIT 1`,
          [finalJobCode]
        );
        if (fgRows && fgRows.length > 0) {
          fgData = {
            fg_name: fgRows[0].FG_Name,
            fg_code: fgRows[0].FG_Code,
            fg_unit: fgRows[0].FG_Unit,
            fg_size: fgRows[0].FG_Size,
            fg_base_unit: fgRows[0].base_unit,
            fg_conversion_rate: fgRows[0].conversion_rate,
            fg_conversion_description: fgRows[0].conversion_description
          };
        }
      }

      // ลำดับงานในวันเดียวกัน (1-based) - กรองงาน A, B, C, D ออกเพราะยังไม่เปิดให้พิมพ์
      const [orderRows] = await pool.execute(
        `
          SELECT id
          FROM work_plans
          WHERE DATE(production_date) = ?
            AND job_code NOT IN ('A','B','C','D')
          ORDER BY 
            start_time IS NULL,
            start_time,
            id
        `,
        [workPlan.production_date]
      );

      const orderIndex = orderRows.findIndex((row) => row.id === workPlan.id);
      const runningOrder = orderIndex >= 0 ? orderIndex + 1 : null;

      // รายชื่อผู้ปฏิบัติงาน
      const [operatorRows] = await pool.execute(
        `
          SELECT 
            COALESCE(u.name, wpo.id_code) AS name,
            wpo.role
          FROM work_plan_operators wpo
          LEFT JOIN users u 
            ON (wpo.user_id = u.id)
            OR (wpo.id_code IS NOT NULL AND wpo.id_code = u.id_code)
          WHERE wpo.work_plan_id = ?
          ORDER BY wpo.id ASC
        `,
        [workPlan.id]
      );

      const operatorNames = operatorRows
        .map((op) => op.name)
        .filter(Boolean);

      const operators = operatorRows
        .map((op) => ({
          name: op.name || '',
          role: op.role || 'operator'
        }))
        .filter((op) => op.name);

      // รายการวัตถุดิบตามสูตร (ใช้ finalJobCode ที่อาจถูกแก้ไขแล้ว)
      let ingredients = [];
      if (finalJobCode) {
        const [ingredientRows] = await pool.execute(
          `
            SELECT 
              fb.id,
              fb.Raw_Code AS material_code,
              fb.Raw_Qty AS quantity,
              fb.Raw_Unit AS unit,
              m.Mat_Name AS material_name
            FROM fg_bom fb
            LEFT JOIN material m ON m.Mat_Id = fb.Raw_Code
            WHERE fb.FG_Code = ?
            ORDER BY fb.id ASC
          `,
          [finalJobCode]
        );

        ingredients = ingredientRows.map((item, index) => ({
          rowNumber: index + 1,
          materialCode: item.material_code || '',
          materialName: item.material_name || '',
          quantity: item.quantity ?? null,
          unit: item.unit || ''
        }));
      }

      return {
        id: workPlan.id,
        jobCode: finalJobCode || workPlan.job_code,
        jobName: workPlan.job_name,
        productionDate: workPlan.production_date,
        order: runningOrder,
        planTime: {
          start: workPlan.start_time || null,
          end: workPlan.end_time || null
        },
        operatorsFull: operatorNames,
        notes: workPlan.notes || '',
        machineName: workPlan.machine_name || null,
        roomName: workPlan.room_name || null,
        fgSummary: {
          code: fgData.fg_code || null,
          name: fgData.fg_name || null,
          unit: fgData.fg_unit || null,
          size: fgData.fg_size || null,
          baseUnit: fgData.fg_base_unit || null,
          conversionRate: fgData.fg_conversion_rate || null,
          conversionDescription: fgData.fg_conversion_description || null
        },
        operators,
        ingredients
      };
    } catch (error) {
      throw new Error(`Error fetching print data: ${error.message}`);
    }
  }

  static async getPrintDetailsByDate(production_date) {
    try {
      const formattedDate = formatDateForDatabase(production_date);

      if (!formattedDate) {
        throw new Error('Invalid production date');
      }

      const [workPlanRows] = await pool.execute(
        `
          SELECT id
          FROM work_plans
          WHERE DATE(production_date) = ?
            AND job_code NOT IN ('A','B','C','D')
          ORDER BY 
            start_time IS NULL,
            start_time,
            id
        `,
        [formattedDate]
      );

      if (workPlanRows.length === 0) {
        return [];
      }

      const details = await Promise.all(
        workPlanRows.map((row) => this.getPrintDetails(row.id))
      );

      // ใช้ลำดับที่คำนวณจาก getPrintDetails โดยตรง (ไม่ต้อง override ด้วย index + 1)
      // เพราะ getPrintDetails คำนวณลำดับจาก orderRows ที่กรอง A, B, C, D แล้ว
      return details.filter(Boolean);
    } catch (error) {
      throw new Error(`Error fetching print data by date: ${error.message}`);
    }
  }

  static async getPrintDetailsByJobCode(jobCode, options = {}) {
    try {
      if (!jobCode || !jobCode.trim()) {
        throw new Error('jobCode is required');
      }

      const finalJobCode = jobCode.trim();
      let jobName = options.jobName || null;

      // ดึงข้อมูล FG
      let fgData = {
        fg_name: null,
        fg_code: finalJobCode,
        fg_unit: null,
        fg_size: null,
        fg_base_unit: null,
        fg_conversion_rate: null,
        fg_conversion_description: null
      };

      const [fgRows] = await pool.execute(
        `SELECT FG_Name, FG_Code, FG_Unit, FG_Size, base_unit, conversion_rate, conversion_description
         FROM fg WHERE FG_Code = ? LIMIT 1`,
        [finalJobCode]
      );

      if (fgRows && fgRows.length > 0) {
        fgData = {
          fg_name: fgRows[0].FG_Name,
          fg_code: fgRows[0].FG_Code,
          fg_unit: fgRows[0].FG_Unit,
          fg_size: fgRows[0].FG_Size,
          fg_base_unit: fgRows[0].base_unit,
          fg_conversion_rate: fgRows[0].conversion_rate,
          fg_conversion_description: fgRows[0].conversion_description
        };
        jobName = jobName || fgRows[0].FG_Name;
      } else {
        // ลองดึงข้อมูลจาก process_steps ถ้าไม่เจอใน fg
        const [processRows] = await pool.execute(
          `SELECT job_name FROM process_steps WHERE job_code = ? LIMIT 1`,
          [finalJobCode]
        );
        if (processRows && processRows.length > 0) {
          jobName = jobName || processRows[0].job_name;
        }
      }

      // ดึงสูตรวัตถุดิบจาก fg_bom
      const [ingredientRows] = await pool.execute(
        `
          SELECT 
            fb.id,
            fb.Raw_Code AS material_code,
            fb.Raw_Qty AS quantity,
            fb.Raw_Unit AS unit,
            m.Mat_Name AS material_name
          FROM fg_bom fb
          LEFT JOIN material m ON m.Mat_Id = fb.Raw_Code
          WHERE fb.FG_Code = ?
          ORDER BY fb.id ASC
        `,
        [finalJobCode]
      );

      const ingredients = ingredientRows.map((item, index) => ({
        rowNumber: index + 1,
        materialCode: item.material_code || '',
        materialName: item.material_name || '',
        quantity: item.quantity ?? null,
        unit: item.unit || ''
      }));

      return {
        id: null,
        jobCode: finalJobCode,
        jobName: jobName || finalJobCode,
        productionDate: null,
        order: null,
        planTime: {
          start: null,
          end: null
        },
        operatorsFull: [],
        notes: '',
        machineName: null,
        roomName: null,
        fgSummary: {
          code: fgData.fg_code || finalJobCode,
          name: fgData.fg_name || jobName || null,
          unit: fgData.fg_unit || null,
          size: fgData.fg_size || null,
          baseUnit: fgData.fg_base_unit || null,
          conversionRate: fgData.fg_conversion_rate || null,
          conversionDescription: fgData.fg_conversion_description || null
        },
        operators: [],
        ingredients
      };
    } catch (error) {
      throw new Error(`Error fetching print data by job code: ${error.message}`);
    }
  }

  // พิมพ์ใบงานผลิต
  static async printWorkPlan(production_date) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const formattedDate = formatDateForDatabase(production_date);
      
      console.log('🖨️ Printing work plan for:', formattedDate);
      
      // เช็คว่ามีงาน draft อยู่ไหม (งานที่ไม่ใช่ A,B,C,D และ status_id = 1 - รองรับ DB ที่ไม่มี job_type/workflow_status)
      const [draftCheck] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM work_plans
        WHERE DATE(production_date) = ? 
          AND job_code NOT IN ('A', 'B', 'C', 'D')
          AND COALESCE(status_id, 1) = 1
      `, [formattedDate]);
      
      if (draftCheck[0].count > 0) {
        console.log('⚠️ Found', draftCheck[0].count, 'draft tasks');
        await connection.rollback();
        return {
          success: false,
          message: 'กรุณาบันทึกงานให้เสร็จสิ้นทุกงานก่อนพิมพ์',
          draftCount: draftCheck[0].count
        };
      }
      
      // อัพเดทสถานะเป็น "พิมพ์แล้ว" (ถ้า DB มีคอลัมน์ workflow_status, is_printed)
      let updatedRows = 0;
      try {
        const [updateResult] = await connection.execute(`
          UPDATE work_plans 
          SET workflow_status = 'printed', is_printed = 1
          WHERE DATE(production_date) = ? AND (workflow_status IN ('draft', 'completed') OR workflow_status IS NULL)
        `, [formattedDate]);
        updatedRows = updateResult.affectedRows || 0;
        console.log('✅ Updated', updatedRows, 'work plans to printed');
      } catch (updateErr) {
        if (updateErr.message && updateErr.message.includes('Unknown column')) {
          console.log('⚠️ workflow_status/is_printed columns not found, skipping status update');
        } else {
          throw updateErr;
        }
      }
      
      // บันทึก log การพิมพ์
      await connection.execute(`
        INSERT INTO workplan_sync_log (production_date, synced_at)
        VALUES (?, NOW())
      `, [formattedDate]);
      
      console.log('📝 Logged print action');
      
      await connection.commit();
      
      console.log('🎉 Print successful!');
      
      return { 
        success: true, 
        message: 'พิมพ์ใบงานสำเร็จ',
        updated: updatedRows
      };
      
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error printing work plan:', error);
      throw new Error(`Error printing work plan: ${error.message}`);
    } finally {
      connection.release();
    }
  }

}

module.exports = WorkPlanPrint;
