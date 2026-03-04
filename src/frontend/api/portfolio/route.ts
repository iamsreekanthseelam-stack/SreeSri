// src/app/api/portfolio/route.ts
import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";

const filename = "Portfolio.json";

export async function GET() {
  try {
    const { blobs } = await list();
    const portfolioBlob = blobs.find((b) => b.pathname === filename);
    if (!portfolioBlob) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const response = await fetch(portfolioBlob.url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Fetch Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const blob = await put(filename, JSON.stringify(body), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return NextResponse.json({ success: true, url: blob.url });
  } catch (err) {
    console.error("Blob save error:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
