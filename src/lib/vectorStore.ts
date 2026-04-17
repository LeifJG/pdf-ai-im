// src/lib/vectorStore.ts
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// --- 配置区域 ---

// 初始化 Embeddings 实例
// 我们使用 text-embedding-3-small 模型，它便宜且速度快
const embeddings = new OpenAIEmbeddings({
  modelName: "nvidia/nemotron-3-super-120b-a12b:free", // 使用通义千问的免费模型
  configuration: {
    baseURL: process.env.OPENROUTER_BASE_URL, // 指向 OpenRouter
  },
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ChromaDB 的地址，对应我们 Docker 启动的端口
const chromaUrl = "http://localhost:8000";
const collectionName = "pdf-chat";

/**
 * 函数：存入数据
 * 作用：接收一大段文本 -> 切碎 -> 变成向量 -> 存入 ChromaDB
 */
export async function ingestData(text: string) {
  // 初始化文本分割器
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,      // 每块最多 1000 个字符
    chunkOverlap: 200,    // 每块之间重叠 200 个字符（为了保持上下文连贯，防止切断句子）
  });

  // 执行切分，把文本变成文档对象数组
  const docs = await splitter.createDocuments([text]);

  // 将切分好的文档存入 ChromaDB
  // fromDocuments 会自动调用 embeddings 把文字变成向量并存库
  await Chroma.fromDocuments(docs, embeddings, {
    collectionName: collectionName,
    url: chromaUrl,
  });

  console.log("✅ 数据已成功存入向量数据库");
}

/**
 * 函数：查询数据
 * 作用：接收用户的问题 -> 去数据库找最相关的片段
 */
export async function queryVectorStore(query: string) {
  // 连接到现有的集合（如果集合不存在会报错，所以必须先运行 ingestData）
  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: collectionName,
    url: chromaUrl,
  });

  // 执行相似度搜索
  // 这里的 '3' 表示返回最相关的 3 个文本片段
  const results = await vectorStore.similaritySearch(query, 3);

  // 把搜索结果提取出来，拼接成字符串，方便后续喂给 AI
  return results.map((doc) => doc.pageContent).join("\n\n");
}