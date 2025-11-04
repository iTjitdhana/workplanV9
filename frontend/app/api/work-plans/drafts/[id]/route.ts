import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const API_BASE_URL = config.api.baseUrl;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    
    // แยก ID จาก format "draft_1753" เป็น "1753"
    const cleanId = id.startsWith('draft_') ? id.replace('draft_', '') : id;
    
    // console.log('📝 [DEBUG] Original ID:', id);
    // console.log('📝 [DEBUG] Clean ID:', cleanId);
    
    const response = await fetch(`${API_BASE_URL}/api/work-plans/drafts/${cleanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating work plan draft:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update work plan draft' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // แยก ID จาก format "draft_1753" เป็น "1753"
    const cleanId = id.startsWith('draft_') ? id.replace('draft_', '') : id;
    
    // console.log('🗑️ [DEBUG] Original ID:', id);
    // console.log('🗑️ [DEBUG] Clean ID:', cleanId);
    
    const response = await fetch(`${API_BASE_URL}/api/work-plans/drafts/${cleanId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting work plan draft:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete work plan draft' },
      { status: 500 }
    );
  }
} 