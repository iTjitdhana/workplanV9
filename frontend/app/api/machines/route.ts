import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { createInternalServerErrorResponse } from '@/lib/api';

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward query parameters
    if (searchParams.get('status')) {
      params.append('status', searchParams.get('status')!);
    }
    if (searchParams.get('search')) {
      params.append('search', searchParams.get('search')!);
    }

    const response = await fetch(`${API_BASE_URL}/api/machines?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, message: `Backend API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch machines' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/api/machines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, message: `Backend API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error creating machine:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create machine' },
      { status: 500 }
    );
  }
} 
