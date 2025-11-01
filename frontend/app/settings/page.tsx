'use client';

import { getApiUrl } from '@/lib/config';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  ToggleLeft, 
  Info,
  AlertCircle,
  CheckCircle,
  Clock,
  Timer
} from 'lucide-react';

export default function SettingsPage() {
  const [syncModeEnabled, setSyncModeEnabled] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ฟังก์ชันบันทึกการตั้งค่า
  const saveSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncModeEnabled: syncModeEnabled
        }),
      });

      // ตรวจสอบว่า response มีข้อมูลหรือไม่
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      let data;
      
      try {
        data = text ? JSON.parse(text) : { success: false };
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', text);
        throw new Error('Invalid JSON response from server');
      }

      if (data.success) {
        setMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    setLoading(false);
  };

  // ฟังก์ชันโหลดการตั้งค่า
  const loadSettings = async () => {
    try {
      const response = await fetch(getApiUrl('/api/settings'));
      const data = await response.json();
      if (data.success && data.data) {
        setSyncModeEnabled(data.data.syncModeEnabled || false);
        if (Object.prototype.hasOwnProperty.call(data.data, 'autoRefreshEnabled')) {
          setAutoRefreshEnabled(data.data.autoRefreshEnabled === true);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // โหลดค่า Auto Refresh เฉพาะ เพื่อความทนทานเมื่อ backend ส่งค่า settings รวมไม่ครบ
  const loadAutoRefreshSetting = async () => {
    try {
      const response = await fetch(getApiUrl('/api/settings/auto-refresh'));
      const data = await response.json();
      if (data.success && typeof data.autoRefreshEnabled === 'boolean') {
        setAutoRefreshEnabled(data.autoRefreshEnabled === true);
      }
    } catch (error) {
      console.error('Error loading auto refresh:', error);
    }
  };

  // โหลดการตั้งค่าเมื่อเปิดหน้า
  useEffect(() => {
    loadSettings();
    loadAutoRefreshSetting();
  }, []);

  // บันทึกการตั้งค่าเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (syncModeEnabled !== undefined && autoRefreshEnabled !== undefined) {
      saveSettings();
    }
  }, [syncModeEnabled, autoRefreshEnabled]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="w-6 h-6 text-green-600" />
        <h1 className="text-3xl font-bold">ตั้งค่าระบบ</h1>
      </div>

      {/* การตั้งค่าฟังก์ชัน Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-green-600" />
            <span>การตั้งค่าฟังก์ชัน Sync</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ปุ่มเปิด/ปิด Sync Mode */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <ToggleLeft className="w-5 h-5 text-green-600" />
              <div>
                <Label className="text-base font-semibold">โหมดงานพิเศษ</Label>
                <p className="text-sm text-gray-600">
                  เปิดใช้งานระบบงานพิเศษและการจัดการลำดับงาน
                </p>
              </div>
            </div>
            <Switch
              checked={syncModeEnabled}
              onCheckedChange={setSyncModeEnabled}
              className="data-[state=checked]:bg-green-600"
            />
          </div>

          {/* ข้อความแจ้งเตือน */}
          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('เรียบร้อย') 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* คำอธิบายฟีเจอร์ */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">เมื่อเปิดใช้งาน:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Sync ทำงานปกติ</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>งาน "บันทึกเสร็จสิ้น" → "พิมพ์แล้ว"</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      งานพิเศษ
                    </Badge>
                    <span>มี label "งานพิเศษ" สีเหลือง</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>ลำดับงานจะเป็นงานถัดไปเสมอ (ไม่เรียงตามเวลา/ผู้ปฏิบัติงาน)</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">เมื่อปิดใช้งาน:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Sync ยังทำงานได้</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>งานใหม่ที่ "บันทึกเสร็จสิ้น" → "พิมพ์แล้ว"</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-gray-400">ไม่มี label "งานพิเศษ"</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* สถานะปัจจุบัน */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${syncModeEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="font-medium">
                สถานะปัจจุบัน: {syncModeEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </span>
            </div>
            <Badge variant={syncModeEnabled ? "default" : "secondary"}>
              {syncModeEnabled ? 'โหมดงานพิเศษ' : 'โหมดปกติ'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* การตั้งค่า Auto Refresh */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="w-5 h-5 text-blue-600" />
            <span>การตั้งค่า Auto Refresh</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ปุ่มเปิด/ปิด Auto Refresh */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Timer className="w-5 h-5 text-blue-600" />
              <div>
                <Label className="text-base font-semibold">Auto Refresh หน้า Tracker</Label>
                <p className="text-sm text-gray-600">
                  อัปเดตข้อมูลอัตโนมัติทุก 2 นาทีในหน้า Tracker
                </p>
              </div>
            </div>
            <Switch
              checked={autoRefreshEnabled}
              onCheckedChange={setAutoRefreshEnabled}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          {/* คำอธิบาย */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">เมื่อเปิดใช้งาน:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>ข้อมูลจะอัปเดตอัตโนมัติทุก 2 นาที</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>แสดงสถานะการอัปเดตที่มุมล่างขวา</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">เมื่อปิดใช้งาน:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>ลดการใช้งานเซิร์ฟเวอร์</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>ข้อมูลจะไม่อัปเดตอัตโนมัติ</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* สถานะปัจจุบัน */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${autoRefreshEnabled ? 'bg-blue-500' : 'bg-gray-400'}`} />
              <span className="font-medium">
                สถานะ Auto Refresh: {autoRefreshEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </span>
            </div>
            <Badge variant={autoRefreshEnabled ? 'default' : 'secondary'}>
              {autoRefreshEnabled ? 'อัปเดตอัตโนมัติ' : 'อัปเดตด้วยตนเอง'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* การตั้งค่าอื่นๆ */}
      <Card>
        <CardHeader>
          <CardTitle>การตั้งค่าอื่นๆ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            การตั้งค่าอื่นๆ จะเพิ่มเติมในอนาคต
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 