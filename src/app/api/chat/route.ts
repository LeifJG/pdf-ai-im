import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { extractTextFromPDF } from '@/lib/pdf-parser';
import { ingestData, queryVectorStore } from '@/lib/vector-store';

export async function POST(req: Request) {
  const formData = await req.formData();
  const messages = JSON.parse(formData.get('messages') as string);
  const pdfFile = formData.get('pdf') as File | null;
  const lastMessage = messages[messages.length - 1].content;

  if (pdfFile) {
    const text = await extractTextFromPDF(pdfFile);
    await ingestData(text);
  }

  const relevantContext = await queryVectorStore(lastMessage);
  const contextText = relevantContext.join('\n\n---\n\n');

  const result = streamText({
    model: openai('gpt-4o'),
    system: `你是一个PDF问答助手，请根据下面提供的PDF上下文内容回答用户的问题。如果上下文中没有相关信息，请直接告诉用户无法从PDF中找到答案。
    上下文内容:
    ${contextText}`,
    messages,
  });

  return result.toDataStreamResponse();
}