// use unpdf

import { extractText } from 'unpdf';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // 将 Buffer 转换为 Uint8Array 以满足 unpdf 的类型要求
  const uint8Array = new Uint8Array(buffer);
  const { text } = await extractText(uint8Array);
  
  // text 是 string[] 类型，将其拼接成单个字符串
  const fullText = Array.isArray(text) ? text.join(' ') : text;
  
  let cleanedText = fullText.replace(/\n+/g, ' ');
  cleanedText = cleanedText.replace(/\s+/g, ' ');
  
  return cleanedText.trim();
}