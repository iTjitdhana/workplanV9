import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward query parameters
    if (searchParams.get('start_date')) {
      params.append('start_date', searchParams.get('start_date')!);
    }
    if (searchParams.get('end_date')) {
      params.append('end_date', searchParams.get('end_date')!);
    }
    if (searchParams.get('report_type')) {
      params.append('report_type', searchParams.get('report_type')!);
    }
    if (searchParams.get('format')) {
      params.append('format', searchParams.get('format')!);
    }

    const response = await fetch(`${API_BASE_URL}/api/reports?${params}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    // console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    // console.error('Error creating report:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create report' },
      { status: 500 }
    );
  }
} 
