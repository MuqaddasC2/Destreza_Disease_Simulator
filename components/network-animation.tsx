"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  connections: number[]
}

interface NetworkAnimationProps {
  className?: string
}

export function NetworkAnimation({ className }: NetworkAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const nodesRef = useRef<Node[]>([])
  const animationRef = useRef<number>(0)
  const isInitializedRef = useRef(false)

  // Initialize dimensions and nodes only once
  useEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return

    const canvas = canvasRef.current

    // Set initial dimensions
    if (canvas.parentElement) {
      const { width, height } = canvas.parentElement.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
      setDimensions({ width, height })
      isInitializedRef.current = true
    }

    // Handle resize
    const handleResize = () => {
      if (canvas.parentElement) {
        const { width, height } = canvas.parentElement.getBoundingClientRect()
        canvas.width = width
        canvas.height = height
        setDimensions({ width, height })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Create nodes and start animation when dimensions are set
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create nodes
    const createNodes = () => {
      const nodes: Node[] = []
      const nodeCount = Math.min(Math.floor(dimensions.width / 25), 60)

      // Create nodes with random positions
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * dimensions.width,
          y: Math.random() * dimensions.height,
          vx: (Math.random() - 0.5) * 0.15, // Slower initial velocity for smoother movement
          vy: (Math.random() - 0.5) * 0.15,
          radius: Math.random() * 1.5 + 1.5,
          color: Math.random() > 0.85 ? "#FF81FF" : Math.random() > 0.7 ? "#51FAAA" : "#616083",
          connections: [],
        })
      }

      // Create connections based on proximity
      nodes.forEach((node, index) => {
        // Find 2-4 closest nodes to connect to
        const distances = nodes
          .map((otherNode, otherIndex) => {
            if (index === otherIndex) return { index: otherIndex, distance: Number.POSITIVE_INFINITY }
            const dx = node.x - otherNode.x
            const dy = node.y - otherNode.y
            return { index: otherIndex, distance: Math.sqrt(dx * dx + dy * dy) }
          })
          .filter((item) => item.distance < Number.POSITIVE_INFINITY)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, Math.floor(Math.random() * 3) + 2)
          .map((item) => item.index)

        node.connections = distances
      })

      return nodes
    }

    nodesRef.current = createNodes()

    // Animation loop
    const animate = () => {
      if (!ctx) return

      ctx.clearRect(0, 0, dimensions.width, dimensions.height)

      // Draw connections
      ctx.lineWidth = 0.5

      nodesRef.current.forEach((node, index) => {
        node.connections.forEach((targetIndex) => {
          const target = nodesRef.current[targetIndex]

          // Calculate distance
          const dx = node.x - target.x
          const dy = node.y - target.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Draw connection with opacity based on distance
          const opacity = Math.max(0.1, 1 - distance / 200)
          ctx.strokeStyle = `rgba(97, 96, 131, ${opacity})`

          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
        })
      })

      // Draw nodes
      nodesRef.current.forEach((node) => {
        // Add very small random movement for organic feel
        node.vx += (Math.random() - 0.5) * 0.005
        node.vy += (Math.random() - 0.5) * 0.005

        // Update position
        node.x += node.vx
        node.y += node.vy

        // Bounce off edges with damping
        if (node.x < node.radius) {
          node.x = node.radius
          node.vx *= -0.7
        } else if (node.x > dimensions.width - node.radius) {
          node.x = dimensions.width - node.radius
          node.vx *= -0.7
        }

        if (node.y < node.radius) {
          node.y = node.radius
          node.vy *= -0.7
        } else if (node.y > dimensions.height - node.radius) {
          node.y = dimensions.height - node.radius
          node.vy *= -0.7
        }

        // Apply friction for smoother movement
        node.vx *= 0.99
        node.vy *= 0.99

        // Draw node
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = node.color
        ctx.fill()

        // Draw subtle glow
        const glowSize = node.radius * 3
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize)
        gradient.addColorStop(0, `${node.color}40`)
        gradient.addColorStop(1, "transparent")

        ctx.beginPath()
        ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [dimensions])

  return (
    <motion.div
      className={`absolute inset-0 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  )
}
