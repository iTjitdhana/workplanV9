const express = require('express');
const { body } = require('express-validator');
const { WorkPlanController, DraftWorkPlanController } = require('../controllers/workPlanController');

const router = express.Router();

// Validation middleware สำหรับสร้างงานใหม่ (POST)
const workPlanCreateValidation = [
  body('production_date')
    .custom((value) => {
      if (!value) return true; // optional fields
      // Accept YYYY-MM-DD or ISO8601
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return dateRegex.test(value);
    })
    .withMessage('Production date must be in YYYY-MM-DD or ISO8601 format'),
  body('job_code')
    .notEmpty()
    .withMessage('Job code is required')
    .isLength({ max: 50 })
    .withMessage('Job code must not exceed 50 characters'),
  body('job_name')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Job name must not exceed 255 characters'),
  body('start_time')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // ถ้าเป็น null หรือ undefined หรือ empty string ให้ผ่าน (สำหรับแบบร่าง)
      if (!value || value === '' || value === null) return true;
      // ถ้ามีค่าให้ตรวจสอบรูปแบบ
      return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
    })
    .withMessage('Start time must be in HH:MM or HH:MM:SS format'),
  body('end_time')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // ถ้าเป็น null หรือ undefined หรือ empty string ให้ผ่าน (สำหรับแบบร่าง)
      if (!value || value === '' || value === null) return true;
      // ถ้ามีค่าให้ตรวจสอบรูปแบบ
      return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
    })
    .withMessage('End time must be in HH:MM or HH:MM:SS format'),
  body('operators')
    .optional()
    .isArray()
    .withMessage('Operators must be an array')
];

// Validation middleware สำหรับอัพเดทงาน (PUT) - ยืดหยุ่นกว่า
const workPlanUpdateValidation = [
  body('production_date')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value) return true; // optional fields
      // Accept YYYY-MM-DD or ISO8601
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return dateRegex.test(value);
    })
    .withMessage('Production date must be in YYYY-MM-DD or ISO8601 format'),
  body('job_code')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('Job code must not exceed 50 characters'),
  body('job_name')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Job name must not exceed 255 characters'),
  body('start_time')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // ถ้าเป็น null หรือ undefined หรือ empty string ให้ผ่าน (สำหรับแบบร่าง)
      if (!value || value === '' || value === null) return true;
      // ถ้ามีค่าให้ตรวจสอบรูปแบบ
      return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
    })
    .withMessage('Start time must be in HH:MM or HH:MM:SS format'),
  body('end_time')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // ถ้าเป็น null หรือ undefined หรือ empty string ให้ผ่าน (สำหรับแบบร่าง)
      if (!value || value === '' || value === null) return true;
      // ถ้ามีค่าให้ตรวจสอบรูปแบบ
      return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
    })
    .withMessage('End time must be in HH:MM or HH:MM:SS format'),
  body('operators')
    .optional({ nullable: true, checkFalsy: true })
    .isArray()
    .withMessage('Operators must be an array')
];

// Routes - Draft routes ต้องมาก่อน dynamic routes (:id)
router.get('/drafts', DraftWorkPlanController.getAll);
router.get('/drafts/:id', DraftWorkPlanController.getById);
router.post('/drafts', DraftWorkPlanController.create);
router.put('/drafts/:id', DraftWorkPlanController.update);
router.delete('/drafts/:id', DraftWorkPlanController.delete);
router.post('/sync-drafts-to-plans', DraftWorkPlanController.syncDraftsToPlans);

// Work plan routes
router.get('/search', WorkPlanController.searchWorkPlans);
router.get('/frequent-jobs', WorkPlanController.getFrequentJobs); // ดึงงานที่ทำบ่อย
router.get('/latest-by-job', WorkPlanController.getLatestByJob); // ดึงข้อมูลงานล่าสุดตาม job_code/job_name
router.get('/', WorkPlanController.getAllWorkPlans);
router.post('/create-defaults', WorkPlanController.createDefaultTasks); // สร้างงาน ABCD อัตโนมัติ
router.post('/print', WorkPlanController.printWorkPlan); // พิมพ์ใบงานผลิต
router.get('/print-data/by-date', WorkPlanController.getPrintDataByDate);
router.get('/print-data/by-job', WorkPlanController.getPrintDataByJobCode);
router.get('/:id/print-data', WorkPlanController.getPrintData);
router.get('/:id', WorkPlanController.getById);
router.post('/', workPlanCreateValidation, WorkPlanController.create);
router.put('/:id', workPlanUpdateValidation, WorkPlanController.update);
router.delete('/:id', WorkPlanController.delete);
router.patch('/:id/finish', WorkPlanController.markAsFinished);
router.patch('/:id/unfinish', WorkPlanController.markAsUnfinished);
router.patch('/:id/cancel', WorkPlanController.cancelProduction);
router.patch('/:id/status', WorkPlanController.updateStatus);

module.exports = router; 