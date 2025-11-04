import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(`${API_BASE_URL}/api/work-plans/${id}/finish`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error marking work plan as finished:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to mark work plan as finished' },
      { status: 500 }
    );
  }
}
















