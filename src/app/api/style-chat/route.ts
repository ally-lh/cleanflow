import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Direct connection to the Gemini Stylist on Port 8005
    const response = await fetch('http://127.0.0.1:8005/api/v1/style-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_message: message }), // Python handles both 'message' and 'user_message'
    });

    if (!response.ok) {
      throw new Error('Gemini server returned an error');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Style Chat Error:", error);
    return NextResponse.json({ error: 'Failed to reach Stylist' }, { status: 500 });
  }
}