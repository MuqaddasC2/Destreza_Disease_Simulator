"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

interface AnimatedBackgroundProps {
  className?: string
}

export function AnimatedBackground({ className }: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const isInitializedRef = useRef(false)

  // Initialize dimensions only once and handle resize
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight * 2, // Make it taller for scrolling effect
      })
    }

    // Only set dimensions if not already initialized
    if (!isInitializedRef.current) {
      updateDimensions()
      isInitializedRef.current = true
    }

    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  // Handle mouse movement in a separate effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Throttle mouse position updates by only updating when significant movement occurs
      setMousePosition((prev) => {
        const newX = e.clientX / window.innerWidth
        const newY = e.clientY / window.innerHeight

        // Only update if position changed significantly (reduces state updates)
        if (Math.abs(prev.x - newX) > 0.01 || Math.abs(prev.y - newY) > 0.01) {
          return { x: newX, y: newY }
        }
        return prev
      })
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  // Only render the animation when dimensions are set
  if (dimensions.width === 0) return null

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}
      style={{ height: "200vh" }}
    >
      {/* Main gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0E1D] to-[#211F36] opacity-80" />

      {/* First glow - bottom (green) */}
      <motion.div
        className="absolute rounded-full bg-[#51FAAA] opacity-15 blur-[180px]"
        animate={{
          x: [
            dimensions.width * 0.1 - mousePosition.x * 80,
            dimensions.width * 0.15 - mousePosition.x * 80,
            dimensions.width * 0.1 - mousePosition.x * 80,
          ],
          y: [
            dimensions.height * 0.6 + mousePosition.y * 80,
            dimensions.height * 0.65 + mousePosition.y * 80,
            dimensions.height * 0.6 + mousePosition.y * 80,
          ],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        style={{
          width: dimensions.width * 0.6,
          height: dimensions.width * 0.6,
        }}
      />

      {/* Second glow - top (pink) */}
      <motion.div
        className="absolute rounded-full bg-[#FF81FF] opacity-15 blur-[180px]"
        animate={{
          x: [
            dimensions.width * 0.6 + mousePosition.x * 80,
            dimensions.width * 0.65 + mousePosition.x * 80,
            dimensions.width * 0.6 + mousePosition.x * 80,
          ],
          y: [
            dimensions.height * 0.1 - mousePosition.y * 80,
            dimensions.height * 0.15 - mousePosition.y * 80,
            dimensions.height * 0.1 - mousePosition.y * 80,
          ],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        style={{
          width: dimensions.width * 0.5,
          height: dimensions.width * 0.5,
        }}
      />

      {/* Third glow - middle (blend) */}
      <motion.div
        className="absolute rounded-full bg-gradient-to-r from-[#51FAAA] to-[#FF81FF] opacity-10 blur-[150px]"
        animate={{
          x: [
            dimensions.width * 0.4 - mousePosition.x * 60,
            dimensions.width * 0.45 - mousePosition.x * 60,
            dimensions.width * 0.4 - mousePosition.x * 60,
          ],
          y: [
            dimensions.height * 0.4 + mousePosition.y * 60,
            dimensions.height * 0.45 + mousePosition.y * 60,
            dimensions.height * 0.4 + mousePosition.y * 60,
          ],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        style={{
          width: dimensions.width * 0.7,
          height: dimensions.width * 0.7,
        }}
      />

      {/* Fourth glow - subtle movement */}
      <motion.div
        className="absolute rounded-full bg-[#51FAAA] opacity-5 blur-[100px]"
        animate={{
          x: [
            dimensions.width * 0.2 + mousePosition.x * 40,
            dimensions.width * 0.25 + mousePosition.x * 40,
            dimensions.width * 0.2 + mousePosition.x * 40,
          ],
          y: [
            dimensions.height * 0.8 - mousePosition.y * 40,
            dimensions.height * 0.85 - mousePosition.y * 40,
            dimensions.height * 0.8 - mousePosition.y * 40,
          ],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        style={{
          width: dimensions.width * 0.4,
          height: dimensions.width * 0.4,
        }}
      />
    </div>
  )
}
