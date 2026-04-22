'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  // 完全手动管理状态，不依赖 @ai-sdk/react
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 当文件变化时，创建URL用于预览并自动上传
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPdfUrl(url);
      // 自动上传PDF
      uploadPDF(selectedFile);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
      setUploadStatus('');
    }
  }, [selectedFile]);

  // 上传PDF到服务器
  const uploadPDF = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('正在处理PDF...');
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setUploadStatus(`✅ PDF处理完成，共提取 ${data.textLength} 字符`);
      } else {
        setUploadStatus(`❌ 处理失败: ${data.error}`);
      }
    } catch (error) {
      console.error('上传错误:', error);
      setUploadStatus('❌ 上传出错');
    } finally {
      setIsUploading(false);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // 自定义表单提交
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
    };
    
    // 添加用户消息
    setMessages(prev => [...prev, userMessage]);
    
    // 清空输入框
    setInput('');
    setIsLoading(true);
    
    try {
      // 调用后端API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }
      
      // 添加AI回复
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.answer,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('发送消息错误:', error);
      // 添加错误消息
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `❌ 发送失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧：PDF预览区域 */}
      <div className="w-1/2 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            上传 PDF 文件
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-green-600">已选择: {selectedFile.name}</p>
          )}
          {uploadStatus && (
            <p className={`mt-2 text-sm ${uploadStatus.includes('✅') ? 'text-green-600' : uploadStatus.includes('❌') ? 'text-red-600' : 'text-blue-600'}`}>
              {uploadStatus}
            </p>
          )}
        </div>
        <div className="flex-1 p-4">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg shadow-sm border border-gray-200"
              title="PDF预览"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <p>请上传PDF文件进行预览</p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：聊天区域 */}
      <div className="w-1/2 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">PDF 智能问答</h1>
          <p className="text-sm text-gray-500">基于上传的PDF文档进行对话交流</p>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>开始询问关于PDF的问题吧</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-4 rounded-lg max-w-[85%] ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框和发送按钮 */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={onSubmit} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的问题..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input?.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '思考中...' : '发送'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
