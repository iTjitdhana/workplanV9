const MenuCatalog = require('../models/MenuCatalog');
const RoleMenuPermission = require('../models/RoleMenuPermission');
const RoleMenuAudit = require('../models/RoleMenuAudit');
const User = require('../models/User');

class RoleMenuController {
  // Bootstrap for current user: role + menu keys + menu catalog
  static async getBootstrap(req, res) {
    try {
      // Try to resolve current user and role
      let roleId = req.user?.role_id || req.user?.roleId || null;
      let userId = req.user?.id || null;

      // Fallback: if no role in req.user, try query param (for SSR debugging)
      if (!roleId && req.query?.roleId) {
        roleId = Number(req.query.roleId);
      }

      // QUICK-FIX: fallback default role to Planner (1) so menu renders without auth
      if (!roleId) {
        roleId = 1;
      }

      // Load permissions and active menu catalog
      const [menuPermissions, menuCatalog] = await Promise.all([
        RoleMenuPermission.getRoleMenuKeys(roleId),
        MenuCatalog.getAll(),
      ]);

      const menuKeys = Array.isArray(menuPermissions) ? menuPermissions : [];

      res.json({
        success: true,
        data: {
          user: userId ? { id: userId } : null,
          role: { id: roleId },
          menu_keys: menuKeys,
          menu_catalog: menuCatalog,
        }
      });
    } catch (error) {
      console.error('Error in getBootstrap:', error);
      res.status(500).json({ success: false, message: 'Failed to load bootstrap data' });
    }
  }
  // Get all menu catalog
  static async getMenuCatalog(req, res) {
    try {
      const menus = await MenuCatalog.getAll();
      
      res.json({
        success: true,
        data: menus
      });
    } catch (error) {
      console.error('Error fetching menu catalog:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการเมนู'
      });
    }
  }

  // Get all roles with their permissions summary
  static async getRolesWithPermissions(req, res) {
    try {
      const roles = await RoleMenuPermission.getRolesWithPermissions();
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Error fetching roles with permissions:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการบทบาท'
      });
    }
  }

  // Get permissions for a specific role
  static async getRolePermissions(req, res) {
    try {
      const { roleId } = req.params;
      const permissions = await RoleMenuPermission.getByRoleId(roleId);
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสิทธิ์ของบทบาท'
      });
    }
  }

  // Get menu keys that a role can access (for frontend permission checking)
  static async getRoleMenuKeys(req, res) {
    try {
      const { roleId } = req.params;
      const menuKeys = await RoleMenuPermission.getMenuKeysByRoleId(roleId);
      
      res.json({
        success: true,
        data: {
          role_id: roleId,
          menu_keys: menuKeys
        }
      });
    } catch (error) {
      console.error('Error fetching role menu keys:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงเมนูที่เข้าถึงได้'
      });
    }
  }

  // Update role permissions
  static async updateRolePermissions(req, res) {
    try {
      const { roleId } = req.params;
      const { menu_permissions, reason = '' } = req.body;
      
      // Get current permissions for audit
      const currentPermissions = await RoleMenuPermission.getByRoleId(roleId);
      
      // Update permissions
      await RoleMenuPermission.updateRolePermissions(roleId, menu_permissions);
      
      // Create audit log
      const auditData = {
        actor_user_id: req.user?.id || null,
        role_id: roleId,
        action: 'bulk_update',
        before_data: currentPermissions,
        after_data: menu_permissions,
        reason: reason,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      };
      
      await RoleMenuAudit.create(auditData);
      
      // Get updated permissions
      const updatedPermissions = await RoleMenuPermission.getByRoleId(roleId);
      
      res.json({
        success: true,
        message: 'อัปเดตสิทธิ์เรียบร้อยแล้ว',
        data: updatedPermissions
      });
    } catch (error) {
      console.error('Error updating role permissions:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตสิทธิ์'
      });
    }
  }

  // Grant permission to a role for a specific menu
  static async grantPermission(req, res) {
    try {
      const { roleId, menuKey } = req.params;
      const { reason = '' } = req.body;
      
      // Check if menu exists
      const menu = await MenuCatalog.getByKey(menuKey);
      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบเมนูที่ระบุ'
        });
      }
      
      // Get current permission for audit
      const currentPermission = await RoleMenuPermission.hasPermission(roleId, menuKey);
      
      // Grant permission
      await RoleMenuPermission.upsert(roleId, menuKey, true);
      
      // Create audit log
      const auditData = {
        actor_user_id: req.user?.id || null,
        role_id: roleId,
        action: 'grant',
        before_data: { menu_key: menuKey, can_view: currentPermission },
        after_data: { menu_key: menuKey, can_view: true },
        reason: reason,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      };
      
      await RoleMenuAudit.create(auditData);
      
      res.json({
        success: true,
        message: 'ให้สิทธิ์เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error granting permission:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการให้สิทธิ์'
      });
    }
  }

  // Revoke permission from a role for a specific menu
  static async revokePermission(req, res) {
    try {
      const { roleId, menuKey } = req.params;
      const { reason = '' } = req.body;
      
      // Get current permission for audit
      const currentPermission = await RoleMenuPermission.hasPermission(roleId, menuKey);
      
      // Revoke permission
      await RoleMenuPermission.upsert(roleId, menuKey, false);
      
      // Create audit log
      const auditData = {
        actor_user_id: req.user?.id || null,
        role_id: roleId,
        action: 'revoke',
        before_data: { menu_key: menuKey, can_view: currentPermission },
        after_data: { menu_key: menuKey, can_view: false },
        reason: reason,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      };
      
      await RoleMenuAudit.create(auditData);
      
      res.json({
        success: true,
        message: 'เพิกถอนสิทธิ์เรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error revoking permission:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเพิกถอนสิทธิ์'
      });
    }
  }

  // Get audit logs for a role
  static async getRoleAuditLogs(req, res) {
    try {
      const { roleId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const auditLogs = await RoleMenuAudit.getByRoleId(roleId, parseInt(limit), parseInt(offset));
      
      res.json({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      console.error('Error fetching role audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติการเปลี่ยนแปลง'
      });
    }
  }

  // Get all audit logs
  static async getAllAuditLogs(req, res) {
    try {
      const { limit = 50, offset = 0, action, start_date, end_date } = req.query;
      
      let auditLogs;
      if (action) {
        auditLogs = await RoleMenuAudit.getByAction(action, parseInt(limit), parseInt(offset));
      } else if (start_date && end_date) {
        auditLogs = await RoleMenuAudit.getByDateRange(start_date, end_date, parseInt(limit), parseInt(offset));
      } else {
        auditLogs = await RoleMenuAudit.getAll(parseInt(limit), parseInt(offset));
      }
      
      res.json({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติการเปลี่ยนแปลง'
      });
    }
  }

  // Get audit summary
  static async getAuditSummary(req, res) {
    try {
      const summary = await RoleMenuAudit.getAuditSummary();
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching audit summary:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสรุปประวัติ'
      });
    }
  }

  // Check if current user has permission for a specific menu
  static async checkUserPermission(req, res) {
    try {
      const { menuKey } = req.params;
      const userId = req.user?.id;
      
      // Get user's role (you'll need to implement this based on your user-role relationship)
      // For now, assuming user has a role_id field or you can get it from somewhere
      const userRoleId = req.user?.role_id;
      
      if (!userRoleId) {
        return res.status(403).json({
          success: false,
          message: 'ผู้ใช้ไม่มีบทบาทที่กำหนด'
        });
      }
      
      const hasPermission = await RoleMenuPermission.hasPermission(userRoleId, menuKey);
      
      res.json({
        success: true,
        data: {
          menu_key: menuKey,
          has_permission: hasPermission
        }
      });
    } catch (error) {
      console.error('Error checking user permission:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
      });
    }
  }

  // Get current user's menu permissions
  static async getUserMenuPermissions(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้'
        });
      }
      
      // Get user's role (you'll need to implement this based on your user-role relationship)
      let userRoleId = req.user?.role_id;
      // QUICK-FIX: default role to Planner (1) when missing
      if (!userRoleId) userRoleId = 1;
      
      const menuKeys = await RoleMenuPermission.getMenuKeysByRoleId(userRoleId);
      
      res.json({
        success: true,
        data: {
          role_id: userRoleId,
          menu_keys: menuKeys
        }
      });
    } catch (error) {
      console.error('Error fetching user menu permissions:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสิทธิ์เมนูของผู้ใช้'
      });
    }
  }
}

module.exports = RoleMenuController;
