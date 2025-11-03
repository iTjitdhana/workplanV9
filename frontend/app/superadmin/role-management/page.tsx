'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

interface Role {
  id: number;
  role_name: string;
  display_name: string;
  color: string;
  total_permissions: number;
  allowed_permissions: number;
}

interface Menu {
  id: number;
  menu_key: string;
  label: string;
  path: string;
  menu_group: string;
  sort_order: number;
}

interface Permission {
  id: number;
  role_id: number;
  menu_key: string;
  can_view: boolean;
  menu_label: string;
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ดึงรายการบทบาท
  const fetchRoles = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/roles'));
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      // console.error('Error fetching roles:', error);
      setMessage({ type: 'error', text: 'ไม่สามารถดึงรายการบทบาทได้' });
    }
  };

  // ดึงรายการเมนู
  const fetchMenus = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/menu-catalog'));
      const data = await response.json();
      if (data.success) {
        setMenus(data.data);
      }
    } catch (error) {
      // console.error('Error fetching menus:', error);
      setMessage({ type: 'error', text: 'ไม่สามารถดึงรายการเมนูได้' });
    }
  };

  // ดึงสิทธิ์ของบทบาท
  const fetchRolePermissions = async (roleId: number) => {
    try {
      const response = await fetch(getApiUrl(`/api/admin/roles/${roleId}/permissions`));
      const data = await response.json();
      if (data.success) {
        setRolePermissions(data.data);
      }
    } catch (error) {
      // console.error('Error fetching role permissions:', error);
      setMessage({ type: 'error', text: 'ไม่สามารถดึงสิทธิ์ของบทบาทได้' });
    }
  };

  // โหลดข้อมูลเริ่มต้น
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchMenus()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // เลือกบทบาท
  const handleRoleSelect = async (roleId: number) => {
    setSelectedRole(roleId);
    await fetchRolePermissions(roleId);
  };

  // อัปเดตสิทธิ์
  const handlePermissionChange = async (menuKey: string, checked: boolean) => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      // อัปเดตเฉพาะเมนูที่เปลี่ยน
      const response = await fetch(getApiUrl(`/api/admin/roles/${selectedRole}/permissions/${menuKey}/${checked ? 'grant' : 'revoke'}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: `อัปเดตสิทธิ์ ${menuKey} เป็น ${checked ? 'เปิด' : 'ปิด'}`
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'อัปเดตสิทธิ์เรียบร้อยแล้ว' });
        await fetchRolePermissions(selectedRole);
        await fetchRoles(); // รีเฟรชข้อมูลบทบาท
      } else {
        setMessage({ type: 'error', text: data.message || 'เกิดข้อผิดพลาดในการอัปเดต' });
      }
    } catch (error) {
      // console.error('Error updating permissions:', error);
      setMessage({ type: 'error', text: 'ไม่สามารถอัปเดตสิทธิ์ได้' });
    } finally {
      setSaving(false);
    }
  };

  // ตรวจสอบว่ามีสิทธิ์หรือไม่
  const hasPermission = (menuKey: string) => {
    return rolePermissions.some(p => p.menu_key === menuKey && p.can_view);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">กำลังโหลด...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">จัดการสิทธิ์บทบาท</h1>
        <Button onClick={() => window.location.reload()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          รีเฟรช
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* รายการบทบาท */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>บทบาท</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {roles.map(role => (
                <div
                  key={role.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{role.display_name}</h3>
                      <p className="text-sm text-gray-600">{role.role_name}</p>
                    </div>
                    <Badge variant="secondary">
                      {role.allowed_permissions}/{role.total_permissions}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* จัดการสิทธิ์ */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  จัดการสิทธิ์: {roles.find(r => r.id === selectedRole)?.display_name}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  เลือกเมนูที่บทบาทนี้สามารถเข้าถึงได้
                </p>
              </CardHeader>
              <CardContent>
                {saving && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>กำลังบันทึก...</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menus.map(menu => (
                    <div key={menu.id} className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id={`menu-${menu.menu_key}`}
                        checked={hasPermission(menu.menu_key)}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(menu.menu_key, checked as boolean)
                        }
                        disabled={saving}
                      />
                      <label 
                        htmlFor={`menu-${menu.menu_key}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{menu.label}</div>
                        <div className="text-sm text-gray-500">{menu.path}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <p>เลือกบทบาทเพื่อจัดการสิทธิ์</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
