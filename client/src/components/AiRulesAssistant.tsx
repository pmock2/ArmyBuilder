import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, BookOpen, Send, Loader2, Key, Bot, User, ChevronRight, Bookmark, Copy, Check } from 'lucide-react';
import { hasApiKey, callGemini } from '../services/geminiService';
import { loadRulesReference, loadKeywordsCompendium, searchRulesAndKeywords, RuleSection, KeywordEntry } from '../services/rulesSearchService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ArmyRoster } from '../types/roster';
import { startVoxTransmission } from '../utils/haptics';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: { title: string; sectionNum?: string }[];
  timestamp: string;
}

interface AiRulesAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  activeRoster?: ArmyRoster | null;
}

export const AiRulesAssistant: React.FC<AiRulesAssistantProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  activeRoster
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Greetings, Commander.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [rulesData, setRulesData] = useState<RuleSection[]>([]);
  const [keywordsData, setKeywordsData] = useState<KeywordEntry[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadRulesReference().then(setRulesData);
      loadKeywordsCompendium().then(setKeywordsData);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAsking]);

  if (!isOpen) return null;

  const keyConfigured = hasApiKey();

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isAsking) return;

    if (!keyConfigured) {
      onOpenSettings();
      return;
    }

    const userMsgId = `msg-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsAsking(true);
    const stopVox = startVoxTransmission();

    try {
      // 1. Lexical retrieval of top rules & keywords
      const searchRes = searchRulesAndKeywords(q, rulesData, keywordsData, 4, 3);

      const citations = [
        ...searchRes.ruleSections.map(r => ({ title: r.section.title, sectionNum: r.section.sectionNum })),
        ...searchRes.keywords.map(k => ({ title: k.keyword.name, sectionNum: k.keyword.ruleRef || 'Ability' }))
      ];

      // Build context string from retrieved rules
      const ruleSnippets = searchRes.ruleSections.map(r =>
        `[RULE SECTION ${r.section.sectionNum || ''}: ${r.section.title}]\n${r.section.text}`
      ).join('\n\n---\n\n');

      const keywordSnippets = searchRes.keywords.map(k =>
        `[KEYWORD: ${k.keyword.name} (${k.keyword.category}) Ref: ${k.keyword.ruleRef || 'N/A'}]\nSummary: ${k.keyword.summary}\nDescription: ${k.keyword.description}`
      ).join('\n\n---\n\n');

      // Faction context if active
      let rosterContext = '';
      if (activeRoster) {
        rosterContext = `ACTIVE ROSTER CONTEXT: Faction: ${activeRoster.factionName}, Detachments: ${activeRoster.detachments.map(d => d.name).join(', ')}`;
      }

      const systemInstruction = `You are the official Warhammer 40,000 11th Edition Rules Arbiter.
Your goal is to provide clear, direct, and authoritative answers to rules questions during tabletop play.

RULES FOR YOUR ANSWERS:
1. Always give a direct "Yes" or "No" first when answering a binary question (e.g. "Can I shoot after advancing?").
2. Follow up with the concise rule explanation and any conditions or exceptions (e.g. [ASSAULT] weapons).
3. Always cite the exact official rule numbers when referencing rules (e.g., "Section 03.01 Moving Units", "Section 10.05 Assault Shooting", "Section 19.01 Attached Units").
4. Keep answers crisp and easily readable on a phone at the gaming table (use bullet points for multi-step rules).
5. Ground your answer in the provided 11th Edition reference excerpts below.

REFERENCE DATA:
${ruleSnippets}

${keywordSnippets}

${rosterContext}`;

      const aiAnswer = await callGemini(q, {
        systemInstruction,
        temperature: 0.1
      });

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: aiAnswer,
        citations: citations.length > 0 ? citations : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: `Error resolving rule: ${err.message || 'Could not connect to Gemini API.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      stopVox();
      setIsAsking(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickQuestions = [
    "Can I shoot after Advancing?",
    "Can a Leader and Support attach to the same unit?",
    "How does [BLAST] work against multiple models?",
    "Can I shoot Pistol / Close-quarters weapons in melee?",
    "How does Benefit of Cover work?",
    "When does Battle-shock happen and what does it do?"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-l border-slate-700 w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-sky-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-warhammer text-base font-bold text-slate-100 tracking-wide">
                  Rules Arbiter AI
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-600/40 text-sky-300 font-mono font-bold">
                  11E
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Instant search & answers from the official 11th Edition Core Rules
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="btn-theme-icon min-w-[34px] min-h-[34px] rounded-xl"
              aria-label="Close rules assistant"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Missing API Key Gate */}
        {!keyConfigured ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="font-warhammer text-base font-bold text-slate-100">
                Gemini API Key Required
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                To consult the Rules Arbiter AI during tabletop play, please link your Gemini API key. Your key is stored safely in your browser.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-theme-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="btn-theme-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure API Key</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm space-y-2 ${m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-850 border border-slate-750 text-slate-200 rounded-bl-none'
                  }`}
              >
                {m.sender === 'assistant' ? (
                  <MarkdownRenderer content={m.text} />
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {m.text}
                  </div>
                )}

                {/* Citations Footer */}
                {m.citations && m.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-750/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-sky-400" />
                      Referenced Rules:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {m.citations.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-sky-300 font-mono font-medium"
                        >
                          <span>{c.sectionNum || '★'}</span>
                          <span>•</span>
                          <span className="truncate max-w-[140px]">{c.title}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>{m.timestamp}</span>
                  {m.sender === 'assistant' && m.id !== 'welcome' && (
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="hover:text-slate-200 flex items-center gap-1 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-blue-700 border border-blue-500/40 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isAsking && (
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-850 border border-slate-750 rounded-2xl rounded-bl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                <span>Searching 11th Edition rules & synthesizing answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions Pills */}
        <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isAsking}
                className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-colors flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/95 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask any rules question (e.g. Can I charge after Advancing?)..."
              disabled={isAsking}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={isAsking || !inputQuery.trim()}
              className="btn-theme-primary min-h-[38px] px-4 rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 disabled:opacity-40"
              aria-label="Send rules question"
            >
              {isAsking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 stroke-[2]" />
              )}
            </button>
          </form>
        </div>
      </>
    )}
      </div>
    </div>
  );
};
