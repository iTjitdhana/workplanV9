import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings`);
    
    // ตรวจสอบ HTTP status ก่อน
    if (!response.ok) {
      console.error('Backend API error:', response.status, response.statusText);
      return NextResponse.json(
        { 
          success: true, 
          autoRefreshEnabled: false // default to false on error
        },
        { status: 200 }
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
        { 
          success: true, 
          autoRefreshEnabled: false // default to false on parse error
        },
        { status: 200 }
      );
    }

    if (data.success && data.data) {
      return NextResponse.json({
        success: true,
        autoRefreshEnabled: data.data.autoRefreshEnabled === true // default to false
      });
    } else {
      return NextResponse.json({
        success: true,
        autoRefreshEnabled: false // default to false if no setting found
      });
    }
  } catch (error) {
    console.error('Error fetching auto refresh setting:', error);
    return NextResponse.json(
      { 
        success: true, 
        autoRefreshEnabled: false // default to false on error
      },
      { status: 200 }
    );
  }
}
