import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { createInternalServerErrorResponse } from "@/lib/api";

const API_BASE_URL = config.api.baseUrl;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing work plan id" },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/work-plans/${id}/print-data`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          message: `Backend API error: ${response.status} ${errorText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching print data:", error);
    const errorResponse = createInternalServerErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

