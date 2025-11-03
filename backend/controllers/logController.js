const Log = require('../models/Log');
const { validationResult } = require('express-validator');

class LogController {
  // Get all logs
  static async getAll(req, res) {
    try {
      const { work_plan_id, date, status } = req.query;
      const filters = {};
      
      if (work_plan_id) filters.work_plan_id = work_plan_id;
      if (date) filters.date = date;
      if (status) filters.status = status;
      
      const logs = await Log.getAll(filters);
      
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get logs by work plan ID
  static async getByWorkPlanId(req, res) {
    try {
      const { workPlanId } = req.params;
      // รองรับพิเศษ: workPlanId = 'null' หรือ '4' หมายถึงดึง logs ที่ work_plan_id IS NULL
      const targetId = (workPlanId === 'null' || workPlanId === '4' || Number(workPlanId) === 4)
        ? null
        : workPlanId;
      const logs = await Log.getByWorkPlanId(targetId);
      
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get log by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const log = await Log.getById(id);
      
      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Log not found'
        });
      }
      
      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Create new log
  static async create(req, res) {
    try {
      console.log('[DEBUG] POST /api/logs req.body:', req.body);
      
      // ไม่ต้องตรวจสอบ validation เลย เพื่อให้งานตวงสูตรทำงานได้
      const rawWpId = req.body.work_plan_id;
      const workPlanId = (rawWpId === 4 || rawWpId === '4' || rawWpId === undefined || rawWpId === null)
        ? null
        : rawWpId;
      
      const payload = {
        // แปลง 4 ให้เป็น NULL ภายในระบบ (ใช้ 4 เป็นโค้ดแทน NULL สำหรับงานตวงสูตร)
        work_plan_id: workPlanId,
        process_number: req.body.process_number,
        status: req.body.status,
        timestamp: req.body.timestamp
      };
      const log = await Log.create(payload);
      console.log('[DEBUG] Log.create result:', log);
      
      // Reload logs เพื่อให้ได้ข้อมูลที่คำนวณ start_time, stop_time, used_time แล้ว
      let updatedProcessLog = null;
      try {
        const allLogs = await Log.getByWorkPlanId(workPlanId);
        updatedProcessLog = allLogs.find(l => l.process_number === payload.process_number);
        console.log('[DEBUG] Updated process log:', updatedProcessLog);
      } catch (reloadError) {
        console.warn('[DEBUG] Failed to reload logs, using basic log data:', reloadError.message);
      }
      
      res.status(201).json({
        success: true,
        data: updatedProcessLog || log,
        message: 'Log created successfully'
      });
    } catch (error) {
      console.error('[DEBUG] Error in LogController.create:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Create weighing log (ไม่ต้องมี validation)
  static async createWeighingLog(req, res) {
    try {
      console.log('[DEBUG] POST /api/logs/weighing req.body:', req.body);
      
      // สำหรับงานตวงสูตร ไม่ต้องตรวจสอบ validation เลย
      const log = await Log.create(req.body);
      console.log('[DEBUG] Weighing log created:', log);
      res.status(201).json({
        success: true,
        data: log,
        message: 'Weighing log created successfully'
      });
    } catch (error) {
      console.error('[DEBUG] Error in LogController.createWeighingLog:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update log
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const log = await Log.update(id, req.body);
      
      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Log not found'
        });
      }
      
      res.json({
        success: true,
        data: log,
        message: 'Log updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete log
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Log.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Log not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Log deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Start process
  static async startProcess(req, res) {
    try {
      const { workPlanId, processNumber } = req.body;
      
      if (!workPlanId || !processNumber) {
        return res.status(400).json({
          success: false,
          message: 'Work plan ID and process number are required'
        });
      }
      
      const log = await Log.startProcess(workPlanId, processNumber);
      
      res.status(201).json({
        success: true,
        data: log,
        message: 'Process started successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Stop process
  static async stopProcess(req, res) {
    try {
      const { workPlanId, processNumber } = req.body;
      
      if (!workPlanId || !processNumber) {
        return res.status(400).json({
          success: false,
          message: 'Work plan ID and process number are required'
        });
      }
      
      const log = await Log.stopProcess(workPlanId, processNumber);
      
      res.status(201).json({
        success: true,
        data: log,
        message: 'Process stopped successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get process status
  static async getProcessStatus(req, res) {
    try {
      const { workPlanId } = req.params;
      const status = await Log.getProcessStatus(workPlanId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get production summary
  static async getProductionSummary(req, res) {
    try {
      const { date } = req.params;
      const summary = await Log.getProductionSummary(date);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get daily summary
  static async getDailySummary(req, res) {
    try {
      console.log('[DEBUG] getDailySummary called with query:', req.query);
      const { productionDate } = req.query;
      
      if (!productionDate) {
        console.log('[DEBUG] No productionDate provided');
        return res.status(400).json({
          success: false,
          message: 'Production Date is required'
        });
      }
      
      console.log('[DEBUG] Calling Log.getDailySummary with date:', productionDate);
      const summary = await Log.getDailySummary(productionDate);
      console.log('[DEBUG] Summary result:', summary);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error in getDailySummary:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get work plans status based on logs
  static async getWorkPlansStatus(req, res) {
    try {
      const { workPlanIds } = req.query;
      
      console.log('[DEBUG] getWorkPlansStatus called with workPlanIds:', workPlanIds);
      
      if (!workPlanIds) {
        return res.status(400).json({
          success: false,
          message: 'workPlanIds parameter is required'
        });
      }
      
      // แปลง string เป็น array
      const workPlanIdsArray = workPlanIds.split(',').map(id => parseInt(id.trim()));
      console.log('[DEBUG] Parsed workPlanIdsArray:', workPlanIdsArray);
      
      const statusMap = await Log.getWorkPlansStatus(workPlanIdsArray);
      console.log('[DEBUG] Status map result:', statusMap);
      
      res.json({
        success: true,
        data: statusMap
      });
    } catch (error) {
      console.error('[ERROR] Error in getWorkPlansStatus:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = LogController; 