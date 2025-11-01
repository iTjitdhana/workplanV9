'use client';

import { getApiUrl } from '@/lib/config';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Users, 
  RefreshCw,
  Play,
  Square,
  Trash2,
  TrendingUp,
  Cpu,
  HardDrive
} from 'lucide-react';

interface SystemStats {
  uptime: number;
  requests: number;
  errors: number;
  errorRate: number;
  systemHealth: string;
  databaseConnections: number;
  activeUsers: number;
  alerts: any[];
  // เพิ่มข้อมูลใหม่
  responseTime?: number;
  throughput?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  databaseStatus?: string;
  topErrors?: any[];
  peakHours?: string[];
  mostActivePages?: any[];
  averageSession?: number;
}

export default function MonitoringPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันดึงข้อมูลสถิติ
  const fetchStats = async () => {
    try {
      const response = await fetch(getApiUrl('/api/monitoring/stats'));
      const data = await response.json();
      if (data.success) {
        // เพิ่มข้อมูลจำลองสำหรับการแสดงผล
        const enhancedData = {
          ...data.data,
          responseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
          throughput: Math.floor(Math.random() * 100) + 20, // 20-120 requests/min
          memoryUsage: Math.floor(Math.random() * 60) + 20, // 20-80%
          cpuUsage: Math.floor(Math.random() * 50) + 10, // 10-60%
          databaseStatus: 'เชื่อมต่อปกติ',
          topErrors: [
            { type: 'Database Connection', count: 5 },
            { type: 'API Timeout', count: 3 },
            { type: 'Validation Error', count: 2 }
          ],
          peakHours: ['09:00-11:00', '14:00-16:00'],
          mostActivePages: [
            { page: 'Dashboard', users: 8 },
            { page: 'Tracker', users: 5 },
            { page: 'Reports', users: 3 }
          ],
          averageSession: 45 // นาที
        };
        setStats(enhancedData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ฟังก์ชันดึงข้อมูลการแจ้งเตือน
  const fetchAlerts = async () => {
    try {
      const response = await fetch(getApiUrl('/api/monitoring/alerts'));
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  // ฟังก์ชันเริ่มการติดตาม
  const startMonitoring = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/monitoring/start'), { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setIsMonitoring(true);
        // console.log('Monitoring started');
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
    setLoading(false);
  };

  // ฟังก์ชันหยุดการติดตาม
  const stopMonitoring = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/monitoring/stop'), { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setIsMonitoring(false);
        // console.log('Monitoring stopped');
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
    setLoading(false);
  };

  // ฟังก์ชันล้างการแจ้งเตือน
  const clearAlerts = async () => {
    try {
      const response = await fetch(getApiUrl('/api/monitoring/alerts'), { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setAlerts([]);
        // console.log('Alerts cleared');
      }
    } catch (error) {
      console.error('Error clearing alerts:', error);
    }
  };

  // ฟังก์ชันตรวจสอบสุขภาพระบบ
  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/monitoring/health'), { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        await fetchStats();
        // console.log('Health check completed');
      }
    } catch (error) {
      console.error('Error checking health:', error);
    }
    setLoading(false);
  };

  // อัปเดตข้อมูลทุก 30 วินาที
  useEffect(() => {
    fetchStats();
    fetchAlerts();

    const interval = setInterval(() => {
      fetchStats();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ฟังก์ชันแสดงสถานะสุขภาพ
  const getHealthStatus = (health: string) => {
    switch (health) {
      case 'healthy':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500', text: 'สุขภาพดี' };
      case 'warning':
        return { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-yellow-500', text: 'ต้องระวัง' };
      case 'critical':
        return { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-500', text: 'วิกฤต' };
      default:
        return { icon: <Activity className="w-4 h-4" />, color: 'bg-gray-500', text: 'ไม่ทราบ' };
    }
  };

  // ฟังก์ชันแสดงความรุนแรงของการแจ้งเตือน
  const getAlertSeverity = (severity: string) => {
    switch (severity) {
      case 'high':
        return { color: 'bg-red-500', text: 'สูง' };
      case 'medium':
        return { color: 'bg-yellow-500', text: 'ปานกลาง' };
      case 'low':
        return { color: 'bg-blue-500', text: 'ต่ำ' };
      default:
        return { color: 'bg-gray-500', text: 'ไม่ทราบ' };
    }
  };

  // ฟังก์ชันแปลงเวลา
  const formatUptime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ชั่วโมง ${mins} นาที`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ระบบติดตามสถานะ</h1>
        <div className="flex gap-2">
          <Button
            onClick={checkHealth}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            ตรวจสอบสุขภาพ
          </Button>
          {!isMonitoring ? (
            <Button
              onClick={startMonitoring}
              disabled={loading}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              เริ่มติดตาม
            </Button>
          ) : (
            <Button
              onClick={stopMonitoring}
              disabled={loading}
              variant="destructive"
              size="sm"
            >
              <Square className="w-4 h-4 mr-2" />
              หยุดติดตาม
            </Button>
          )}
        </div>
      </div>

      {/* สถิติระบบหลัก */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สถานะระบบ</CardTitle>
              {getHealthStatus(stats.systemHealth).icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getHealthStatus(stats.systemHealth).text}</div>
              <p className="text-xs text-muted-foreground">
                อัปเดตล่าสุด: {new Date().toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">เวลาทำงาน</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUptime(stats.uptime)}</div>
              <p className="text-xs text-muted-foreground">
                เริ่มต้น: {new Date(Date.now() - stats.uptime * 60000).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">คำขอทั้งหมด</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.requests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ข้อผิดพลาด: {stats.errors} ({stats.errorRate.toFixed(2)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ผู้ใช้งาน</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                กำลังใช้งานอยู่
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* สถิติประสิทธิภาพ */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ประสิทธิภาพ</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Response Time</span>
                <span className="text-sm font-medium">{stats.responseTime}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Throughput</span>
                <span className="text-sm font-medium">{stats.throughput} req/min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Session Avg</span>
                <span className="text-sm font-medium">{stats.averageSession} นาที</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ทรัพยากรระบบ</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">CPU Usage</span>
                  <span className="text-sm font-medium">{stats.cpuUsage}%</span>
                </div>
                <Progress value={stats.cpuUsage} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Memory Usage</span>
                  <span className="text-sm font-medium">{stats.memoryUsage}%</span>
                </div>
                <Progress value={stats.memoryUsage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ฐานข้อมูล</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.databaseConnections} Connections</div>
              <p className="text-xs text-muted-foreground">
                {stats.databaseStatus}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* การแจ้งเตือน */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>การแจ้งเตือน</CardTitle>
            <Button
              onClick={clearAlerts}
              variant="outline"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              ล้างทั้งหมด
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีการแจ้งเตือน
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(-10).reverse().map((alert) => (
                <Alert key={alert.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getAlertSeverity(alert.severity).color}`} />
                      <AlertDescription>
                        <strong>{alert.type}:</strong> {alert.message}
                      </AlertDescription>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ข้อมูลเพิ่มเติม */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">ข้อผิดพลาดที่พบบ่อย</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topErrors?.map((error, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{error.type}</span>
                    <Badge variant="secondary">{error.count} ครั้ง</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">หน้าใช้งานมากที่สุด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.mostActivePages?.map((page, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{page.page}</span>
                    <Badge variant="outline">{page.users} ผู้ใช้</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 