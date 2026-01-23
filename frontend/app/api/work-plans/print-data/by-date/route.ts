import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { createInternalServerErrorResponse } from "@/lib/api";

const API_BASE_URL = config.api.baseUrl;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { success: false, message: "Missing production date" },
        { status: 400 }
      );
    }

    const url = new URL(`${API_BASE_URL}/api/work-plans/print-data/by-date`);
    url.searchParams.set("date", date);

    const response = await fetch(url.toString(), {
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
    console.error("Error fetching print data by date:", error);
    const errorResponse = createInternalServerErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


