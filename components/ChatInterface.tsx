'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types';
import ChatMessage from './ChatMessage';
import { nanoid } from 'nanoid';
import chatBotImage from '../public/chatbot.png';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Voice Modal States
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for Voice logic to prevent stale closures
  const recognitionRef = useRef<any>(null);
  const voiceStateRef = useRef<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const voiceTranscriptRef = useRef('');
  const showVoiceModalRef = useRef(false);
  
  // Ref to keep latest messages for voice submit
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Update voice state and its ref simultaneously
  const updateVoiceState = (state: 'idle' | 'listening' | 'processing' | 'speaking') => {
    setVoiceState(state);
    voiceStateRef.current = state;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Stop automatically when user pauses
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          voiceTranscriptRef.current = currentTranscript;
          setVoiceTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (showVoiceModalRef.current && voiceStateRef.current === 'listening') {
            updateVoiceState('idle');
          }
        };
        
        recognitionRef.current.onend = () => {
          // If we were listening and now it ended, time to process what was said
          if (showVoiceModalRef.current && voiceStateRef.current === 'listening') {
            const finalTranscript = voiceTranscriptRef.current.trim();
            if (finalTranscript) {
              handleVoiceSubmit(finalTranscript);
            } else {
              // Start listening again if they didn't say anything
              startListening();
            }
          }
        };
      }
    }
  }, []);

  const openVoiceModal = () => {
    setShowVoiceModal(true);
    showVoiceModalRef.current = true;
    startListening();
  };

  const closeVoiceModal = () => {
    setShowVoiceModal(false);
    showVoiceModalRef.current = false;
    updateVoiceState('idle');
    recognitionRef.current?.stop();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const startListening = () => {
    setVoiceTranscript('');
    voiceTranscriptRef.current = '';
    setAssistantTranscript('');
    updateVoiceState('listening');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Ignore if already started
      }
    } else {
      alert("Speech recognition is not supported in your browser.");
      closeVoiceModal();
    }
  };

  const speakAssistantText = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      // Remove basic markdown tokens for cleaner speech
      const cleanText = text.replace(/[*#`_]/g, '');
      setAssistantTranscript(cleanText);
      updateVoiceState('speaking');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      utterance.onend = () => {
        if (showVoiceModalRef.current) {
          // Start listening again for the next user input
          startListening();
        }
      };
      
      utterance.onerror = () => {
        if (showVoiceModalRef.current) {
          updateVoiceState('idle');
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceSubmit = async (text: string) => {
    updateVoiceState('processing');
    
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    // Use messagesRef to avoid stale closure
    const currentMessages = [...messagesRef.current, userMessage];
    setMessages(currentMessages);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.content = assistantContent;
            }
            return updated;
          });
        }
        
        // Only speak if we are still in the voice modal
        if (showVoiceModalRef.current) {
          speakAssistantText(assistantContent);
        }
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      const errorText = 'Sorry, I encountered an error. Please try again.';
      const errorMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: errorText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      if (showVoiceModalRef.current) {
        speakAssistantText(errorText);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async (file: File, messageId: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId && msg.file
            ? {
                ...msg,
                file: {
                  ...msg.file,
                  status: data.success ? 'success' : 'error',
                  message: data.message,
                },
              }
            : msg
        )
      );

      return data.success;
    } catch (error) {
      console.error('Upload error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId && msg.file
            ? {
                ...msg,
                file: {
                  ...msg.file,
                  status: 'error',
                  message: 'Failed to upload file',
                },
              }
            : msg
        )
      );
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: input.trim() || `Uploaded ${selectedFile?.name}`,
      timestamp: new Date(),
      file: selectedFile
        ? {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
            status: 'uploading',
          }
        : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageId = userMessage.id;
    const fileToUpload = selectedFile;
    
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (fileToUpload) {
      await handleFileUpload(fileToUpload, messageId);
    }
    
    if (input.trim()) {
      setIsLoading(true);
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        const assistantMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            assistantContent += chunk;

            setMessages((prev) => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.content = assistantContent;
              }
              return updated;
            });
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const clearDatabase = async () => {
    if (!confirm('⚠️ This will delete ALL documents from the database. Are you sure?')) {
      return;
    }

    try {
      const response = await fetch('/api/clear', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Database cleared successfully!');
        clearChat();
      } else {
        alert('❌ Failed to clear database: ' + data.message);
      }
    } catch (error) {
      console.error('Error clearing database:', error);
      alert('❌ An error occurred while clearing the database');
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header with Clear Database Button */}
      {messages.length > 0 && (
        <div className="flex justify-end gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={clearChat}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            Clear Chat
          </button>
          <button
            onClick={clearDatabase}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all border border-red-300 dark:border-red-700"
          >
            Clear Memory
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <img src={chatBotImage.src} alt="Chatbot" className="mx-auto mb-4 w-32 h-32" />
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                Welcome to RAGBot
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Upload documents and ask questions about them
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Powered by Gemini AI & Supabase
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-3 rounded-bl-none">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
            >
              Clear chat
            </button>
          )}
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{selectedFile.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.csv,.docx,image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="chat-file-input"
            />
            <label
              htmlFor="chat-file-input"
              className="flex items-center justify-center px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              title="Attach file"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </label>
            
            {/* Voice Mode Button */}
            <button
              type="button"
              onClick={openVoiceModal}
              className="p-3 rounded-lg border transition bg-white border-gray-300 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Open Voice Agent"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or upload a file..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedFile)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Full Screen Voice Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <button 
            onClick={closeVoiceModal}
            className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-6">
            
            {/* Circular Voice Visualizer */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-16">
              
              {/* Idle State Background */}
              {voiceState === 'idle' && (
                <div className="absolute inset-0 bg-gray-500 rounded-full opacity-20"></div>
              )}

              {/* Listening Waves (User Speaking) */}
              {voiceState === 'listening' && (
                <>
                  <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute -inset-4 bg-blue-500 rounded-full animate-ping opacity-20" style={{ animationDuration: '2.5s', animationDelay: '0.2s' }}></div>
                  <div className="absolute -inset-8 bg-blue-500 rounded-full animate-ping opacity-10" style={{ animationDuration: '3s', animationDelay: '0.4s' }}></div>
                </>
              )}
              
              {/* Processing Spinner */}
              {voiceState === 'processing' && (
                <>
                  <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
                </>
              )}

              {/* Speaking Waves (AI Speaking) */}
              {voiceState === 'speaking' && (
                <>
                  <div className="absolute inset-0 bg-purple-500 rounded-full animate-pulse opacity-40"></div>
                  <div className="absolute -inset-8 bg-purple-500 rounded-full animate-ping opacity-30" style={{ animationDuration: '1.5s' }}></div>
                  <div className="absolute -inset-16 bg-purple-500 rounded-full animate-ping opacity-15" style={{ animationDuration: '2s', animationDelay: '0.3s' }}></div>
                </>
              )}
              
              {/* Core Orb */}
              <button 
                onClick={() => {
                  if (voiceState === 'idle') startListening();
                  else if (voiceState === 'listening') {
                    // Manual stop if needed
                    recognitionRef.current?.stop();
                  }
                }}
                className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
                  voiceState === 'speaking' ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-[0_0_80px_rgba(168,85,247,0.6)]' : 
                  voiceState === 'listening' ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-[0_0_80px_rgba(59,130,246,0.6)]' :
                  voiceState === 'processing' ? 'bg-gradient-to-tr from-gray-600 to-gray-500 shadow-[0_0_40px_rgba(156,163,175,0.4)]' :
                  'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {voiceState === 'speaking' ? (
                  <svg className="w-16 h-16 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Transcripts Display */}
            <div className="w-full text-center min-h-[120px] flex flex-col items-center justify-start">
              {voiceState === 'idle' && (
                <p className="text-2xl text-white/50 font-medium">Tap the microphone to speak</p>
              )}
              
              {voiceState === 'listening' && (
                <p className="text-3xl text-white font-medium leading-relaxed">
                  {voiceTranscript || <span className="text-white/50">Listening...</span>}
                </p>
              )}
              
              {voiceState === 'processing' && (
                <p className="text-2xl text-blue-400 font-medium animate-pulse">Thinking...</p>
              )}
              
              {voiceState === 'speaking' && (
                <div className="w-full max-h-[30vh] overflow-y-auto custom-scrollbar px-4 pb-4">
                  <p className="text-3xl text-purple-100 font-medium leading-relaxed">
                    {assistantTranscript}
                  </p>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
