import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { createInternalServerErrorResponse } from '@/lib/api';

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobCode = searchParams.get('jobCode');
    const jobName = searchParams.get('jobName');

    const params = new URLSearchParams();
    if (jobCode) params.set('jobCode', jobCode);
    if (jobName) params.set('jobName', jobName);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/work-plans/print-data/by-job${queryString ? `?${queryString}` : ''}`;

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
    console.error('Error fetching print data by job code:', error);
    const errorResponse = createInternalServerErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

