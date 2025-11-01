import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = process.env.BACKEND_URL || config.api.baseUrl;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[API] Creating default tasks:', body);
    
    const response = await fetch(`${API_BASE_URL}/api/work-plans/create-defaults`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Backend error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Backend error: ${response.status}`,
          error: errorText
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('[API] Default tasks created successfully:', data);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Error creating default tasks:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to create default tasks'
      },
      { status: 500 }
    );
  }
}
