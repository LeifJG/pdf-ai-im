// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { queryVectorStore } from "@/lib/vectorStore";

// 1. 初始化 OpenAI 客户端 (指向 OpenRouter)
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

// 2. 处理 POST 请求的函数
export async function POST(req: NextRequest) {
  try {
    // --- 第一步：从请求中获取用户消息 (message 的来源) ---
    
    // req 是一个 NextRequest 对象，它包含了前端发来的所有信息。
    // req.json() 会读取请求体，并把它解析成一个 JavaScript 对象。
    const body = await req.json();
    
    // 我们从 body 对象中解构出前端传过来的 'message' 字段。
    // 这就是用户在前端输入框里写的问题。
    const { message } = body;

    // 做一个简单的校验，如果 message 为空，就返回一个错误信息。
    if (!message) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    // --- 第二步：从向量数据库查找相关内容 ---
    const context = await queryVectorStore(message);

    // --- 第三步：构建 System Prompt (systemPrompt 的来源) ---
    
    // systemPrompt 是一个字符串模板。我们在这里定义 AI 的行为准则。
    // 我们把从数据库查到的相关内容 (context) 拼接进去，作为 AI 回答问题的依据。
    const systemPrompt = `
      你是一个专业的 PDF 助手。请根据下面的【参考资料】回答用户的问题。
      如果【参考资料】里没有答案，请直接说“资料中未提及”，不要编造。
      【参考资料】：
      ${context}
    `;

    // --- 第四步：调用大模型 API ---
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      // 我们将 systemPrompt 和用户的 message 一起发送给模型。
      messages: [
        { role: "system", content: systemPrompt }, // 这是给 AI 的指令
        { role: "user", content: message },        // 这是用户的问题
      ],
    });

    // 从模型的返回结果中，提取出 AI 生成的回答内容。
    const answer = completion.choices[0].message.content;

    // --- 第五步：将 AI 的回答返回给前端 ---
    return NextResponse.json({ answer });

  } catch (error) {
    console.error("API 报错:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}