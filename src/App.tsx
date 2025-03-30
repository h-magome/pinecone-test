import React, { useState } from 'react';
import { Save, Search } from 'lucide-react';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

interface ApiResponse {
  message: string;
  timestamp: string;
  content: string;
  action: 'register' | 'search';
}

function App() {
  const [content, setContent] = useState('');
  const [id, setId] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: 'register' | 'search') => {
    setIsLoading(true);

    try {
      if (action === 'register') {
        // OpenAIクライアントの設定
        const openai = new OpenAI({
          apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
          dangerouslyAllowBrowser: true
        });
        // テキストをベクトル化
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: content,
        });
        const embedding = response.data[0].embedding;
        // Pineconeに登録する処理
        const pc = new Pinecone({
          apiKey: import.meta.env.VITE_PINECONE_API_KEY || ''
        });
        const index = pc.index('ses-matching-test');
        
        await index.namespace('ns1').upsert([
          {
            id: `vec-${Date.now()}`, // ユニークなID
            values: embedding,
            metadata: { 
              content: content,
              id: id || '' // idが空の場合は空文字を設定
            }
          }
        ]);

        const mockResponse: ApiResponse = {
          message: "Success",
          timestamp: new Date().toISOString(),
          content: `登録: ${content}${id ? `, ID: ${id}` : ''}`,
          action
        };
        setResponse(mockResponse);
      } else {
        // OpenAIクライアントの設定
        const openai = new OpenAI({
          apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
          dangerouslyAllowBrowser: true
        });
        // 検索クエリをベクトル化
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: content,
        });
        const embedding = embeddingResponse.data[0].embedding;
        
        // Pineconeで検索
        const pc = new Pinecone({
          apiKey: import.meta.env.VITE_PINECONE_API_KEY || ''
        });
        const index = pc.index('ses-matching-test');
        
        const searchResponse = await index.namespace('ns1').query({
          topK: 2,
          vector: embedding,
          includeValues: true,
          includeMetadata: true,
          filter: id ? { id: { $eq: id } } : undefined // idが入力されている場合、フィルターを追加
        });
        
        // valuesフィールドを除外した検索結果を作成
        const cleanedMatches = searchResponse.matches.map(match => {
          const { values, ...rest } = match;
          return rest;
        });

        const apiResponse: ApiResponse = {
          message: "Success",
          timestamp: new Date().toISOString(),
          content: `検索結果: ${JSON.stringify(cleanedMatches)}`,
          action
        };
        
        setResponse(apiResponse);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">PineconeTEST</h1>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
                エンジニアIDまたはプロジェクトID
              </label>
              <input
                id="id"
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="IDを入力してください"
              />
            </div>
            
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                内容
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                rows={4}
                placeholder="メッセージを入力してください"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleAction('register')}
                disabled={isLoading || !content}
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span>処理中...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    <span>登録</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleAction('search')}
                disabled={isLoading || !content}
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span>処理中...</span>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    <span>検索</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {response && (
            <div className="mt-8 p-4 bg-gray-50 rounded-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">レスポンス:</h2>
              <pre className="whitespace-pre-wrap break-words text-sm text-gray-700">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;