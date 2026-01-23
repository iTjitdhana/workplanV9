import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { createInternalServerErrorResponse } from '@/lib/api';

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobCode = searchParams.get('job_code');
    const jobName = searchParams.get('job_name');

    if (!jobCode && !jobName) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุ job_code หรือ job_name' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams();
    if (jobCode) params.set('job_code', jobCode);
    if (jobName) params.set('job_name', jobName);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/work-plans/latest-by-job${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, message: `Backend API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching latest work plan by job:', error);
    const errorResponse = createInternalServerErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
