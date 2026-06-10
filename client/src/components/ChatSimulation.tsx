"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Search, ShieldCheck } from "lucide-react";

interface ChatStep {
  type: "message" | "tool" | "typing";
  sender?: "user" | "ai";
  text?: string;
  toolIcon?: any;
}

export default function ChatSimulation() {
  const [visibleItems, setVisibleItems] = useState<ChatStep[]>([]);
  const [loopCount, setLoopCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-playing script representing 3 user prompts + 3 AI responses
  const script: { delay: number; item: ChatStep }[] = [
    // --- Interaction 1 ---
    {
      delay: 500,
      item: { type: "message", sender: "user", text: "Why do I have a hold on my registration? I can't enroll." }
    },
    {
      delay: 2200,
      item: { type: "typing", sender: "ai" }
    },
    {
      delay: 3500,
      item: { type: "tool", text: "Checking academic & bursar database...", toolIcon: <Search className="w-3.5 h-3.5 animate-pulse text-brand-primary" /> }
    },
    {
      delay: 5000,
      item: { type: "message", sender: "ai", text: "I found a **Financial Hold** of ₱12,500. However, I also see your approved **UniFAST grant** of ₱15,000 is currently pending release." }
    },

    // --- Interaction 2 ---
    {
      delay: 8500,
      item: { type: "message", sender: "user", text: "Can you lift it? I need to register today." }
    },
    {
      delay: 10200,
      item: { type: "typing", sender: "ai" }
    },
    {
      delay: 11500,
      item: { type: "tool", text: "Executing IUniversityAdapter.requestHoldLift...", toolIcon: <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" /> }
    },
    {
      delay: 13000,
      item: { type: "message", sender: "ai", text: "Since your pending grant covers the balance, I have **approved a temporary 14-day hold lift**. You are cleared to register! Please submit your appeal via the SAP Wizard later." }
    },

    // --- Interaction 3 ---
    {
      delay: 17000,
      item: { type: "message", sender: "user", text: "Thank you so much! Doing it now." }
    },
    {
      delay: 18500,
      item: { type: "typing", sender: "ai" }
    },
    {
      delay: 19500,
      item: { type: "message", sender: "ai", text: "You're welcome! Let me know if you need anything else. Have a great semester ahead!" }
    }
  ];

  useEffect(() => {
    setVisibleItems([]);
    const timers: NodeJS.Timeout[] = [];

    // Schedule each step in the script
    script.forEach(({ delay, item }) => {
      const timer = setTimeout(() => {
        setVisibleItems((prev) => {
          // If we are adding a message or tool, clear any active typing indicators first
          const filtered = prev.filter((i) => i.type !== "typing");
          return [...filtered, item];
        });
      }, delay);
      timers.push(timer);
    });

    // Reset loop
    const resetTimer = setTimeout(() => {
      setLoopCount((c) => c + 1);
    }, 25000);
    timers.push(resetTimer);

    return () => timers.forEach(clearTimeout);
  }, [loopCount]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleItems]);

  return (
    <div className="mx-auto w-full rounded-2xl bg-white p-6 shadow-xl border border-zinc-100 space-y-6 flex flex-col h-[480px]">
      {/* Top Browser Bar Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400"></div>
          <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
          <div className="h-3 w-3 rounded-full bg-green-400"></div>
        </div>
        <span className="text-xs font-semibold text-brand-muted font-display">Archon Conversational AI Agent</span>
      </div>

      {/* Auto-playing Chat Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin select-none"
      >
        <AnimatePresence>
          {visibleItems.map((item, idx) => {
            if (item.type === "tool") {
              return (
                <motion.div
                  key={`tool-${idx}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start pl-11"
                >
                  <div className="rounded-lg bg-brand-primary-light/40 border border-brand-primary-light px-3 py-1.5 text-xs text-brand-primary font-semibold flex items-center gap-1.5 shadow-sm">
                    {item.toolIcon}
                    <span>{item.text}</span>
                  </div>
                </motion.div>
              );
            }

            if (item.type === "typing") {
              return (
                <motion.div
                  key={`typing-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary overflow-hidden shadow-sm border border-zinc-100">
                    <Image src="/archon.svg" alt="Archon AI" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-[20px] rounded-tl-[4px] bg-brand-primary-light/50 px-4 py-3 flex items-center gap-1.5 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-bounce"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </motion.div>
              );
            }

            const isUser = item.sender === "user";
            return (
              <motion.div
                key={`msg-${idx}`}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary overflow-hidden shadow-sm border border-zinc-100">
                    <Image src="/archon.svg" alt="Archon AI" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div
                  className={`p-4 leading-relaxed text-xs shadow-sm max-w-[80%] ${
                    isUser
                      ? "rounded-[20px] rounded-br-[4px] bg-white border border-zinc-100 text-brand-text"
                      : "rounded-[20px] rounded-bl-[4px] bg-brand-primary-light text-brand-text"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: item.text
                      ?.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-brand-primary">$1</strong>') || ""
                  }}
                />

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 font-extrabold text-xs shadow-sm">
                    S
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
