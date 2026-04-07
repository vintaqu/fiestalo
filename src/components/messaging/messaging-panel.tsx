"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, X, Send, ArrowLeft, Loader2,
  Building2, Calendar, Trash2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";

// ── Types ─────────────────────────────────────────────────────────

interface Participant {
  userId: string;
  user:   { id: string; name: string | null; image: string | null };
  unreadCount: number;
}

interface ConversationSummary {
  id:              string;
  type:            string;
  subject:         string | null;
  lastMessageAt:   string | null;
  lastMessageBody: string | null;
  myUnreadCount:   number;
  participants:    Participant[];
  venue?:          { id: string; title: string; slug: string; images: { url: string }[] } | null;
  booking?:        { id: string; bookingRef: string; date: string; startTime: string; endTime: string; status: string } | null;
  messages:        { content: string; sender: { id: string; name: string | null }; createdAt: string }[];
}

interface Message {
  id:        string;
  content:   string;
  type:      string;
  isDeleted: boolean;
  senderId:  string;
  createdAt: string;
  sender:    { id: string; name: string | null; image: string | null; role: string };
}

interface MessagingPanelProps {
  open:            boolean;
  onClose:         () => void;
  initialConversationId?: string;
}

// ── MessagingPanel ────────────────────────────────────────────────

