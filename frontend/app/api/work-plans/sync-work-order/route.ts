import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    const response = await fetch(`${API_BASE_URL}/api/work-plans/sync-work-order?date=${date}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error syncing work order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to sync work order' },
      { status: 500 }
    );
  }
} 
