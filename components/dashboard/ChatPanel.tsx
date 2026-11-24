'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatSourceCitation } from '@/lib/agent/CivicAgent';
import {
  Sparkles,
  Send,
  Database,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  Bot,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sqlQuery?: string;
  resultCount?: number;
  sources?: ChatSourceCitation[];
  timestamp: string;
  isOffTopic?: boolean;
}

interface ChatPanelProps {
  wardId: string | null;
  wardName: string;
  onSelectComplaint: (complaintId: string) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const QUICK_PROMPTS = [
  'How many critical road complaints are open?',
  'Show me complaints older than 14 days.',
  'Show me all open sewage complaints over 14 days old.',
  'What is the weather like?',
];

export default function ChatPanel({
  wardId,
  wardName,
  onSelectComplaint,
  messages,
  setMessages,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSqlIds, setExpandedSqlIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const toggleSqlExpand = (messageId: string) => {
    setExpandedSqlIds((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText ?? inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend, wardId: wardId || null }),
      });

      const data = await res.json();
      const assistantMessageId = `asst-${Date.now()}`;

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          sender: 'assistant',
          text: data.answer,
          sqlQuery: data.dataQuery || undefined,
          resultCount: data.resultCount,
          sources: data.sources || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOffTopic: Boolean(data.isOffTopic),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: assistantMessageId,
          sender: 'assistant',
          text:
            data.error ||
            "I couldn't process your request. Try asking about complaints by category, status, or date.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err: unknown) {
      const e = err as Error;
      const errorMessageId = `err-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: errorMessageId,
          sender: 'assistant',
          text: `Network error: ${e.message}. Please check your connection.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearSession = () => {
    setMessages([]);
    setExpandedSqlIds({});
  };

  const renderMessageTextWithCitations = (text: string, sources?: ChatSourceCitation[]) => {
    if (!sources || sources.length === 0) {
      return <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{text}</p>;
    }

    const citationRegex = /\[#([a-zA-Z0-9_-]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(text)) !== null) {
      const precedingText = text.substring(lastIndex, match.index);
      if (precedingText) {
        parts.push(precedingText);
      }

      const citedId = match[1];
      const matchedSource = sources.find(
        (s) => s.complaintId.startsWith(citedId) || s.complaintId.includes(citedId)
      );
      const targetId = matchedSource ? matchedSource.complaintId : citedId;

      parts.push(
        <button
          key={`cite-${match.index}-${citedId}`}
          type="button"
          onClick={() => onSelectComplaint(targetId)}
          className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.2 rounded bg-blue-600/10 text-blue-700 dark:text-blue-400 font-mono font-bold text-[11px] hover:underline cursor-pointer border border-blue-500/20 align-baseline"
          title={`Click to inspect complaint #${targetId}`}
        >
          <span>#{citedId.slice(0, 8)}</span>
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
        {parts}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface overflow-hidden">
      {/* Top Header / Context Banner */}
      <div className="px-3.5 py-2.5 border-b border-border bg-surface-card flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-xs leading-tight">Municipal Copilot</h3>
            <span className="text-[10px] text-muted-foreground font-mono">
              All User Complaints Intake
            </span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearSession}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-border transition-colors cursor-pointer"
            title="Reset session chat history"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-4">
            <div className="w-10 h-10 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
              <Bot className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground mb-1">
              Ask natural queries about {wardName}
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs mb-4 leading-relaxed">
              Query complaints by category, status, severity, or date. Every answer is derived
              directly from structured database queries with verifiable SQL.
            </p>

            <div className="w-full flex flex-col gap-1.5 text-left">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                Suggested questions:
              </span>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left px-3 py-2 rounded-md border border-border bg-surface-card hover:border-blue-500/50 hover:bg-blue-500/5 text-xs text-foreground transition-all cursor-pointer flex items-center justify-between group"
                >
                  <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    &ldquo;{prompt}&rdquo;
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-1">
              {msg.sender === 'user' ? (
                /* User Bubble */
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg rounded-tr-xs bg-blue-600 text-white px-3.5 py-2 text-xs font-medium shadow-2xs">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="block text-[9px] text-blue-200 mt-1 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ) : (
                /* Assistant Bubble */
                <div className="flex flex-col gap-2 max-w-[95%]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    <div className="w-4 h-4 rounded-full bg-white border border-border overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                      <img src="/images/logo.png" alt="NigamSetu Logo" className="w-full h-full object-contain" />
                    </div>
                    <span>NigamSetu Copilot</span>
                    <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                      {msg.timestamp}
                    </span>
                  </div>

                  <div className="rounded-lg rounded-tl-xs bg-surface-card border border-border p-3.5 shadow-2xs flex flex-col gap-2.5">
                    {/* Natural language formatted answer */}
                    {renderMessageTextWithCitations(msg.text, msg.sources)}

                    {/* Collapsible Transparent SQL Query */}
                    {msg.sqlQuery && (
                      <div className="mt-1 rounded-md border border-border bg-surface overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSqlExpand(msg.id)}
                          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>
                              SQL Query {expandedSqlIds[msg.id] ? '(Hide SQL)' : '(View SQL)'}
                            </span>
                          </span>
                          {expandedSqlIds[msg.id] ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedSqlIds[msg.id] && (
                          <div className="p-3 border-t border-border bg-muted/10 text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                            <code>{msg.sqlQuery}</code>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Source Citations Pill Grid */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-1 pt-2 border-t border-border flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 text-blue-500" />
                          <span>Sources ({msg.sources.length} complaints cited):</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.slice(0, 10).map((s) => (
                            <button
                              key={s.complaintId}
                              type="button"
                              onClick={() => onSelectComplaint(s.complaintId)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-surface hover:border-blue-500/50 hover:bg-blue-500/5 text-xs text-foreground transition-all cursor-pointer group"
                              title={`Inspect ticket #${s.complaintId.slice(0, 8)}: ${s.addressText || ''}`}
                            >
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline text-[11px]">
                                #{s.complaintId.slice(0, 8)}
                              </span>
                              {s.category && (
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  ({s.category})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <div className="p-3 border-t border-border bg-surface-card">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask about complaints (e.g. how many critical potholes)..."
            className="flex-1 px-3 py-2 text-xs rounded-md border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#071D49] dark:focus:ring-[#1d70b8] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="px-3.5 py-2 rounded-md bg-[#071D49] hover:bg-[#093692] dark:bg-[#1d70b8] dark:hover:bg-[#1557a0] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
