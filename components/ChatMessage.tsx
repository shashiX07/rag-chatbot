'use client';

import { Message } from '@/types';
import { useEffect, useRef } from 'react';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const isUser = message.role === 'user';

  return (
    <div
      ref={messageRef}
      className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
        }`}
      >
        {message.file && (
          <div className={`mb-3 pb-3 border-b ${
            isUser ? 'border-blue-400' : 'border-gray-300 dark:border-gray-600'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex-shrink-0">
                {message.file.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                )}
                {message.file.status === 'success' && (
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {message.file.status === 'error' && (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{message.file.name}</div>
                <div className={`text-xs ${isUser ? 'opacity-75' : 'opacity-60'}`}>
                  {(message.file.size / 1024).toFixed(1)} KB • {message.file.type.split('/')[1].toUpperCase()}
                  {message.file.status === 'uploading' && ' • Uploading...'}
                  {message.file.status === 'success' && ' • Uploaded'}
                  {message.file.status === 'error' && ' • Failed'}
                </div>
                {message.file.message && (
                  <div className={`text-xs mt-1 ${
                    message.file.status === 'error' ? 'text-red-300' : 'opacity-75'
                  }`}>
                    {message.file.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
            <div className="text-xs opacity-75 mb-2">Sources:</div>
            {message.sources.map((source, idx) => (
              <div key={source.id} className="text-xs opacity-75 mb-1">
                {idx + 1}. {source.metadata.filename} (similarity: {
                  ((source.similarity || 0) * 100).toFixed(1)
                }%)
              </div>
            ))}
          </div>
        )}
        <div className="text-xs opacity-60 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
