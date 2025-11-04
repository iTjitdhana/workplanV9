import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(`${API_BASE_URL}/api/work-plans/${id}/cancel`, {
      method: 'PATCH',
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
    console.error('Error cancelling work plan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to cancel work plan' },
      { status: 500 }
    );
  }
}


