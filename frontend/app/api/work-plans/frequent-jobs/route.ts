import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

// Backend server uses port 3101 by default (see backend/server.js)
const API_BASE_URL = config.api.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward query parameters
    const minFrequency = searchParams.get('minFrequency') || '3';
    const limit = searchParams.get('limit') || '50';
    
    params.append('minFrequency', minFrequency);
    params.append('limit', limit);

    const response = await fetch(`${API_BASE_URL}/api/work-plans/frequent-jobs?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          message: `Backend API error: ${response.status} ${errorText}`,
          data: { jobs: [], statistics: null }
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching frequent jobs:', error);
    console.error('API_BASE_URL:', API_BASE_URL);
    console.error('Error details:', {
      message: error.message,
      cause: error.cause,
      stack: error.stack
    });
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + (error.cause?.message || 'Unknown error'),
        data: { jobs: [], statistics: null },
        error: error.message
      },
      { status: 500 }
    );
  }
}
