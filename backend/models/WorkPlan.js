const { pool } = require('../config/database');
const { formatDateForDatabase } = require('../utils/dateUtils');
const WorkPlanDefaults = require('./WorkPlanDefaults');
const WorkPlanPrint = require('./WorkPlanPrint');

class WorkPlan {
  // Get all work plans with operators (optimized version)
  static async getAll(date = null, page = 1, limit = 50, filters = {}) {
    try {
      console.log('🔍 WorkPlan.getAll called with date:', date);
      console.log('🔍 Date type:', typeof date);
      
      // Step 1: ดึงข้อมูล work plans (ไม่ใช้ job_type/workflow_status/is_printed เพื่อรองรับ DB ที่ยังไม่มีคอลัมน์เหล่านี้)
      // ใช้ TIME_FORMAT เพื่อให้ start_time/end_time เป็น string "HH:MM" เสมอ (รวมงาน default A,B,C,D)
      let mainQuery = `
        SELECT 
          wp.id,
          DATE_FORMAT(wp.production_date, '%Y-%m-%d') as production_date,
          wp.job_code,
          wp.job_name,
          TIME_FORMAT(wp.start_time, '%H:%i') as start_time,
          TIME_FORMAT(wp.end_time, '%H:%i') as end_time,
          wp.machine_id,
          wp.production_room_id,
          wp.notes,
          COALESCE(wp.status_id, 1) as status_id,
          COALESCE(ps.name, 'รอดำเนินการ') as status_name,
          COALESCE(ps.color, '#FF6B6B') as status_color,
          ff.is_finished,
          wp.is_special
        FROM work_plans wp
        LEFT JOIN production_statuses ps ON wp.status_id = ps.id
        LEFT JOIN finished_flags ff ON wp.id = ff.work_plan_id
      `;
      
      const params = [];
      const conditions = [];
      
      if (date) {
        // ตรวจสอบรูปแบบวันที่และแปลงให้ถูกต้อง
        let formattedDate = date;
        if (typeof date === 'string') {
          // ถ้าเป็น ISO string ให้ตัดเอาเฉพาะส่วนวันที่
          if (date.includes('T')) {
            formattedDate = date.split('T')[0];
          }
          // ตรวจสอบรูปแบบ YYYY-MM-DD
          if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            console.error('❌ Invalid date format:', date);
            throw new Error('Invalid date format. Expected YYYY-MM-DD');
          }
        }
        
        // ใช้การเปรียบเทียบวันที่ที่ยืดหยุ่นมากขึ้น
        conditions.push('(DATE(wp.production_date) = ? OR wp.production_date = ?)');
        params.push(formattedDate, formattedDate);
        
        console.log('🔍 Formatted date:', formattedDate);
        console.log('🔍 SQL Query:', mainQuery);
        console.log('🔍 Params:', params);
      } else {
        console.log('⚠️ No date parameter provided, will return all work plans');
      }
      
      // เพิ่ม filters อื่นๆ
      if (filters.search) {
        conditions.push('(wp.job_name LIKE ? OR wp.job_code LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      if (filters.status) {
        conditions.push('wp.status_id = ?');
        params.push(filters.status);
      }
      
      if (filters.job_code) {
        conditions.push('wp.job_code LIKE ?');
        params.push(`%${filters.job_code}%`);
      }
      
      // เพิ่ม WHERE clause ถ้ามี conditions
      if (conditions.length > 0) {
        mainQuery += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      // เรียงลำดับ: งาน A,B,C,D ก่อน (A,B,C,D) แล้วค่อยงานอื่น (ใช้ job_code รองรับ DB ที่ไม่มี job_type)
      mainQuery += ` ORDER BY 
        CASE WHEN wp.job_code = 'A' THEN 1 WHEN wp.job_code = 'B' THEN 2 WHEN wp.job_code = 'C' THEN 3 WHEN wp.job_code = 'D' THEN 4 ELSE 5 END ASC,
        wp.id ASC`;
      
      // เพิ่ม pagination
      if (limit && limit > 0) {
        const offset = (page - 1) * limit;
        mainQuery += ` LIMIT ${limit} OFFSET ${offset}`;
      }
      
      const [rows] = await pool.execute(mainQuery, params);
      
      // Step 2: ดึงข้อมูล operators แยกต่างหาก (เฉพาะ work plans ที่ได้)
      if (rows.length > 0) {
        const workPlanIds = rows.map(row => row.id);
        
        // ดึงข้อมูล operators
        const operatorsQuery = `
          SELECT 
            wpo.work_plan_id,
            GROUP_CONCAT(
              DISTINCT COALESCE(u.name, wpo.id_code)
              ORDER BY wpo.id ASC
              SEPARATOR ', '
            ) AS operators_from_join,
            GROUP_CONCAT(
              DISTINCT wpo.id_code
              ORDER BY wpo.id ASC
              SEPARATOR ', '
            ) AS operator_codes
          FROM work_plan_operators wpo
          LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
          WHERE wpo.work_plan_id IN (${workPlanIds.map(() => '?').join(',')})
          GROUP BY wpo.work_plan_id
        `;
        
        const [operatorsData] = await pool.execute(operatorsQuery, workPlanIds);
        
        // ดึงข้อมูล rooms และ machines
        const roomsQuery = `SELECT id, room_name FROM production_rooms WHERE id IN (${rows.map(r => r.production_room_id).filter(Boolean).map(() => '?').join(',') || '0'})`;
        const machinesQuery = `SELECT id, machine_name FROM machines WHERE id IN (${rows.map(r => r.machine_id).filter(Boolean).map(() => '?').join(',') || '0'})`;
        
        const roomIds = rows.map(r => r.production_room_id).filter(Boolean);
        const machineIds = rows.map(r => r.machine_id).filter(Boolean);
        
        const [roomsData] = roomIds.length > 0 ? await pool.execute(roomsQuery, roomIds) : [[]];
        const [machinesData] = machineIds.length > 0 ? await pool.execute(machinesQuery, machineIds) : [[]];
        
        // รวมข้อมูลเข้าด้วยกัน
        const operatorsMap = new Map(operatorsData.map(op => [op.work_plan_id, op]));
        const roomsMap = new Map(roomsData.map(room => [room.id, room.room_name]));
        const machinesMap = new Map(machinesData.map(machine => [machine.id, machine.machine_name]));
        
        // เพิ่มข้อมูลที่ดึงมาใส่ในผลลัพธ์
        rows.forEach(row => {
          const operators = operatorsMap.get(row.id);
          if (operators) {
            row.operators = operators.operators_from_join || ''; // ✅ ใช้ชื่อคอลัมน์ที่ Frontend คาดหวัง
            row.operators_from_join = operators.operators_from_join;
            row.operator_codes = operators.operator_codes;
          } else {
            row.operators = ''; // ✅ ไม่มีผู้ปฏิบัติงาน
          }
          
          row.production_room_name = roomsMap.get(row.production_room_id) || null;
          row.machine_name = machinesMap.get(row.machine_id) || null;
        });

        // เติม job_type, workflow_status, is_printed ถ้า DB ไม่มีคอลัมน์ (ให้ frontend ใช้ได้)
        const defaultCodes = ['A', 'B', 'C', 'D'];
        rows.forEach(row => {
          if (row.job_type == null) row.job_type = defaultCodes.includes(row.job_code) ? 'default' : 'regular';
          // derive workflow_status จาก status_id (1=แบบร่าง, 2=บันทึกเสร็จสิ้น, 3=พิมพ์แล้ว, 4=เสร็จสิ้น)
          if (row.workflow_status == null) {
            const sid = row.status_id != null ? Number(row.status_id) : 1;
            row.workflow_status = sid === 2 || sid === 4 ? 'completed' : sid === 3 ? 'printed' : 'draft';
          }
          if (row.is_printed == null) row.is_printed = 0;
        });
      }
      console.log('✅ Found work plans:', rows.length);
      
      if (rows.length > 0) {
        console.log('📊 Sample work plan:', rows[0]);
        console.log('📊 All production dates found:', rows.map(r => r.production_date));
        
        // ✅ Debug: ตรวจสอบ operators สำหรับงาน A, B, C, D
        const abcdPlans = rows.filter(r => ['A', 'B', 'C', 'D'].includes(r.job_code));
        if (abcdPlans.length > 0) {
          console.log('🔍 [DEBUG] A, B, C, D work plans operators:');
          abcdPlans.forEach(plan => {
            console.log(`  - ${plan.job_code}: operators="${plan.operators || ''}"`, 
              `operators_from_join="${plan.operators_from_join || ''}"`);
          });
        }
      } else {
        console.log('⚠️ No work plans found for date:', date);
      }
      
      return rows;
    } catch (error) {
      console.error('❌ Error in WorkPlan.getAll:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
      
      // ส่งกลับ empty array แทนการ throw error เพื่อให้ frontend ยังทำงานได้
      console.log('🔄 Returning empty array due to error');
      return [];
      // Fallback query if status_id column doesn't exist
      console.log('⚠️ Status column not found, using fallback query');
      let fallbackQuery = `
        SELECT 
          wp.id,
          DATE_FORMAT(wp.production_date, '%Y-%m-%d') as production_date,
          wp.job_code,
          wp.job_name,
          wp.start_time,
          wp.end_time,
          wp.notes,
          1 as status_id,
          'รอดำเนินการ' as status_name,
          '#FF6B6B' as status_color,
          ff.is_finished,
          ff.updated_at as finished_at,
          GROUP_CONCAT(
            DISTINCT COALESCE(u.name, wpo.id_code)
            ORDER BY wpo.id ASC
            SEPARATOR ', '
          ) as operators_from_join,
          GROUP_CONCAT(
            DISTINCT wpo.id_code
            ORDER BY wpo.id ASC
            SEPARATOR ', '
          ) as operator_codes,
          pr.room_name as production_room_name,
          m.machine_name as machine_name
        FROM work_plans wp
        LEFT JOIN finished_flags ff ON wp.id = ff.work_plan_id
        LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
        LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        LEFT JOIN production_rooms pr ON wp.production_room_id = pr.id
        LEFT JOIN machines m ON wp.machine_id = m.id
      `;
      
      const params = [];
      if (date) {
        fallbackQuery += ' WHERE DATE(CONVERT_TZ(wp.production_date, "UTC", "Asia/Bangkok")) = ?';
        params.push(date);
      }
      
      fallbackQuery += ` GROUP BY wp.id, wp.production_date, wp.job_code, wp.job_name, wp.start_time, wp.end_time, wp.notes, ff.is_finished, ff.updated_at, pr.room_name, m.machine_name
                         ORDER BY 
                         CASE 
                           WHEN COALESCE(wp.status_id, 1) = 10 THEN 2  -- งานพิเศษ (status_id = 10) อยู่ล่างสุด
                           ELSE 1  -- งานปกติอยู่บนสุด
                         END ASC,
                         wp.start_time ASC, 
                         CASE 
                           WHEN GROUP_CONCAT(DISTINCT COALESCE(u.name, wpo.id_code) ORDER BY wpo.id ASC) LIKE 'อ%' THEN 0 
                           ELSE 1 
                         END ASC,
                         GROUP_CONCAT(DISTINCT COALESCE(u.name, wpo.id_code) ORDER BY wpo.id ASC) ASC`;
      
      const [rows] = await pool.execute(fallbackQuery, params);
      console.log('📊 Fallback query results:', rows.length, 'rows');
      return rows;
    }
  }

  // Get work plan by ID
  static async getById(id) {
    try {
      const query = `
        SELECT 
          wp.id,
          DATE_FORMAT(wp.production_date, '%Y-%m-%d') as production_date,
          wp.job_code,
          wp.job_name,
          wp.start_time,
          wp.end_time,
          wp.notes,
          COALESCE(wp.status_id, 1) as status_id,
          ff.is_finished,
          ff.updated_at as finished_at
        FROM work_plans wp
        LEFT JOIN finished_flags ff ON wp.id = ff.work_plan_id
        WHERE wp.id = ?
      `;
      
      const [rows] = await pool.execute(query, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const workPlan = rows[0];
      const defaultCodes = ['A', 'B', 'C', 'D'];
      if (workPlan.job_type == null) workPlan.job_type = defaultCodes.includes(workPlan.job_code) ? 'default' : 'regular';
      if (workPlan.workflow_status == null) {
        const sid = workPlan.status_id != null ? Number(workPlan.status_id) : 1;
        workPlan.workflow_status = sid === 2 || sid === 4 ? 'completed' : sid === 3 ? 'printed' : 'draft';
      }
      if (workPlan.is_printed == null) workPlan.is_printed = workPlan.workflow_status === 'printed' ? 1 : 0;
      
      // Get operators
      const operatorQuery = `
        SELECT 
          wpo.id,
          wpo.user_id,
          wpo.id_code,
          u.name
        FROM work_plan_operators wpo
        LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE wpo.work_plan_id = ?
      `;
      
      const [operators] = await pool.execute(operatorQuery, [id]);
      // ✅ แปลง operators array เป็น string
      workPlan.operators = operators.map(op => op.name || op.id_code).filter(Boolean).join(', ');
      
      return workPlan;
    } catch (error) {
      throw new Error(`Error fetching work plan: ${error.message}`);
    }
  }

  // ดึงข้อมูลงานล่าสุดตาม job_code หรือ job_name เพื่อใช้ auto-fill
  static async getLatestByJob(jobCode = null, jobName = null) {
    try {
      if (!jobCode && !jobName) {
        return null;
      }

      let query = `
        SELECT 
          wp.id,
          DATE_FORMAT(wp.production_date, '%Y-%m-%d') as production_date,
          wp.job_code,
          wp.job_name,
          TIME_FORMAT(wp.start_time, '%H:%i') as start_time,
          TIME_FORMAT(wp.end_time, '%H:%i') as end_time,
          wp.machine_id,
          wp.production_room_id,
          pr.room_code,
          pr.room_name,
          m.machine_code,
          m.machine_name
        FROM work_plans wp
        LEFT JOIN production_rooms pr ON wp.production_room_id = pr.id
        LEFT JOIN machines m ON wp.machine_id = m.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (jobCode) {
        query += ` AND wp.job_code = ?`;
        params.push(jobCode);
      }
      
      if (jobName) {
        query += ` AND wp.job_name = ?`;
        params.push(jobName);
      }
      
      // เรียงตามวันที่ล่าสุด และ id ล่าสุด
      query += ` ORDER BY wp.production_date DESC, wp.id DESC LIMIT 1`;
      
      const [rows] = await pool.execute(query, params);
      
      if (rows.length === 0) {
        return null;
      }
      
      const workPlan = rows[0];
      
      // ดึงข้อมูล operators
      const operatorQuery = `
        SELECT 
          wpo.id,
          wpo.user_id,
          wpo.id_code,
          u.name
        FROM work_plan_operators wpo
        LEFT JOIN users u ON wpo.user_id = u.id OR wpo.id_code = u.id_code
        WHERE wpo.work_plan_id = ?
        ORDER BY wpo.id ASC
        LIMIT 4
      `;
      
      const [operators] = await pool.execute(operatorQuery, [workPlan.id]);
      
      // แปลง operators เป็น array ของชื่อ (สูงสุด 4 คน)
      workPlan.operators = operators.map(op => op.name || op.id_code).filter(Boolean);
      
      // ถ้าแผนล่าสุดไม่มีข้อมูลห้องผลิต ให้ดึงจากแผนที่มีข้อมูลห้องผลิตล่าสุด
      if (!workPlan.room_code && !workPlan.room_name && workPlan.production_room_id === null) {
        let roomQuery = `
          SELECT 
            pr.room_code,
            pr.room_name,
            wp.production_room_id
          FROM work_plans wp
          LEFT JOIN production_rooms pr ON wp.production_room_id = pr.id
          WHERE wp.production_room_id IS NOT NULL
        `;
        
        const roomParams = [];
        
        if (jobCode) {
          roomQuery += ` AND wp.job_code = ?`;
          roomParams.push(jobCode);
        }
        
        if (jobName) {
          roomQuery += ` AND wp.job_name = ?`;
          roomParams.push(jobName);
        }
        
        roomQuery += ` ORDER BY wp.production_date DESC, wp.id DESC LIMIT 1`;
        
        const [roomRows] = await pool.execute(roomQuery, roomParams);
        
        if (roomRows.length > 0 && roomRows[0].room_code) {
          workPlan.room_code = roomRows[0].room_code;
          workPlan.room_name = roomRows[0].room_name;
          workPlan.production_room_id = roomRows[0].production_room_id;
        }
      }
      
      return workPlan;
    } catch (error) {
      throw new Error(`Error fetching latest work plan: ${error.message}`);
    }
  }

  // Helper function to format time
  static formatTime(timeString) {
    if (!timeString || timeString === '' || timeString === null) return null;
    
    // If already in HH:MM:SS format, return as is
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // If in HH:MM format, add :00 seconds
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      return timeString + ':00';
    }
    
    // If single number (like 9), convert to 09:00:00
    if (/^\d{1,2}$/.test(timeString)) {
      const hour = timeString.padStart(2, '0');
      return `${hour}:00:00`;
    }
    
    return timeString;
  }


  // Create new work plan
  static async create(workPlanData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { 
        production_date, job_code, job_name, start_time, end_time, notes, operators,
        workflow_status, machine_id, production_room_id
      } = workPlanData;
      
      console.log('🗄️ Database insert - production_date:', production_date);
      console.log('🗄️ Database insert - production_date type:', typeof production_date);
      
      // แปลงวันที่ให้เป็นรูปแบบที่ถูกต้อง
      let formattedDate = formatDateForDatabase(production_date);
      console.log('🗄️ Formatted date for database:', formattedDate);
      
      // เช็คว่าพิมพ์ใบงานไปแล้วหรือยัง
      const [syncLog] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM workplan_sync_log 
        WHERE DATE(production_date) = ?
      `, [formattedDate]);
      
      const isPrinted = syncLog[0].count > 0;
      const defaultCodes = ['A', 'B', 'C', 'D'];
      const job_type = (job_code && defaultCodes.includes(String(job_code).toUpperCase())) ? 'default' : (isPrinted ? 'special' : 'regular');
      console.log('🖨️ Is printed?', isPrinted, '-> job_type:', job_type);
      
      const formattedStartTime = this.formatTime(start_time);
      const formattedEndTime = this.formatTime(end_time);
      console.log('🕐 Original start_time:', start_time, '-> Formatted:', formattedStartTime);
      console.log('🕐 Original end_time:', end_time, '-> Formatted:', formattedEndTime);
      
      // Insert work plan (ใช้เฉพาะคอลัมน์ที่มีในตาราง work_plans ทุก environment)
      const insertQuery = `
        INSERT INTO work_plans 
        (production_date, job_code, job_name, start_time, end_time, machine_id, production_room_id, notes, status_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `;
      
      const [result] = await connection.execute(insertQuery, [
        formattedDate,
        job_code,
        job_name,
        formattedStartTime || null,
        formattedEndTime || null,
        machine_id || null,
        production_room_id || null,
        notes || null
      ]);
      
      const workPlanId = result.insertId;
      
      console.log('✅ Work plan created with ID:', workPlanId);
      
      // Insert operators if provided
      if (operators && operators.length > 0) {
        const operatorQuery = `
          INSERT INTO work_plan_operators (work_plan_id, user_id, id_code)
          VALUES (?, ?, ?)
        `;
        
        for (const operator of operators) {
          await connection.execute(operatorQuery, [
            workPlanId,
            operator.user_id || null,
            operator.id_code || null
          ]);
        }
        
        console.log('👥 Inserted', operators.length, 'operators');
      }
      
      await connection.commit();
      return { id: workPlanId, ...workPlanData, job_type, workflow_status: workflow_status || 'draft' };
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error creating work plan:', error);
      throw new Error(`Error creating work plan: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Update work plan
  static async update(id, workPlanData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { 
        production_date, job_code, job_name, start_time, end_time, notes, operators,
        workflow_status, workflow_status_id, machine_id, production_room_id
      } = workPlanData;

      // แปลง workflow_status เป็น status_id สำหรับอัปเดต (1=แบบร่าง, 2=บันทึกเสร็จสิ้น, 3=พิมพ์แล้ว, 4=เสร็จสิ้น)
      let statusIdToSet = workflow_status_id != null ? Number(workflow_status_id) : null;
      if (statusIdToSet == null && workflow_status) {
        const w = String(workflow_status).toLowerCase();
        if (w === 'completed') statusIdToSet = 2;
        else if (w === 'printed') statusIdToSet = 3;
        else if (w === 'finished' || w === 'เสร็จสิ้น') statusIdToSet = 4;
        else if (w === 'draft') statusIdToSet = 1;
      }
      
      console.log('🔄 Updating work plan:', id, 'with workflow_status:', workflow_status, 'status_id:', statusIdToSet);
      
      // แปลงวันที่ให้เป็นรูปแบบที่ถูกต้อง
      let formattedDate = production_date ? formatDateForDatabase(production_date) : null;
      
      // Format times (เฉพาะเมื่อส่งมา)
      let formattedStartTime = null;
      let formattedEndTime = null;
      if (start_time !== undefined && start_time !== null) {
        formattedStartTime = this.formatTime(start_time);
      }
      if (end_time !== undefined && end_time !== null) {
        formattedEndTime = this.formatTime(end_time);
      }
      
      // ตรวจสอบว่ามีคอลัมน์ status_id หรือไม่ โดยใช้ connection ปัจจุบัน (เลี่ยงเปิด connection ใหม่ที่อาจทำให้เกิด lock)
      let hasStatusIdColumn = false;
      try {
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'work_plans' 
          AND COLUMN_NAME = 'status_id'
        `);
        hasStatusIdColumn = columns.length > 0;
      } catch (e) {
        console.warn('⚠️ Unable to check status_id column, skipping status update in main query:', e?.message || e);
      }

      // Update work plan (ไม่ใช้ workflow_status, operators column เพื่อรองรับ DB ที่ไม่มีคอลัมน์เหล่านี้)
      // ถ้ามี status_id column และมีค่าที่จะอัปเดต ให้รวม status_id ใน query เดียวกัน
      let updateQuery = `
        UPDATE work_plans 
        SET 
          production_date = COALESCE(?, production_date),
          job_code = COALESCE(?, job_code),
          job_name = COALESCE(?, job_name),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          machine_id = COALESCE(?, machine_id),
          production_room_id = COALESCE(?, production_room_id),
          notes = COALESCE(?, notes)
      `;

      const updateParams = [
        formattedDate,
        job_code || null,
        job_name || null,
        formattedStartTime,
        formattedEndTime,
        machine_id || null,
        production_room_id || null,
        notes || null,
      ];

      if (hasStatusIdColumn && statusIdToSet != null) {
        updateQuery += `,
          status_id = ?
        `;
        updateParams.push(statusIdToSet);
      }

      updateQuery += `
        WHERE id = ?
      `;
      updateParams.push(id);

      await connection.execute(updateQuery, updateParams);
      
      console.log('✅ Updated work plan basic info (and status_id if provided)');

      // อัปเดต workflow_status และ is_printed ถ้า DB มีคอลัมน์เหล่านี้
      if (workflow_status) {
        try {
          const w = String(workflow_status).toLowerCase();
          if (w === 'printed') {
            await connection.execute(
              `UPDATE work_plans SET workflow_status = 'printed', is_printed = 1 WHERE id = ?`,
              [id]
            );
          } else if (w === 'completed') {
            await connection.execute(
              `UPDATE work_plans SET workflow_status = 'completed', is_printed = 0 WHERE id = ?`,
              [id]
            );
          } else if (w === 'draft') {
            await connection.execute(
              `UPDATE work_plans SET workflow_status = 'draft', is_printed = 0 WHERE id = ?`,
              [id]
            );
          }
        } catch (updateErr) {
          if (!(updateErr.message && updateErr.message.includes('Unknown column'))) {
            throw updateErr;
          }
        }
      }
      
      // Update operators (เฉพาะเมื่อส่งมา)
      if (operators !== undefined && operators !== null) {
        // Delete existing operators
        await connection.execute('DELETE FROM work_plan_operators WHERE work_plan_id = ?', [id]);
        
        console.log('🗑️ Deleted old operators');
        
        // Insert new operators
        if (Array.isArray(operators) && operators.length > 0) {
          const operatorQuery = `
            INSERT INTO work_plan_operators (work_plan_id, user_id, id_code)
            VALUES (?, ?, ?)
          `;
          
          for (const operator of operators) {
            await connection.execute(operatorQuery, [
              id,
              operator.user_id || null,
              operator.id_code || null
            ]);
          }
          
          console.log('👥 Inserted', operators.length, 'new operators');
        }
      }
      
      await connection.commit();
      
      console.log('🎉 Work plan updated successfully');
      
      return { id, ...workPlanData };
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error updating work plan:', error);
      throw new Error(`Error updating work plan: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Delete work plan
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete related data first (foreign key constraints)
      await connection.execute('DELETE FROM finished_flags WHERE work_plan_id = ?', [id]);
      await connection.execute('DELETE FROM work_plan_operators WHERE work_plan_id = ?', [id]);
      
      // Delete the work plan
      const query = 'DELETE FROM work_plans WHERE id = ?';
      const [result] = await connection.execute(query, [id]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error deleting work plan: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Mark work plan as finished
  static async markAsFinished(id) {
    try {
      const query = `
        INSERT INTO finished_flags (work_plan_id, is_finished, updated_at)
        VALUES (?, 1, NOW())
        ON DUPLICATE KEY UPDATE is_finished = 1, updated_at = NOW()
      `;
      
      await pool.execute(query, [id]);
      return true;
    } catch (error) {
      throw new Error(`Error marking work plan as finished: ${error.message}`);
    }
  }

  // Mark work plan as unfinished
  static async markAsUnfinished(id) {
    try {
      const query = `
        INSERT INTO finished_flags (work_plan_id, is_finished, updated_at)
        VALUES (?, 0, NOW())
        ON DUPLICATE KEY UPDATE is_finished = 0, updated_at = NOW()
      `;
      
      await pool.execute(query, [id]);
      return true;
    } catch (error) {
      throw new Error(`Error marking work plan as unfinished: ${error.message}`);
    }
  }

  // Update work plan status
  static async updateStatus(id, statusId) {
    try {
      // ตรวจสอบว่ามีคอลัมน์ status_id หรือไม่
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'work_plans' 
        AND COLUMN_NAME = 'status_id'
      `);
      
      if (columns.length === 0) {
        console.log('⚠️ status_id column not found, skipping status update');
        return true; // Return true to avoid error
      }
      
      const query = 'UPDATE work_plans SET status_id = ? WHERE id = ?';
      const [result] = await pool.execute(query, [statusId, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating work plan status:', error);
      return false;
    }
  }

  // Get work plan by ID (alias for getById)
  static async findById(id) {
    return this.getById(id);
  }

  // ฟังก์ชันค้นหา job_code จาก job_name
  static async findJobCodeByName(jobName) {
    if (!jobName || !jobName.trim()) return null;
    
    try {
      const searchTerm = `%${jobName.trim()}%`;
      
      // 1. ค้นหาจาก fg table (ตารางสินค้าสำเร็จรูป - มีสูตรใน fg_bom)
      const [fgRows] = await pool.execute(
        `
          SELECT FG_Code, FG_Name
          FROM fg
          WHERE FG_Name LIKE ? OR FG_Code LIKE ?
          ORDER BY 
            CASE WHEN FG_Name = ? THEN 1 ELSE 2 END,
            FG_Code
          LIMIT 5
        `,
        [searchTerm, searchTerm, jobName.trim()]
      );
      
      if (fgRows && fgRows.length > 0) {
        // หา exact match ก่อน
        const exactMatch = fgRows.find(row => 
          row.FG_Name && row.FG_Name.trim().toLowerCase() === jobName.trim().toLowerCase()
        );
        if (exactMatch && exactMatch.FG_Code) {
          return exactMatch.FG_Code.trim();
        }
        // ถ้าไม่มี exact match ให้ใช้ตัวแรก
        if (fgRows[0] && fgRows[0].FG_Code) {
          return fgRows[0].FG_Code.trim();
        }
      }
      
      // 2. ค้นหาจาก process_steps
      const [processRows] = await pool.execute(
        `
          SELECT DISTINCT job_code, job_name
          FROM process_steps
          WHERE job_name LIKE ? OR job_code LIKE ?
          ORDER BY 
            CASE WHEN job_name = ? THEN 1 ELSE 2 END,
            job_code
          LIMIT 5
        `,
        [searchTerm, searchTerm, jobName.trim()]
      );
      
      if (processRows && processRows.length > 0) {
        const exactMatch = processRows.find(row => 
          row.job_name && row.job_name.trim().toLowerCase() === jobName.trim().toLowerCase()
        );
        if (exactMatch && exactMatch.job_code) {
          return exactMatch.job_code.trim();
        }
        if (processRows[0] && processRows[0].job_code) {
          return processRows[0].job_code.trim();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding job_code by name:', error);
      return null;
    }
  }

  // Delegates — keep controller API stable after extract
  static async createDefaultTasks(production_date) {
    return WorkPlanDefaults.createDefaultTasks(production_date);
  }

  static async getPrintDetails(id) {
    return WorkPlanPrint.getPrintDetails(id);
  }

  static async getPrintDetailsByDate(production_date) {
    return WorkPlanPrint.getPrintDetailsByDate(production_date);
  }

  static async getPrintDetailsByJobCode(jobCode, options = {}) {
    return WorkPlanPrint.getPrintDetailsByJobCode(jobCode, options);
  }

  static async printWorkPlan(production_date) {
    return WorkPlanPrint.printWorkPlan(production_date);
  }
}

const DraftWorkPlan = require('./DraftWorkPlan');

module.exports = { WorkPlan, DraftWorkPlan };
