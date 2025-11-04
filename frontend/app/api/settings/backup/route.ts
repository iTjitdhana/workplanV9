import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/api/settings/backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward query parameters
    if (searchParams.get('list')) {
      params.append('list', searchParams.get('list')!);
    }

    const response = await fetch(`${API_BASE_URL}/api/settings/backup?${params}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch backups' },
      { status: 500 }
    );
  }
} 
