import React, { useState, useEffect } from 'react';
import { X, MessageSquarePlus, ExternalLink, Copy, Check, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { ArmyRoster } from '../types/roster';

type FeedbackCategory = 'bug' | 'enhancement' | 'question';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoster?: ArmyRoster | null;
}

const GITHUB_REPO_URL = 'https://github.com/pmock2/ArmyBuilder';

const CATEGORY_OPTIONS: {
  id: FeedbackCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'bug',
    label: 'Bug / Data Issue',
    description: 'Broken UI, wrong points, missing unit/rule',
    icon: <Bug className="w-4 h-4 text-red-400" />
  },
  {
    id: 'enhancement',
    label: 'Feature Request',
    description: 'New capability or UX improvement',
    icon: <Lightbulb className="w-4 h-4 text-amber-400" />
  },
  {
    id: 'question',
    label: 'Question / Other',
    description: 'General feedback or question',
    icon: <HelpCircle className="w-4 h-4 text-sky-400" />
  }
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  activeRoster
}) => {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [factionOrUnit, setFactionOrUnit] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      if (activeRoster && !factionOrUnit) {
        const fac = activeRoster.subFactionName
          ? `${activeRoster.factionName} (${activeRoster.subFactionName})`
          : activeRoster.factionName;
        setFactionOrUnit(fac);
      }
    }
  }, [isOpen, activeRoster]);

  if (!isOpen) return null;

  const buildIssueBody = (): string => {
    const sections: string[] = [];

    sections.push(`### Description\n${description.trim()}`);

    if (factionOrUnit.trim()) {
      sections.push(`### Affected Faction / Unit\n${factionOrUnit.trim()}`);
    }

    if (category === 'bug') {
      if (stepsToReproduce.trim()) {
        sections.push(`### Steps to Reproduce\n${stepsToReproduce.trim()}`);
      }
      if (expectedBehavior.trim()) {
        sections.push(`### Expected Behavior\n${expectedBehavior.trim()}`);
      }
    }

    if (includeContext && typeof window !== 'undefined') {
      const contextLines = [
        `- **URL**: ${window.location.origin}${window.location.pathname}`,
        `- **Viewport**: ${window.innerWidth}x${window.innerHeight}`,
        `- **User Agent**: ${navigator.userAgent}`
      ];
      if (activeRoster) {
        contextLines.push(
          `- **Active Roster**: ${activeRoster.factionName}${activeRoster.subFactionName ? ` (${activeRoster.subFactionName})` : ''} • ${activeRoster.battleSize} • ${activeRoster.units.length} units`
        );
      }
      sections.push(`### Environment\n${contextLines.join('\n')}`);
    }

    return sections.join('\n\n');
  };

  const canSubmit = Boolean(title.trim() && description.trim());

  const handleOpenGithubIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const params = new URLSearchParams({
      title: title.trim(),
      body: buildIssueBody(),
      labels: category
    });

    const url = `${GITHUB_REPO_URL}/issues/new?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopyMarkdown = async () => {
    if (!canSubmit) return;
    const text = `# ${title.trim()}\n\n${buildIssueBody()}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-theme-border-subtle bg-theme-card">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-theme-accent/20 border border-theme-accent/40 flex items-center justify-center text-theme-accent-soft">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text">
                Send Feedback
              </h2>
              <p className="text-xs text-theme-text-muted">
                Opens a pre-filled GitHub issue on pmock2/ArmyBuilder
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-theme-icon min-w-[36px] min-h-[36px] rounded-xl"
            aria-label="Close feedback"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleOpenGithubIssue} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Category */}
          <div>
            <label className="block text-theme-text-secondary font-semibold mb-2 uppercase tracking-wider text-xs">
              Issue Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const isSelected = category === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-theme-accent/20 border-theme-accent text-theme-text shadow-sm'
                        : 'bg-theme-card border-theme-border-subtle text-theme-text-secondary hover:border-theme-accent/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-theme-text-muted mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="feedback-title" className="block text-theme-text-secondary font-semibold mb-1.5 uppercase tracking-wider text-xs">
              Issue Title <span className="text-red-400">*</span>
            </label>
            <input
              id="feedback-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === 'bug'
                  ? 'e.g. Unit cost not updating for...'
                  : 'e.g. Add support for...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent text-sm"
            />
          </div>

          {/* Affected Faction / Unit */}
          <div>
            <label htmlFor="feedback-faction" className="block text-theme-text-secondary font-semibold mb-1.5 uppercase tracking-wider text-xs">
              Faction / Unit (Optional)
            </label>
            <input
              id="feedback-faction"
              type="text"
              value={factionOrUnit}
              onChange={(e) => setFactionOrUnit(e.target.value)}
              placeholder="e.g. Space Marines — Captain with Jump Pack"
              className="w-full px-3.5 py-2 rounded-xl bg-theme-bg border border-theme-border text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent text-xs sm:text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="feedback-description" className="block text-theme-text-secondary font-semibold mb-1.5 uppercase tracking-wider text-xs">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="feedback-description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened or what you'd like to see..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent text-xs sm:text-sm resize-y"
            />
          </div>

          {/* Bug-specific fields */}
          {category === 'bug' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="feedback-steps" className="block text-theme-text-secondary font-semibold mb-1.5 uppercase tracking-wider text-xs">
                  Steps to Reproduce
                </label>
                <textarea
                  id="feedback-steps"
                  rows={2}
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  placeholder="1. Create list...&#10;2. Add unit..."
                  className="w-full px-3 py-2 rounded-xl bg-theme-bg border border-theme-border text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent text-xs resize-y"
                />
              </div>

              <div>
                <label htmlFor="feedback-expected" className="block text-theme-text-secondary font-semibold mb-1.5 uppercase tracking-wider text-xs">
                  Expected Behavior
                </label>
                <textarea
                  id="feedback-expected"
                  rows={2}
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  placeholder="What should happen instead?"
                  className="w-full px-3 py-2 rounded-xl bg-theme-bg border border-theme-border text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent text-xs resize-y"
                />
              </div>
            </div>
          )}

          {/* Include environment context */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-theme-text-secondary pt-1">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="w-4 h-4 rounded border-theme-border bg-theme-bg accent-sky-500"
            />
            <span>Include browser &amp; viewport details to help reproduce</span>
          </label>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-theme-border-subtle flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              disabled={!canSubmit}
              className="btn-theme-secondary min-h-[40px] px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-theme-primary min-h-[40px] px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>Create GitHub Issue</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
