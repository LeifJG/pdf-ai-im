// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { ingestData } from "@/lib/vectorStore";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未找到PDF文件" }, { status: 400 });
    }

    // 验证文件类型
    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "只支持PDF文件" }, { status: 400 });
    }

    // 将File转换为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 提取文本
    const text = await extractTextFromPDF(buffer);

    // 存入向量数据库
    await ingestData(text);

    return NextResponse.json({ 
      success: true, 
      message: "PDF处理完成",
      textLength: text.length 
    });

  } catch (error) {
    console.error("上传处理报错:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}