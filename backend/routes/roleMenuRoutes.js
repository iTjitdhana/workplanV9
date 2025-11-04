const express = require('express');
const RoleMenuController = require('../controllers/roleMenuController');

const router = express.Router();

// Menu Catalog Routes
// GET /api/admin/menu-catalog - ดึงรายการเมนูทั้งหมด
router.get('/menu-catalog', RoleMenuController.getMenuCatalog);

// Role Management Routes
// GET /api/admin/roles - ดึงรายการบทบาทพร้อมสรุปสิทธิ์
router.get('/roles', RoleMenuController.getRolesWithPermissions);

// GET /api/admin/roles/:roleId/permissions - ดึงสิทธิ์ของบทบาท
router.get('/roles/:roleId/permissions', RoleMenuController.getRolePermissions);

// GET /api/admin/roles/:roleId/menu-keys - ดึงเมนูที่บทบาทเข้าถึงได้
router.get('/roles/:roleId/menu-keys', RoleMenuController.getRoleMenuKeys);

// PUT /api/admin/roles/:roleId/permissions - อัปเดตสิทธิ์ของบทบาท
router.put('/roles/:roleId/permissions', RoleMenuController.updateRolePermissions);

// POST /api/admin/roles/:roleId/permissions/:menuKey/grant - ให้สิทธิ์เมนู
router.post('/roles/:roleId/permissions/:menuKey/grant', RoleMenuController.grantPermission);

// POST /api/admin/roles/:roleId/permissions/:menuKey/revoke - เพิกถอนสิทธิ์เมนู
router.post('/roles/:roleId/permissions/:menuKey/revoke', RoleMenuController.revokePermission);

// Audit Routes
// GET /api/admin/roles/:roleId/audit-logs - ดึงประวัติการเปลี่ยนแปลงของบทบาท
router.get('/roles/:roleId/audit-logs', RoleMenuController.getRoleAuditLogs);

// GET /api/admin/audit-logs - ดึงประวัติการเปลี่ยนแปลงทั้งหมด
router.get('/audit-logs', RoleMenuController.getAllAuditLogs);

// GET /api/admin/audit-summary - ดึงสรุปประวัติการเปลี่ยนแปลง
router.get('/audit-summary', RoleMenuController.getAuditSummary);

// User Permission Routes
// GET /api/me/permissions - ดึงสิทธิ์เมนูของผู้ใช้ปัจจุบัน
// Support both absolute and relative mount paths
router.get('/me/permissions', RoleMenuController.getUserMenuPermissions);
router.get('/permissions', RoleMenuController.getUserMenuPermissions);

// GET /api/me/permissions/:menuKey/check - ตรวจสอบสิทธิ์เมนูของผู้ใช้
router.get('/me/permissions/:menuKey/check', RoleMenuController.checkUserPermission);

// GET /api/me/bootstrap - ข้อมูล bootstrap สำหรับ SSR/เมนู
router.get('/me/bootstrap', RoleMenuController.getBootstrap);
router.get('/bootstrap', RoleMenuController.getBootstrap);

module.exports = router;
