import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward query parameters
    if (searchParams.get('category')) {
      params.append('category', searchParams.get('category')!);
    }

    const response = await fetch(`${API_BASE_URL}/api/settings?${params}`);
    
    // ตรวจสอบ HTTP status ก่อน
    if (!response.ok) {
      console.error('Backend API error:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, message: 'Backend API error' },
        { status: response.status }
      );
    }

    const text = await response.text();
    let data;
    
    try {
      data = text ? JSON.parse(text) : { success: false };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', text);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON response from server' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // ตรวจสอบ HTTP status ก่อน
    if (!response.ok) {
      console.error('Backend API error:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, message: 'Backend API error' },
        { status: response.status }
      );
    }

    const text = await response.text();
    let data;
    
    try {
      data = text ? JSON.parse(text) : { success: false };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', text);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON response from server' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 
