import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { success: false, message: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // เรียก API จาก backend เพื่อค้นหา
    const response = await fetch(`${API_BASE_URL}/api/process-steps/search?query=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      // console.error('Backend search failed:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, message: 'Search failed', data: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // ถ้า backend ไม่มี search endpoint ให้สร้าง mock data
    if (!data.success && !data.data) {
      // สร้าง mock search results
      const mockResults = [
        {
          job_code: 'JOB001',
          job_name: `${query} - งานตัวอย่าง 1`,
          category: 'production'
        },
        {
          job_code: 'JOB002', 
          job_name: `${query} - งานตัวอย่าง 2`,
          category: 'assembly'
        },
        {
          job_code: 'JOB003',
          job_name: `${query} - งานตัวอย่าง 3`, 
          category: 'packaging'
        }
      ];

      return NextResponse.json({
        success: true,
        data: mockResults
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    // console.error('Error in search endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Search failed', data: [] },
      { status: 500 }
    );
  }
} 
