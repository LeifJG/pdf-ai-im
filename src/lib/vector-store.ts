import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma, ChromaLibArgs } from '@langchain/community/vectorstores/chroma';
import { ChromaClient } from 'chromadb';

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',
});

const chromaClient = new ChromaClient({
  path: 'http://localhost:8000',
});

const collectionName = 'pdf-chat';

let vectorStore: Chroma;

async function getVectorStore(): Promise<Chroma> {
  if (!vectorStore) {
    const config = {
      collectionName,
      client: chromaClient,
    } as ChromaLibArgs;
    vectorStore = await Chroma.fromExistingCollection(embeddings, config);
  }
  return vectorStore;
}

export async function ingestData(text: string): Promise<void> {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const documents = await textSplitter.createDocuments([text]);
  
  const store = await getVectorStore();
  await store.addDocuments(documents);
}

export async function queryVectorStore(query: string): Promise<string[]> {
  const vectorStore = await getVectorStore();
  const results = await vectorStore.similaritySearch(query, 3);

  return results.map(doc => doc.pageContent);
}