export function MessagingPanel({ open, onClose, initialConversationId }: MessagingPanelProps) {
  const { data: session } = useSession();
  const [conversations,   setConversations]   = useState<ConversationSummary[]>([]);
  const [activeId,        setActiveId]        = useState<string | null>(initialConversationId ?? null);
  const [messages,        setMessages]        = useState<Message[]>([]);
  const [loadingConvos,   setLoadingConvos]   = useState(false);
  const [loadingMsgs,     setLoadingMsgs]     = useState(false);
  const [sending,         setSending]         = useState(false);
  const [draft,           setDraft]           = useState("");
  const [totalUnread,     setTotalUnread]      = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const me = session?.user?.id;

  // Poll unread count
  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 30_000);
    return () => clearInterval(iv);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Load conversations when panel opens
  useEffect(() => {
    if (!open) return;
    fetchConversations();
  }, [open]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId);
  }, [activeId]);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchUnread() {
    try {
      const res  = await fetch("/api/conversations/unread");
      const data = await res.json();
      setTotalUnread(data.data?.unread ?? 0);
    } catch {}
  }

  async function fetchConversations() {
    setLoadingConvos(true);
    try {
      const res  = await fetch("/api/conversations?limit=30");
      const data = await res.json();
      setConversations(data.data ?? []);
    } catch {} finally {
      setLoadingConvos(false);
    }
  }

  async function fetchMessages(conversationId: string) {
    setLoadingMsgs(true);
    try {
      const res  = await fetch(`/api/conversations/${conversationId}/messages?limit=100`);
      const data = await res.json();
      setMessages(data.data ?? []);
      // Update conversation unread count locally
      setConversations((prev) =>
        prev.map((c) => c.id === conversationId ? { ...c, myUnreadCount: 0 } : c)
      );
    } catch {} finally {
      setLoadingMsgs(false);
    }
  }

  async function sendMessage() {
    if (!draft.trim() || !activeId || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft("");

    // Optimistic update
    const optimistic: Message = {
      id:        `temp_${Date.now()}`,
      content,
      type:      "TEXT",
      isDeleted: false,
      senderId:  me ?? "",
      createdAt: new Date().toISOString(),
      sender:    { id: me ?? "", name: session?.user?.name ?? null, image: session?.user?.image ?? null, role: session?.user?.role ?? "TENANT" },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) => m.id === optimistic.id ? data.data : m)
      );
      // Update conversation last message
      setConversations((prev) =>
        prev.map((c) => c.id === activeId
          ? { ...c, lastMessageAt: new Date().toISOString(), lastMessageBody: content.slice(0, 100) }
          : c
        )
      );
    } catch {
      // Revert optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(content);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function deleteMessage(messageId: string) {
    if (!activeId) return;
    await fetch(`/api/conversations/${activeId}/messages/${messageId}`, { method: "DELETE" });
    setMessages((prev) =>
      prev.map((m) => m.id === messageId ? { ...m, isDeleted: true, content: "[Mensaje eliminado]" } : m)
    );
  }

  const activeConvo = conversations.find((c) => c.id === activeId);
  const otherParticipants = activeConvo?.participants.filter((p) => p.userId !== me) ?? [];

  return (
    <>
      {/* Unread badge — exposed for parent components */}
      <div style={{ display: "none" }} data-unread={totalUnread} />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-50"
              onClick={() => { if (!activeId) onClose(); else setActiveId(null); }}
            />

            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background shadow-xl z-50 flex"
            >
              {/* ── Conversation list ─────────────────────────── */}
              <div className={cn(
                "flex flex-col border-r border-border transition-all",
                activeId ? "w-0 overflow-hidden md:w-72 md:overflow-visible" : "w-full md:w-72"
              )}>
                <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-semibold">Mensajes</h2>
                    {totalUnread > 0 && (
                      <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">
                        {totalUnread}
                      </span>
                    )}
                  </div>
                  <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loadingConvos ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-4 gap-2">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No hay conversaciones</p>
                      <p className="text-xs text-muted-foreground/70">
                        Inicia una consulta desde la ficha de un espacio
                      </p>
                    </div>
                  ) : (
                    conversations.map((convo) => {
                      const others = convo.participants.filter((p) => p.userId !== me);
                      const other  = others[0];
                      const isActive = convo.id === activeId;
                      return (
                        <button
                          key={convo.id}
                          onClick={() => setActiveId(convo.id)}
                          className={cn(
                            "w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors border-b border-border/50 last:border-0",
                            isActive && "bg-primary/5 border-l-2 border-l-primary"
                          )}
                        >
                          <div className="flex gap-3">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 overflow-hidden">
                              {other?.user.image ? (
                                <Image src={other.user.image} alt="" width={36} height={36} className="w-full h-full object-cover" />
                              ) : (
                                other?.user.name?.charAt(0)?.toUpperCase() ?? "?"
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className={cn("text-sm truncate", convo.myUnreadCount > 0 && "font-semibold")}>
                                  {other?.user.name ?? "Usuario"}
                                </p>
                                {convo.lastMessageAt && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {new Date(convo.lastMessageAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {convo.venue?.title && <span className="text-primary/70">{convo.venue.title} · </span>}
                                {convo.lastMessageBody ?? convo.subject ?? "Nueva conversación"}
                              </p>
                              {convo.myUnreadCount > 0 && (
                                <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                                  {convo.myUnreadCount} nuevo{convo.myUnreadCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Chat panel ────────────────────────────────── */}
              <div className={cn(
                "flex flex-col flex-1",
                !activeId && "hidden md:flex"
              )}>
                {!activeId ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/20" />
                    <p className="text-muted-foreground text-sm">Selecciona una conversación</p>
                  </div>
                ) : (
                  <>
                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                      <button
                        onClick={() => setActiveId(null)}
                        className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {otherParticipants.map((p) => p.user.name).join(", ")}
                        </p>
                        {activeConvo?.venue && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {activeConvo.venue.title}
                          </p>
                        )}
                        {activeConvo?.booking && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Reserva {activeConvo.booking.bookingRef} · {new Date(activeConvo.booking.date).toLocaleDateString("es-ES")}
                          </p>
                        )}
                      </div>
                      <button onClick={() => setActiveId(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground md:hidden">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                      {loadingMsgs ? (
                        <div className="flex items-center justify-center h-20">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          Aún no hay mensajes. ¡Empieza la conversación!
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMe     = msg.senderId === me;
                          const isSystem = msg.type === "SYSTEM";

                          if (isSystem) {
                            return (
                              <div key={msg.id} className="flex justify-center">
                                <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                                  {msg.content}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div key={msg.id} className={cn("flex gap-2 group", isMe && "flex-row-reverse")}>
                              {/* Avatar */}
                              {!isMe && (
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 overflow-hidden">
                                  {msg.sender.image ? (
                                    <Image src={msg.sender.image} alt="" width={28} height={28} className="w-full h-full object-cover" />
                                  ) : (
                                    msg.sender.name?.charAt(0)?.toUpperCase() ?? "?"
                                  )}
                                </div>
                              )}

                              {/* Bubble */}
                              <div className={cn("max-w-[75%]", isMe && "items-end flex flex-col")}>
                                {!isMe && (
                                  <p className="text-xs text-muted-foreground mb-1 ml-1">
                                    {msg.sender.name}
                                    {msg.sender.role === "ADMIN" && (
                                      <span className="ml-1 text-amber-600 font-medium">Admin</span>
                                    )}
                                  </p>
                                )}
                                <div className={cn(
                                  "px-3 py-2 rounded-2xl text-sm relative",
                                  isMe
                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-secondary rounded-tl-sm",
                                  msg.isDeleted && "opacity-50 italic"
                                )}>
                                  <p className="leading-relaxed whitespace-pre-wrap break-words">
                                    {msg.content}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className={cn("text-xs text-muted-foreground/60", isMe && "text-right")}>
                                    {new Date(msg.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                  {isMe && !msg.isDeleted && (
                                    <button
                                      onClick={() => deleteMessage(msg.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-4 py-3 border-t border-border shrink-0">
                      <div className="flex gap-2 items-end">
                        <textarea
                          ref={textareaRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
                          rows={1}
                          maxLength={5000}
                          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none max-h-32 overflow-y-auto"
                          style={{ minHeight: "40px" }}
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!draft.trim() || sending}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                            draft.trim() && !sending
                              ? "bg-primary text-white hover:bg-primary/90"
                              : "bg-secondary text-muted-foreground cursor-not-allowed"
                          )}
                        >
                          {sending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 text-right">
                        {draft.length}/5000
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
