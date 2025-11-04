import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/work-plans/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    return NextResponse.json({ success: false, message: text }, { status: response.status });
  } catch (error) {
    console.error('Error printing work plan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to print work plan' },
      { status: 500 }
    );
  }
}
