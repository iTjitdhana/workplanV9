'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { debugError } from '@/lib/config';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToRoleHome = () => {
      try {
        // ดึงบทบาทจาก localStorage (สำหรับ demo)
        const userRole = localStorage.getItem('userRole');
        
        if (userRole) {
          const roleId = parseInt(userRole);
          // กำหนด URL prefix ตามบทบาท
          const rolePrefixes: { [key: number]: string } = {
            1: '/planner',    // Planner
            2: '/admin',      // Admin
            4: '/viewer',     // Viewer
            5: '/operation'   // Operation
          };
          
          const rolePrefix = rolePrefixes[roleId];
          
          if (rolePrefix) {
            // Redirect ไปยังหน้า home ของบทบาทนั้น
            router.push(`${rolePrefix}/home`);
          } else {
            // ถ้าไม่มีบทบาทที่กำหนด ให้ไปหน้า planner/home
            router.push('/planner/home');
          }
        } else {
          // ถ้าไม่มีบทบาท ให้ไปหน้า planner/home โดยตรง (ไม่ต้อง login)
          router.push('/planner/home');
        }
      } catch (error) {
        debugError('Error redirecting:', error);
        // ถ้าเกิด error ให้ redirect ไปหน้า planner/home
        router.push('/planner/home');
      }
    };

    redirectToRoleHome();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return null;
}
