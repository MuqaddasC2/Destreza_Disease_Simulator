"use client"

import { motion } from "framer-motion"

interface DeStrezaLogoProps {
  className?: string
}

export function DeStrezaLogo({ className }: DeStrezaLogoProps) {
  return (
    <motion.svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {/* Outer ring */}
      <circle cx="20" cy="20" r="19" stroke="url(#logoGradient)" strokeWidth="2" />

      {/* Inner hexagon */}
      <path
        d="M20 8L29.6 13.5V24.5L20 30L10.4 24.5V13.5L20 8Z"
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
        fill="url(#innerGradient)"
        fillOpacity="0.2"
      />

      {/* Network nodes */}
      <circle cx="20" cy="20" r="3" fill="url(#logoGradient)" />
      <circle cx="15" cy="15" r="1.5" fill="url(#logoGradient)" />
      <circle cx="25" cy="15" r="1.5" fill="url(#logoGradient)" />
      <circle cx="15" cy="25" r="1.5" fill="url(#logoGradient)" />
      <circle cx="25" cy="25" r="1.5" fill="url(#logoGradient)" />

      {/* Connection lines */}
      <line x1="17.5" y1="17.5" x2="19.5" y2="19.5" stroke="url(#logoGradient)" strokeWidth="0.75" />
      <line x1="20.5" y1="19.5" x2="23.5" y2="16.5" stroke="url(#logoGradient)" strokeWidth="0.75" />
      <line x1="20.5" y1="20.5" x2="23.5" y2="23.5" stroke="url(#logoGradient)" strokeWidth="0.75" />
      <line x1="17.5" y1="22.5" x2="19.5" y2="20.5" stroke="url(#logoGradient)" strokeWidth="0.75" />

      {/* Gradients */}
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF81FF" />
          <stop offset="100%" stopColor="#51FAAA" />
        </linearGradient>
        <linearGradient id="innerGradient" x1="10" y1="8" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF81FF" />
          <stop offset="100%" stopColor="#51FAAA" />
        </linearGradient>
      </defs>
    </motion.svg>
  )
}
