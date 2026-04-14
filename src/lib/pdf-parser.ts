import pdf from 'pdf-parse';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const text = await pdf(buffer);
  
  let cleanedText = text.text.replace(/\n+/g, ' ');
  cleanedText = cleanedText.replace(/\s+/g, ' ');
  
  return cleanedText.trim();
}