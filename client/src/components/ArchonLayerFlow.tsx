"use client";

import { motion } from "framer-motion";
import { Users, Bot, Database, ShieldCheck, Bell, ArrowDown } from "lucide-react";

export default function ArchonLayerFlow() {
  return (
    <div className="relative w-full max-w-4xl mx-auto p-4 md:p-8 rounded-3xl bg-white border border-zinc-200 shadow-xl overflow-hidden min-h-[380px] flex items-center justify-center">
      {/* Absolute top decorative gradient bar */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary to-teal-400"></div>

      {/* Animations are loaded from globals.css */}

      {/* MOBILE VIEW (Stacked layout, hidden on desktop) */}
      <div className="flex md:hidden flex-col items-center gap-6 w-full py-6 select-none z-10">
        {/* User */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200 shadow-sm">
            <Users className="w-6 h-6 text-brand-text" />
          </div>
          <span className="font-bold text-brand-text text-xs">Students & Staff</span>
        </div>

        <ArrowDown className="w-5 h-5 text-zinc-300 animate-bounce" />

        {/* Agent Core */}
        <div className="flex flex-col items-center gap-3 bg-brand-primary-light/10 p-5 rounded-2xl border border-brand-primary/20 w-full max-w-[260px] text-center shadow-md">
          <div className="h-12 w-12 bg-brand-primary rounded-xl flex items-center justify-center shadow-sm">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-brand-text text-base block font-display">Archon Agent</span>
            <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">Orchestrator Engine</span>
          </div>
        </div>

        <ArrowDown className="w-5 h-5 text-zinc-300 animate-bounce" />

        {/* Systems Column */}
        <div className="flex flex-col gap-2.5 w-full max-w-[260px]">
          <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200 shadow-sm">
            <Database className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="text-xs font-bold text-brand-text">Cosmos DB (Data)</span>
          </div>
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-blue-900">Entra ID (Auth)</span>
          </div>
          <div className="flex items-center gap-3 bg-brand-m365/10 px-4 py-2 rounded-xl border border-brand-m365/20 shadow-sm">
            <Bell className="w-4 h-4 text-brand-m365 shrink-0" />
            <span className="text-xs font-bold text-brand-m365">M365 (Alerts)</span>
          </div>
        </div>
      </div>

      {/* DESKTOP VIEW (Pixel-perfect scaling with foreignObject node positioning) */}
      <div className="hidden md:block w-full select-none">
        <svg 
          className="w-full h-auto max-h-[360px]" 
          viewBox="0 0 1000 360" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Static Connecting Lines */}
          {/* User to Agent */}
          <path d="M 132 180 L 370 180" stroke="#F1F5F9" strokeWidth="4" strokeLinecap="round" />
          <path d="M 132 180 L 370 180" stroke="#0D9488" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
          
          {/* Agent to Cosmos DB */}
          <path d="M 630 180 C 675 180, 675 90, 720 90" stroke="#F1F5F9" strokeWidth="4" strokeLinecap="round" />
          <path d="M 630 180 C 675 180, 675 90, 720 90" stroke="#0D9488" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />

          {/* Agent to Entra ID */}
          <path d="M 630 180 L 720 180" stroke="#F1F5F9" strokeWidth="4" strokeLinecap="round" />
          <path d="M 630 180 L 720 180" stroke="#0078D4" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />

          {/* Agent to M365 */}
          <path d="M 630 180 C 675 180, 675 270, 720 270" stroke="#F1F5F9" strokeWidth="4" strokeLinecap="round" />
          <path d="M 630 180 C 675 180, 675 270, 720 270" stroke="#0078D4" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />

          {/* Animated Laser Pulses (Foreground) */}
          {/* User -> Agent */}
          <path d="M 132 180 L 370 180" stroke="#0D9488" strokeWidth="3" className="laser-path-1" strokeLinecap="round" />

          {/* Agent -> Cosmos DB */}
          <path d="M 630 180 C 675 180, 675 90, 720 90" stroke="#0D9488" strokeWidth="3" className="laser-path-2" strokeLinecap="round" />

          {/* Agent -> Entra ID */}
          <path d="M 630 180 L 720 180" stroke="#0078D4" strokeWidth="3" className="laser-path-1" strokeLinecap="round" />

          {/* Agent -> M365 */}
          <path d="M 630 180 C 675 180, 675 270, 720 270" stroke="#0078D4" strokeWidth="3" className="laser-path-3" strokeLinecap="round" />

          {/* --- HTML Nodes Embedded inside SVG Coordinate Space --- */}
          {/* Node 1: User Side Circle */}
          <foreignObject x="68" y="148" width="64" height="64">
            <div className="w-full h-full flex items-center justify-center">
              <motion.div 
                whileHover={{ scale: 1.08 }}
                className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200 shadow-md cursor-pointer"
              >
                <Users className="w-8 h-8 text-brand-text" />
              </motion.div>
            </div>
          </foreignObject>

          {/* Node 1 Label: User Side Text */}
          <foreignObject x="20" y="224" width="160" height="40">
            <div className="w-full h-full text-center font-bold text-brand-text text-xs leading-tight">
              Students & Staff
            </div>
          </foreignObject>

          {/* Node 2: Powered-Up Archon Agent */}
          <foreignObject x="370" y="70" width="260" height="220">
            <div className="w-full h-full flex items-center justify-center">
              <motion.div 
                animate={{ 
                  boxShadow: [
                    "0 0 15px rgba(13,148,136,0.3)",
                    "0 0 30px rgba(13,148,136,0.6)",
                    "0 0 15px rgba(13,148,136,0.3)"
                  ]
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.03 }}
                className="flex flex-col items-center gap-4 bg-brand-primary-light/10 p-6 rounded-2xl border border-brand-primary/30 w-full shadow-lg text-center"
              >
                <div className="h-16 w-16 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div>
                  <span className="font-bold text-brand-text text-lg block font-display">Archon Agent</span>
                  <span className="text-xs text-brand-primary font-bold uppercase tracking-wider">Orchestrator Engine</span>
                </div>
              </motion.div>
            </div>
          </foreignObject>

          {/* Node 3: Systems Side */}
          {/* Cosmos DB */}
          <foreignObject x="720" y="60" width="240" height="60">
            <div className="h-full flex items-center">
              <motion.div 
                whileHover={{ x: 6 }}
                className="flex items-center gap-3 bg-zinc-50 px-4 py-2.5 rounded-xl border border-zinc-200 shadow-sm w-[224px] cursor-pointer"
              >
                <div className="h-8 w-8 bg-zinc-100 rounded-lg flex items-center justify-center border border-zinc-200 shrink-0">
                  <Database className="w-4 h-4 text-zinc-500" />
                </div>
                <span className="text-xs font-bold text-brand-text">Cosmos DB (Data)</span>
              </motion.div>
            </div>
          </foreignObject>

          {/* Entra ID */}
          <foreignObject x="720" y="150" width="240" height="60">
            <div className="h-full flex items-center">
              <motion.div 
                whileHover={{ x: 6 }}
                className="flex items-center gap-3 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm w-[224px] cursor-pointer"
              >
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-bold text-blue-900">Entra ID (Auth)</span>
              </motion.div>
            </div>
          </foreignObject>

          {/* M365 */}
          <foreignObject x="720" y="240" width="240" height="60">
            <div className="h-full flex items-center">
              <motion.div 
                whileHover={{ x: 6 }}
                className="flex items-center gap-3 bg-brand-m365/10 px-4 py-2.5 rounded-xl border border-brand-m365/20 shadow-sm w-[224px] cursor-pointer"
              >
                <div className="h-8 w-8 bg-brand-m365/20 rounded-lg flex items-center justify-center border border-brand-m365/30 shrink-0">
                  <Bell className="w-4 h-4 text-brand-m365" />
                </div>
                <span className="text-xs font-bold text-brand-m365">M365 (Alerts)</span>
              </motion.div>
            </div>
          </foreignObject>
        </svg>
      </div>

    </div>
  );
}
