import React, { useState, useEffect, useRef } from 'react';
import { X, BookOpen, Send, Loader2, Key, Bot, User, Bookmark, Copy, Check, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { hasApiKey, callGemini } from '../services/geminiService';
import {
  loadRulesReference,
  loadKeywordsCompendium,
  loadRulesDiagrams,
  loadFactionArmyRules,
  searchRulesAndKeywords,
  searchStratagems,
  searchRulesDiagrams,
  extractDiagramTags,
  RuleSection,
  KeywordEntry,
  RuleDiagram,
  FactionArmyRule
} from '../services/rulesSearchService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ArmyRoster } from '../types/roster';
import { startVoxTransmission } from '../utils/haptics';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: { title: string; sectionNum?: string }[];
  diagrams?: RuleDiagram[];
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
  const [diagramsData, setDiagramsData] = useState<RuleDiagram[]>([]);
  const [armyRules, setArmyRules] = useState<FactionArmyRule[]>([]);
  const [zoomedDiagram, setZoomedDiagram] = useState<RuleDiagram | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadRulesReference().then(setRulesData);
      loadKeywordsCompendium().then(setKeywordsData);
      loadRulesDiagrams().then(setDiagramsData);
      if (activeRoster?.factionId) {
        loadFactionArmyRules(activeRoster.factionId).then(setArmyRules);
      } else {
        setArmyRules([]);
      }
    }
  }, [isOpen, activeRoster?.factionId]);

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
      // Ensure reference datasets are loaded even if the user submits immediately upon opening
      const [rules, keywords, diagrams, factionArmyRules] = await Promise.all([
        rulesData.length > 0 ? Promise.resolve(rulesData) : loadRulesReference(),
        keywordsData.length > 0 ? Promise.resolve(keywordsData) : loadKeywordsCompendium(),
        diagramsData.length > 0 ? Promise.resolve(diagramsData) : loadRulesDiagrams(),
        activeRoster?.factionId
          ? (armyRules.length > 0 ? Promise.resolve(armyRules) : loadFactionArmyRules(activeRoster.factionId))
          : Promise.resolve([])
      ]);

      // 1. Lexical retrieval of top rules (with chapter + cross-reference expansion), keywords, stratagems, and candidate diagrams
      const searchRes = searchRulesAndKeywords(q, rules, keywords, 6, 4, diagrams);
      const matchedStratagems = searchStratagems(q, activeRoster?.detachments || [], 4);
      const candidateDiagrams = searchRulesDiagrams(
        q,
        searchRes.expandedSections,
        diagrams,
        4
      );

      const citations = [
        ...searchRes.ruleSections.map(r => ({ title: r.section.title, sectionNum: r.section.sectionNum })),
        ...searchRes.keywords.map(k => ({ title: k.keyword.name, sectionNum: k.keyword.ruleRef || 'Ability' })),
        ...matchedStratagems.map(s => ({ title: s.stratagem.name, sectionNum: `${s.stratagem.cp}CP` }))
      ];

      // Build context string from retrieved + expanded chapter/cross-referenced rules
      const ruleSnippets = searchRes.expandedSections.map(sec =>
        `[RULE SECTION ${sec.sectionNum || ''}: ${sec.title}]\n${sec.text}`
      ).join('\n\n---\n\n');

      const keywordSnippets = searchRes.keywords.map(k =>
        `[KEYWORD: ${k.keyword.name} (${k.keyword.category}) Ref: ${k.keyword.ruleRef || 'N/A'}]\nSummary: ${k.keyword.summary}\nDescription: ${k.keyword.description}`
      ).join('\n\n---\n\n');

      const stratagemSnippets = matchedStratagems.map(s =>
        `[STRATAGEM: ${s.stratagem.name} (${s.source}, ${s.stratagem.cp}CP, ${s.stratagem.phase})]\n${s.stratagem.description}`
      ).join('\n\n---\n\n');

      // Active faction, army rules, detachment rules, and relevant roster units
      let rosterContext = '';
      if (activeRoster) {
        const parts: string[] = [
          `ACTIVE ROSTER: ${activeRoster.factionName}${activeRoster.subFactionName ? ` (${activeRoster.subFactionName})` : ''}`
        ];
        if (factionArmyRules.length > 0) {
          parts.push(
            'ARMY RULES:\n' +
              factionArmyRules.map(r => `- ${r.name}: ${r.description}`).join('\n')
          );
        }
        if (activeRoster.detachments.length > 0) {
          const detText = activeRoster.detachments
            .map(d => {
              const rulesList = (d.rules || []).map(r => `  * ${r.name}: ${r.description}`).join('\n');
              return `- ${d.name}${rulesList ? `\n${rulesList}` : ''}`;
            })
            .join('\n');
          parts.push(`ACTIVE DETACHMENTS:\n${detText}`);
        }
        const qLower = q.toLowerCase();
        const mentionedUnits = activeRoster.units.filter(u =>
          u.name.toLowerCase().split(/\s+/).some(w => w.length >= 4 && qLower.includes(w))
        ).slice(0, 3);
        if (mentionedUnits.length > 0) {
          const unitText = mentionedUnits
            .map(u => {
              const abs = (u.datasheet?.abilities || []).map(a => `${a.name}: ${a.description}`).join(' | ');
              const kws = (u.datasheet?.keywords || []).join(', ');
              const enh = u.enhancement ? ` Enhancement: ${u.enhancement.name} (${u.enhancement.description})` : '';
              return `- ${u.name}${kws ? ` (${kws})` : ''}${enh}${abs ? `\n  Abilities: ${abs}` : ''}`;
            })
            .join('\n');
          parts.push(`RELEVANT ROSTER UNITS:\n${unitText}`);
        }
        rosterContext = parts.join('\n\n');
      }

      const diagramOptionsText = candidateDiagrams.length > 0
        ? candidateDiagrams
            .map(
              ({ diagram }) =>
                `- File: "${diagram.file}" | Title: "${diagram.title}" | Section: "${diagram.sectionNum || diagram.sectionTitle}"${diagram.caption ? ` | Caption: ${diagram.caption.slice(0, 350)}` : ''}`
            )
            .join('\n')
        : '(None)';

      const systemInstruction = `You are the official Warhammer 40,000 11th Edition Rules Arbiter.
Your goal is to provide clear, direct, and authoritative answers to rules questions during tabletop play.

RULES FOR YOUR ANSWERS:
1. Always give a direct "Yes" or "No" first when answering a binary question (e.g. "Can I shoot after advancing?").
2. Follow up with the concise rule explanation and any conditions or exceptions (e.g. [ASSAULT] weapons).
3. Always cite the exact official rule numbers when referencing rules (e.g., "Section 03.01 Moving Units", "Section 10.05 Assault Shooting", "Section 19.01 Attached Units").
4. Keep answers crisp and easily readable on a phone at the gaming table (use bullet points for multi-step rules).
5. Ground your answer in the provided 11th Edition reference excerpts below (Core Rules Sections 01–25, Core & Detachment Stratagems, Keywords, and Active Roster rules).
6. DIAGRAMS: Below is a list of AVAILABLE RULES DIAGRAMS with their filenames and captions. If 1 or 2 of these diagrams directly help visualize the rule you are explaining, include them on their own lines at the very end of your response using the exact syntax: [DIAGRAM:ExactFilename.png]. Only include diagrams from the provided list that genuinely clarify this specific question; omit the tag completely if none directly apply.

REFERENCE DATA — CORE RULES:
${ruleSnippets || '(No direct Core Rules section match)'}

${keywordSnippets ? `REFERENCE DATA — KEYWORDS & ABILITIES:\n${keywordSnippets}` : ''}

${stratagemSnippets ? `REFERENCE DATA — STRATAGEMS:\n${stratagemSnippets}` : ''}

${rosterContext}

AVAILABLE RULES DIAGRAMS:
${diagramOptionsText}`;

      const aiAnswer = await callGemini(q, {
        systemInstruction,
        temperature: 0.1
      });

      const { cleanText, selectedDiagrams } = extractDiagramTags(aiAnswer, diagrams);

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: cleanText,
        citations: citations.length > 0 ? citations : undefined,
        diagrams: selectedDiagrams.length > 0 ? selectedDiagrams : undefined,
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

                {/* Relevant Rules Diagrams */}
                {m.diagrams && m.diagrams.length > 0 && (
                  <div className="pt-2 border-t border-slate-750/80 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-amber-400" />
                      Rules Diagrams (tap to zoom):
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {m.diagrams.map((diagram) => (
                        <button
                          key={diagram.file}
                          type="button"
                          onClick={() => setZoomedDiagram(diagram)}
                          className="group text-left rounded-xl overflow-hidden border border-slate-700/80 hover:border-amber-500/60 bg-slate-950/90 transition-all"
                        >
                          <div className="relative bg-black/50">
                            <img
                              src={`${import.meta.env.BASE_URL}data/rules_images/${diagram.file}`}
                              alt={diagram.title}
                              loading="lazy"
                              className="w-full h-auto max-h-56 object-contain mx-auto"
                            />
                            <span className="absolute top-2 right-2 p-1 rounded-lg bg-slate-900/85 border border-slate-700 text-slate-300 group-hover:text-amber-300">
                              <Maximize2 className="w-3 h-3" />
                            </span>
                          </div>
                          <div className="px-2.5 py-2 space-y-0.5">
                            <div className="text-[11px] font-bold text-slate-100 flex items-center justify-between gap-2">
                              <span className="truncate">{diagram.title}</span>
                              {diagram.sectionNum && (
                                <span className="text-[10px] font-mono text-sky-300 shrink-0">
                                  §{diagram.sectionNum}
                                </span>
                              )}
                            </div>
                            {diagram.caption && (
                              <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">
                                {diagram.caption}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
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

      {/* Full-screen Diagram Lightbox */}
      {zoomedDiagram && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setZoomedDiagram(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
              <div className="min-w-0">
                <h3 className="font-warhammer text-sm sm:text-base font-bold text-slate-100 truncate">
                  {zoomedDiagram.title}
                </h3>
                {zoomedDiagram.sectionTitle && (
                  <p className="text-[11px] text-sky-300 font-mono truncate">
                    {zoomedDiagram.sectionTitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomedDiagram(null)}
                className="btn-theme-icon min-w-[34px] min-h-[34px] rounded-xl shrink-0"
                aria-label="Close diagram"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-950/60">
              <img
                src={`${import.meta.env.BASE_URL}data/rules_images/${zoomedDiagram.file}`}
                alt={zoomedDiagram.title}
                className="w-full h-auto rounded-lg border border-slate-800 mx-auto"
              />
              {zoomedDiagram.caption && (
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                  {zoomedDiagram.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
