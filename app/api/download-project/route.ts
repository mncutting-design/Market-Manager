import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { generateProjectZip } from "@/scripts/make-zip.mjs";

export async function GET() {
  try {
    const rootDir = process.cwd();
    const publicZip = path.join(rootDir, "public", "market-manager.zip");
    const rootZip = path.join(rootDir, "market-manager.zip");

    const zipBuffer = generateProjectZip(rootDir);
    fs.writeFileSync(publicZip, zipBuffer);
    fs.writeFileSync(rootZip, zipBuffer);

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="market-manager-project.zip"',
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to generate project zip:", error);
    return NextResponse.json({ error: "Failed to create project ZIP" }, { status: 500 });
  }
}
