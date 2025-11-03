import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const BACKEND_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward query parameters to backend
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value);
    }

    const backendUrl = `${BACKEND_URL}/api/reports/production-analysis?${params}`;
    // console.log('[DEBUG] Frontend API calling backend:', backendUrl);
    // console.log('[DEBUG] Query parameters:', Object.fromEntries(params.entries()));
    // console.log('[DEBUG] Limit parameter:', params.get('limit'));

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in production analysis API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch production analysis' },
      { status: 500 }
    );
  }
}
