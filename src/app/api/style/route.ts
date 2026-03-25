import { NextResponse } from "next/server";

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history = [], current_items = [] } = body;

    const response = await fetch(`${PYTHON_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history,
        current_items,
      }),
    });

    if (!response.ok) {
      throw new Error(`Python API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Style assistant error:", error);
    return NextResponse.json(
      { error: "Failed to get style recommendations" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_API_URL}/catalog`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Catalog error:", error);
    return NextResponse.json(
      { error: "Failed to load catalog" },
      { status: 500 }
    );
  }
}
