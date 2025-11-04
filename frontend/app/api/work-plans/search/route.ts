import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward query parameters
    if (searchParams.get('query')) {
      params.append('query', searchParams.get('query')!);
    }
    if (searchParams.get('date')) {
      params.append('date', searchParams.get('date')!);
    }
    if (searchParams.get('status')) {
      params.append('status', searchParams.get('status')!);
    }
    if (searchParams.get('room')) {
      params.append('room', searchParams.get('room')!);
    }
    if (searchParams.get('machine')) {
      params.append('machine', searchParams.get('machine')!);
    }

    const response = await fetch(`${API_BASE_URL}/api/work-plans/search?${params}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching work plans:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to search work plans' },
      { status: 500 }
    );
  }
} 
