"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePlanErrorMessage } from "@/components/use-plan-error";
import { formatDistanceToNow } from "date-fns";
import type { Locale } from "date-fns";
import { pt, enUS, es, fr, de, it } from "date-fns/locale";
import { MessageCircle, X, Menu } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Conversation = {
  id: string;
  title: string | null;
  documentIds: string[];
  updatedAt: Date;
  _count: { messages: number };
};

type Subject = { id: string; name: string; emoji: string; color: string };
type Document = { id: string; title: string; discipline: Subject | null };

type Message = { role: "user" | "assistant"; content: string };

const DATE_FNS_LOCALES: Record<string, Locale> = { pt, en: enUS, es, fr, de, it };

// ─── Main Component ──────────────────────────────────────────────────────────

export function ChatInterface({
  initialConversations,
  documents,
  subjects,
}: {
  initialConversations: Conversation[];
  documents: Document[];
  subjects: Subject[];
  userId: string;
}) {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const planErrorMessage = usePlanErrorMessage();
  const locale = useLocale();
  const dateFnsLocale = DATE_FNS_LOCALES[locale] ?? enUS;

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Open sidebar by default on desktop only
  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoadingHistory(true);
    setActiveConversationId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
    try {
      const res = await fetch(`/api/chat/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs: Message[] = data.conversation.messages.map(
        (m: { role: string; content: string }) => ({
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
        })
      );
      setMessages(msgs);
      setSelectedDocIds(data.conversation.documentIds ?? []);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  async function createConversation(docIds: string[], subject: Subject | null) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: docIds }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const newConv: Conversation = {
      ...data.conversation,
      updatedAt: new Date(data.conversation.createdAt),
      _count: { messages: 0 },
    };
    setConversations((prev) => [newConv, ...prev]);
    setMessages([]);
    setSelectedDocIds(docIds);
    setActiveSubject(subject);
    setActiveConversationId(newConv.id);
    setShowDocPicker(false);
    inputRef.current?.focus();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming || !activeConversationId) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsStreaming(true);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`/api/chat/${activeConversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          ...(activeSubject ? { subjectName: activeSubject.name } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content:
              planErrorMessage(err as { code?: string; limit?: number }) ??
              `Erro: ${(err as { error?: string }).error ?? "Falha na resposta"}`,
          },
        ]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + chunk },
          ];
        });
      }

      const convRes = await fetch(`/api/chat/${activeConversationId}`);
      if (convRes.ok) {
        const { conversation: updatedConv } = await convRes.json();
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                ...c,
                title: updatedConv.title ?? c.title,
                updatedAt: new Date(),
                _count: { messages: c._count.messages + 2 },
              }
              : c
          )
        );
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, updatedAt: new Date(), _count: { messages: c._count.messages + 2 } }
              : c
          )
        );
      }
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/chat/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  }

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="-my-4 lg:-my-6 flex h-[calc(100dvh-3.5rem)] lg:h-screen">
      {/* ── Sidebar ────────────────────────────────────────────── */}
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-[60] w-72 flex flex-col glass-sidebar md:relative md:inset-auto md:z-auto md:w-64 md:flex-shrink-0">
          <div className="p-3 pt-14 md:pt-3 border-b border-white/30 dark:border-white/10">
            <Button className="w-full" size="sm" onClick={() => setShowDocPicker(true)}>
              {t("newChat")}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">
                {t("noConversations")}
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-white/10 text-sm transition-colors group relative cursor-pointer ${conv.id === activeConversationId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent/60"
                    }`}
                >
                  <div className="font-medium truncate pr-6">
                    {conv.title || t("untitledConversation")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-between">
                    <span>
                      {formatDistanceToNow(new Date(conv.updatedAt), {
                        addSuffix: true,
                        locale: dateFnsLocale,
                      })}
                    </span>
                    <span>{conv._count.messages} msgs</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    title={t("deleteConversation")}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ── Main Chat Area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="sticky top-14 z-10 bg-card border-b border-border px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <MessageCircle size={16} className="text-primary shrink-0" />
            <span className="font-semibold text-sm">{t("title")}</span>
            {activeSubject && (
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: activeSubject.color }}
              >
                {activeSubject.emoji} {activeSubject.name}
              </span>
            )}
            {activeConv && activeConv.documentIds.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {activeConv.documentIds.length === 1
                  ? t("docsInContext", { count: activeConv.documentIds.length })
                  : t("docsInContextPlural", { count: activeConv.documentIds.length })}
              </span>
            )}
          </div>
          {activeConversationId && (
            <button
              onClick={() => setShowDocPicker(true)}
              className="glass-sm text-xs rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("changeDocuments")}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!activeConversationId ? (
            <div className="flex flex-col items-center justify-center h-auto text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MessageCircle size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("welcomeTitle")}</h2>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  {t("welcomeDesc")}
                </p>
              </div>
              <Button onClick={() => setShowDocPicker(true)}>
                {t("startConversation")}
              </Button>
            </div>
          ) : isLoadingHistory ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {tCommon("loading")}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <p className="text-sm text-muted-foreground">
                {t("conversationStarted")}
              </p>
              {selectedDocIds.length === 0 && (
                <p className="text-xs text-amber-600">
                  {t("noDocsWarning")}
                </p>
              )}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                      ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md"
                      : "glass-sm text-foreground"
                    }`}
                >
                  {msg.content === "" && isStreaming ? (
                    <span className="animate-pulse">●●●</span>
                  ) : (
                    <MessageContent content={msg.content} />
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {activeConversationId && (
          <div className="glass border-t border-white/20 p-3 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("inputPlaceholder")}
                className="flex-1 min-h-[44px] max-h-[200px] resize-none rounded-xl border border-input bg-white/60 dark:bg-white/5 px-3 py-2.5 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={1}
                disabled={isStreaming}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="h-[44px] px-4 flex-shrink-0"
              >
                {isStreaming ? t("sending") : t("send")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Document Picker Modal ───────────────────────────────── */}
      {showDocPicker && (
        <DocumentPickerModal
          documents={documents}
          subjects={subjects}
          initialSelected={selectedDocIds}
          initialSubject={activeSubject}
          onConfirm={(docIds, subject) => {
            if (activeConversationId) {
              setSelectedDocIds(docIds);
              setActiveSubject(subject);
              setShowDocPicker(false);
            } else {
              createConversation(docIds, subject);
            }
          }}
          onCancel={() => setShowDocPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Document Picker Modal ───────────────────────────────────────────────────

function DocumentPickerModal({
  documents,
  subjects,
  initialSelected,
  initialSubject,
  onConfirm,
  onCancel,
}: {
  documents: Document[];
  subjects: Subject[];
  initialSelected: string[];
  initialSubject: Subject | null;
  onConfirm: (ids: string[], subject: Subject | null) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(
    initialSubject?.id ?? null
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const filteredDocs = subjectFilter
    ? documents.filter((d) => d.discipline?.id === subjectFilter)
    : documents;

  const activeSubjectObj = subjects.find((s) => s.id === subjectFilter) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b border-white/20">
          <h2 className="font-semibold">{t("selectDocuments")}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t("selectDocumentsDesc")}
          </p>
        </div>

        {/* Subject filter */}
        {subjects.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSubjectFilter(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${subjectFilter === null
                  ? "bg-primary text-primary-foreground"
                  : "glass-sm text-muted-foreground hover:text-foreground"
                }`}
            >
              {tCommon("all")}
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubjectFilter(subjectFilter === s.id ? null : s.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${subjectFilter === s.id ? "text-white" : "glass-sm text-muted-foreground hover:text-foreground"
                  }`}
                style={subjectFilter === s.id ? { backgroundColor: s.color } : {}}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 max-h-60 overflow-y-auto space-y-2">
          {filteredDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noDocumentsAvailable")}
            </p>
          ) : (
            filteredDocs.map((doc) => (
              <label
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 p-3 cursor-pointer hover:bg-accent/60 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(doc.id)}
                  onChange={() => toggle(doc.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm truncate flex-1">{doc.title}</span>
                {doc.discipline && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full text-white shrink-0"
                    style={{ backgroundColor: doc.discipline.color }}
                  >
                    {doc.discipline.emoji}
                  </span>
                )}
              </label>
            ))
          )}
        </div>
        <div className="p-4 border-t border-white/20 flex justify-end gap-2">
          <Button variant="glass" size="sm" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
          <Button size="sm" onClick={() => onConfirm(selected, activeSubjectObj)}>
            {selected.length > 0
              ? selected.length === 1
                ? t("startWithDocs", { count: selected.length })
                : t("startWithDocsPlural", { count: selected.length })
              : t("startWithoutDocs")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Content ─────────────────────────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="font-semibold">
              {line.slice(2, -2)}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <p key={i} className="pl-3">
              • {line.slice(2)}
            </p>
          );
        }
        if (line === "") return <br key={i} />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
