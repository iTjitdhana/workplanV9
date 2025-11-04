import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/api/reports/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Handle different response types (JSON, CSV, Excel)
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      // For file downloads (CSV, Excel)
      const blob = await response.blob();
      const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 'report.csv';
      
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export report' },
      { status: 500 }
    );
  }
} 
