const express = require('express');
const ProcessStep = require('../models/ProcessStep');
const { pool } = require('../config/database');

const router = express.Router();

// GET /api/process-steps/search - ค้นหางานผลิต
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchTerm = `%${query}%`;
    const results = [];

    // 1. ค้นหาจาก process_steps (มีสูตร)
    const processStepsSql = `
      SELECT DISTINCT job_code, job_name
      FROM process_steps
      WHERE job_code LIKE ? OR job_name LIKE ?
      ORDER BY job_code
      LIMIT 10
    `;
    const [processStepsRows] = await pool.execute(processStepsSql, [searchTerm, searchTerm]);
    if (processStepsRows && processStepsRows.length > 0) {
      results.push(...processStepsRows);
    }

    // 2. ค้นหาจาก fg table (ตารางสินค้าสำเร็จรูป - มีสูตรใน fg_bom)
    const fgSql = `
      SELECT DISTINCT FG_Code AS job_code, FG_Name AS job_name
      FROM fg
      WHERE FG_Code LIKE ? OR FG_Name LIKE ?
      ORDER BY FG_Code
      LIMIT 10
    `;
    const [fgRows] = await pool.execute(fgSql, [searchTerm, searchTerm]);
    if (fgRows && fgRows.length > 0) {
      // กรองข้อมูลที่ซ้ำกับ process_steps แล้ว
      const existingCodes = new Set(results.map(r => r.job_code));
      const newFgRows = fgRows.filter(r => !existingCodes.has(r.job_code));
      results.push(...newFgRows);
    }

    // จำกัดผลลัพธ์ทั้งหมดไม่เกิน 10 รายการ
    const finalResults = results.slice(0, 10);
    
    res.json({
      success: true,
      data: finalResults
    });
  } catch (error) {
    console.error('Error searching process steps:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหางานผลิต'
    });
  }
});

// GET /api/process-steps?job_code=xxxx - ดึง process steps ตาม job_code
router.get('/', async (req, res) => {
  try {
    const { job_code } = req.query;
    if (!job_code) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ job_code' });
    }
    const steps = await ProcessStep.getByJobCode(job_code);
    res.json({ success: true, data: steps });
  } catch (error) {
    console.error('Error fetching process steps by job_code:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงขั้นตอนการผลิต' });
  }
});

// GET /api/process-steps/job-codes - ดึงรายการรหัสงานทั้งหมด
router.get('/job-codes', async (req, res) => {
  try {
    const jobCodes = await ProcessStep.getJobCodes();
    
    res.json({
      success: true,
      data: jobCodes
    });
  } catch (error) {
    console.error('Error fetching job codes:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการรหัสงาน'
    });
  }
});

module.exports = router; 