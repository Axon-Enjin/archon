"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MotionWrapperProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  triggerOnScroll?: boolean;
}

export default function MotionWrapper({
  children,
  className = "",
  delay = 0,
  direction = "up",
  triggerOnScroll = false,
}: MotionWrapperProps) {
  const getVariants = () => {
    const offset = 24;
    let x = 0;
    let y = 0;

    if (direction === "up") y = offset;
    else if (direction === "down") y = -offset;
    else if (direction === "left") x = offset;
    else if (direction === "right") x = -offset;

    return {
      hidden: { opacity: 0, x, y },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1] as const,
          delay,
        },
      },
    };
  };

  return (
    <motion.div
      initial="hidden"
      animate={triggerOnScroll ? undefined : "visible"}
      whileInView={triggerOnScroll ? "visible" : undefined}
      viewport={triggerOnScroll ? { once: true, margin: "-10% 0px" } : undefined}
      variants={getVariants()}
      className={className}
    >
      {children}
    </motion.div>
  );
}
