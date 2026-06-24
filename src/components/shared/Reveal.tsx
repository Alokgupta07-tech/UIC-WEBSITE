import { motion } from "framer-motion";
import type { ReactNode } from "react";

type RevealVariant = "fade-up" | "fade-in" | "slide-left" | "scale";

const variants: Record<RevealVariant, object> = {
  "fade-up": { opacity: 0, y: 30 },
  "fade-in": { opacity: 0 },
  "slide-left": { opacity: 0, x: -30 },
  scale: { opacity: 0, scale: 0.95 },
};

interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
  once?: boolean;
}

/** Wraps children with a Framer Motion viewport-reveal animation. */
export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  className,
  once = true,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={variants[variant]}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
