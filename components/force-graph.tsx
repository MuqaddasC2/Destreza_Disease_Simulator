"use client"

import { useEffect, useRef, useState } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Play,
  Pause,
  RefreshCw,
  WormIcon as Virus,
  Activity,
  Users,
  Skull,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  StepBack,
  StepForward,
  AlertCircle,
  Layers,
} from "lucide-react"
import * as d3 from "d3"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { throttle } from "lodash"

/** Fenwick (BIT) for weighted-degree sampling in O(log n) */
class Fenwick {
  private n: number
  private f: number[]
  constructor(n: number) {
    this.n = n
    this.f = Array(n + 1).fill(0)
  }
  update(i: number, delta: number) {
    for (let x = i + 1; x <= this.n; x += x & -x) {
      this.f[x] += delta
    }
  }
  query(i: number): number {
    let s = 0
    for (let x = i + 1; x > 0; x -= x & -x) {
      s += this.f[x]
    }
    return s
  }
  sample(target: number): number {
    let idx = 0
    let bitMask = 1 << Math.floor(Math.log2(this.n))
    while (bitMask) {
      const t = idx + bitMask
      if (t <= this.n && this.f[t] <= target) {
        target -= this.f[t]
        idx = t
      }
      bitMask >>= 1
    }
    return idx
  }
}

interface Node {
  id: number
  status: "susceptible" | "exposed" | "infectious" | "recovered" | "deceased"
  connections: number
  day: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface Link {
  source: number | Node
  target: number | Node
  day: number
  active: boolean // Track if the link is active
}

interface SimulationParams {
  populationSize: number
  initialInfected: number
  r0: number
  incubationPeriod: number
  infectiousPeriod: number
  recoveryRate: number
  advanced: {
    mobilityFactor: number
    socialDistancing: number
    maskUsage: number
    vaccinationRate: number
    infectiousMortalityRate: number
  }
}

interface SimulationState {
  nodes: Node[]
  links: Link[]
  day: number
  stats: {
    susceptible: number
    exposed: number
    infectious: number
    recovered: number
    deceased: number
  }
}

interface ForceGraphProps {
  simulationParams: SimulationParams
  onDayChange?: (day: number) => void
  initialDay?: number
  onSimulationComplete?: (history: SimulationState[]) => void
}

// Create a worker for physics calculations
const createSimulationWorker = () => {
  const workerCode = `
    importScripts('https://d3js.org/d3.v7.min.js');
    
    let nodes = [];
    let links = [];
    let simulation = null;
    
    self.onmessage = function(e) {
      const { type, data } = e.data;
      
      switch (type) {
        case 'init':
          nodes = data.nodes;
          links = data.links;
          const width = data.width;
          const height = data.height;
          
          simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(50))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(10))
            .alphaDecay(0.01) // Slower decay for more stable layout
            .on('tick', () => {
              // Only send positions, not the entire nodes array
              const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
              self.postMessage({ type: 'tick', data: positions });
            });
          break;
          
        case 'restart':
          if (simulation) {
            simulation.alpha(0.3).restart();
          }
          break;
          
        case 'stop':
          if (simulation) {
            simulation.stop();
          }
          break;
          
        case 'update':
          if (simulation) {
            // Update nodes and links
            nodes = data.nodes;
            links = data.links;
            
            simulation.nodes(nodes);
            simulation.force('link').links(links);
          }
          break;
          
        case 'tick':
          if (simulation) {
            // Manually advance the simulation by n steps
            for (let i = 0; i < data.steps; i++) {
              simulation.tick();
            }
            
            const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
            self.postMessage({ type: 'tick', data: positions });
          }
          break;
      }
    };
  `

  const blob = new Blob([workerCode], { type: "application/javascript" })
  const url = URL.createObjectURL(blob)
  return new Worker(url)
}

export function ForceGraph({ simulationParams, onDayChange, initialDay = 1, onSimulationComplete }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [nodes, setNodes] = useState<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [currentDay, setCurrentDay] = useState(initialDay)
  const [maxDay, setMaxDay] = useState(initialDay)
  const [stats, setStats] = useState({
    susceptible: 0,
    exposed: 0,
    infectious: 0,
    recovered: 0,
    deceased: 0,
  })
  const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms between steps
  const [simulationComplete, setSimulationComplete] = useState(false)
  const [yearLimitReached, setYearLimitReached] = useState(false)
  const [populationMortalityRate, setPopulationMortalityRate] = useState(0)
  const [useCanvas, setUseCanvas] = useState(false)
  const simulationRef = useRef<NodeJS.Timeout | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement | HTMLCanvasElement, unknown> | null>(null)
  const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const simulationRef2 = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null)
  const adjRef = useRef<number[][]>([])
  const edgeMapRef = useRef<Map<string, Link>>(new Map())
  const workerRef = useRef<Worker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null)

  // Store simulation history for back/forward navigation
  const [simulationHistory, setSimulationHistory] = useState<SimulationState[]>([])
  const [historyIndex, setHistoryIndex] = useState(0)

  // First, add a rotation state to track the current rotation angle
  const [rotationAngle, setRotationAngle] = useState(0)
  const rotationRef = useRef({ startAngle: 0, startX: 0, startY: 0, isDragging: false })

  // Calculate derived parameters based on user inputs
  const infectionRate = simulationParams.r0 / (simulationParams.infectiousPeriod * 5) // Simplified calculation
  const exposedRate = 1 / simulationParams.incubationPeriod
  const recoveryRate = simulationParams.recoveryRate
  const networkSize = simulationParams.populationSize

  const simulationCompleteRef = useRef(false)

  // Initialize with the initial day from props
  useEffect(() => {
    if (initialDay > 1) {
      setCurrentDay(initialDay)
      setMaxDay(Math.max(maxDay, initialDay))
    }
  }, [initialDay])

  // Notify parent component when day changes
  useEffect(() => {
    if (onDayChange) {
      onDayChange(currentDay)
    }
  }, [currentDay, onDayChange])

  // Calculate Population Mortality Rate (PMR)
  useEffect(() => {
    // Formula: PMR = (1 - 1/(R0 * (1 - Social Distancing))) * infectious mortality rate * (1 - vaccination rate * 0.80)
    const r0Factor = simulationParams.r0 * (1 - simulationParams.advanced.socialDistancing)
    const baseRate = r0Factor > 0 ? 1 - 1 / r0Factor : 0
    const vaccinationEffect = 1 - simulationParams.advanced.vaccinationRate * 0.8

    // Ensure the rate is between 0 and 1
    const calculatedPMR = Math.max(
      0,
      Math.min(1, baseRate * simulationParams.advanced.infectiousMortalityRate * vaccinationEffect),
    )

    setPopulationMortalityRate(calculatedPMR)
  }, [simulationParams])

  // Notify parent when simulation is complete
  useEffect(() => {
    if (simulationComplete && onSimulationComplete) {
      onSimulationComplete(simulationHistory)
    }
  }, [simulationComplete, onSimulationComplete, simulationHistory])

  // Initialize Web Worker
  useEffect(() => {
    // Create worker
    workerRef.current = createSimulationWorker()

    // Set up message handler
    workerRef.current.onmessage = (e) => {
      if (simulationCompleteRef.current) return; // Ignore if complete
      const { type, data } = e.data

      if (type === "tick") {
        // Update node positions from worker
        setNodes((prevNodes) => {
          const newNodes = [...prevNodes]
          data.forEach((pos: { id: number; x: number; y: number }) => {
            const node = newNodes.find((n) => n.id === pos.id)
            if (node) {
              node.x = pos.x
              node.y = pos.y
            }
          })
          return newNodes
        })

        // Request animation frame for canvas rendering
        if (useCanvas && canvasRef.current) {
          renderCanvas()
        }
      }
    }

    return () => {
      // Clean up worker
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  // Handle canvas rendering
  const renderCanvas = throttle(() => {
    if (!canvasRef.current || !canvasContextRef.current) return

    const context = canvasContextRef.current
    const canvas = canvasRef.current
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    context.clearRect(0, 0, width, height)

    // Apply zoom transform
    context.save()
    const transform = currentTransformRef.current
    context.translate(transform.x, transform.y)
    context.scale(transform.k, transform.k)

    // Apply rotation
    const centerX = width / 2
    const centerY = height / 2
    context.translate(centerX, centerY)
    context.rotate((rotationAngle * Math.PI) / 180)
    context.translate(-centerX, -centerY)

    // Draw links
    context.beginPath()
    links.forEach((link) => {
      const source = typeof link.source === "number" ? nodes.find((n) => n.id === link.source) : (link.source as Node)
      const target = typeof link.target === "number" ? nodes.find((n) => n.id === link.target) : (link.target as Node)

      if (!source || !target || !source.x || !source.y || !target.x || !target.y) return

      // Set link style based on properties
      if (!link.active) {
        context.strokeStyle = "#616083"
        context.globalAlpha = 0.1
        context.setLineDash([3, 3])
        context.lineWidth = 0.5
      } else if (link.day === 1) {
        context.strokeStyle = "#616083"
        context.globalAlpha = 0.3
        context.setLineDash([])
        context.lineWidth = 1
      } else if (link.day <= currentDay) {
        context.strokeStyle = "#FF5555"
        context.globalAlpha = 0.6
        context.setLineDash([])
        context.lineWidth = 2
      } else {
        context.strokeStyle = "transparent"
        context.globalAlpha = 0
      }

      context.moveTo(source.x, source.y)
      context.lineTo(target.x, target.y)
      context.stroke()

      // Reset for next link
      context.beginPath()
      context.globalAlpha = 1
    })

    // Draw nodes
    nodes.forEach((node) => {
      if (!node.x || !node.y) return

      context.beginPath()
      context.arc(node.x, node.y, 5, 0, 2 * Math.PI)

      // Set fill color based on status
      if (node.status === "susceptible")
        context.fillStyle = "#3B82F6" // Blue
      else if (node.status === "exposed")
        context.fillStyle = "#FF81FF" // Pink
      else if (node.status === "infectious")
        context.fillStyle = "#FF5555" // Red
      else if (node.status === "recovered")
        context.fillStyle = "#51FAAA" // Green
      else if (node.status === "deceased")
        context.fillStyle = "#A855F7" // Purple
      else context.fillStyle = "#3B82F6" // Default to blue

      context.fill()
    })

    // Restore context
    context.restore()
  }, 50) // Throttle to 20fps

  // Generate Barabasi-Albert network
  const generateNetwork = () => {
    // Reset simulation state
    if (simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = null
    }

    // Cancel any pending animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop worker simulation if running
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" })
    }

    setIsSimulating(false)
    setCurrentDay(1)
    setMaxDay(1)
    setSimulationComplete(false)
    setYearLimitReached(false)
    setSimulationHistory([])
    setHistoryIndex(0)

    const m0 = 3
    const m = 2
    const N = simulationParams.populationSize
    const newNodes: Node[] = []
    const newLinks: Link[] = []

    // Fenwick tree over node degrees
    const fenw = new Fenwick(N)

    // 1) Initialize first m0 fully connected
    for (let i = 0; i < m0; i++) {
      newNodes.push({
        id: i,
        status: i < simulationParams.initialInfected ? "infectious" : "susceptible",
        connections: m0 - 1,
        day: 1,
      })
      fenw.update(i, m0 - 1)
      for (let j = 0; j < i; j++) {
        newLinks.push({ source: i, target: j, day: 1, active: true })
      }
    }

    // 2) Grow remaining N – m0 nodes
    for (let i = m0; i < N; i++) {
      newNodes.push({
        id: i,
        status: i < simulationParams.initialInfected ? "infectious" : "susceptible",
        connections: 0,
        day: 1,
      })

      const targets = new Set<number>()
      const totalDeg = fenw.query(N - 1)

      while (targets.size < m) {
        const r = Math.random() * totalDeg
        const t = fenw.sample(r)
        if (t !== i && !targets.has(t)) targets.add(t)
      }

      for (const t of targets) {
        newLinks.push({ source: i, target: t, day: 1, active: true })
        newNodes[i].connections++
        newNodes[t].connections++
        fenw.update(i, 1)
        fenw.update(t, 1)
      }
    }

    // 3) Build adjacency list for O(deg) neighbor lookups
    const adj: number[][] = Array(N)
      .fill(0)
      .map(() => [])
    const edgeMap = new Map<string, Link>()

    for (const link of newLinks) {
      const s = typeof link.source === "number" ? link.source : link.source.id
      const t = typeof link.target === "number" ? link.target : link.target.id
      adj[s].push(t)
      adj[t].push(s)

      // Store edge in map for O(1) lookup
      const edgeKey1 = `${s}-${t}`
      const edgeKey2 = `${t}-${s}`
      edgeMap.set(edgeKey1, link)
      edgeMap.set(edgeKey2, link)
    }

    // Commit into state
    setNodes(newNodes)
    setLinks(newLinks)

    // Store adjacency list and edge map in refs
    adjRef.current = adj
    edgeMapRef.current = edgeMap

    const initialStats = calculateStats(newNodes)
    setStats(initialStats)

    // Save initial state to history
    setSimulationHistory([
      {
        nodes: JSON.parse(JSON.stringify(newNodes)),
        links: JSON.parse(JSON.stringify(newLinks)),
        day: 1,
        stats: initialStats,
      },
    ])

    // Initialize the worker with the new network
    if (workerRef.current && containerRef.current) {
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      workerRef.current.postMessage({
        type: "init",
        data: {
          nodes: JSON.parse(JSON.stringify(newNodes)),
          links: JSON.parse(JSON.stringify(newLinks)),
          width,
          height,
        },
      })
    }
  }

  // Calculate statistics
  const calculateStats = (currentNodes: Node[]) => {
    const newStats = {
      susceptible: 0,
      exposed: 0,
      infectious: 0,
      recovered: 0,
      deceased: 0,
    }

    currentNodes.forEach((node) => {
      newStats[node.status]++
    })

    return newStats
  }

  // Update statistics
  const updateStats = (currentNodes: Node[]) => {
    const newStats = calculateStats(currentNodes)
    setStats(newStats)

    // Check if simulation is complete (no exposed or infectious nodes)
    if (newStats.exposed === 0 && newStats.infectious === 0 && (newStats.recovered > 0 || newStats.deceased > 0)) {
      if (isSimulating && simulationRef.current) {
        clearInterval(simulationRef.current)
        simulationRef.current = null
        setIsSimulating(false)
      }
      setSimulationComplete(true)
      simulationCompleteRef.current = true; // Set ref synchronously
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "stop" });
      }
    }

    return newStats
  }

  // Run disease simulation step
  const simulationStep = () => {
    // Don't proceed if simulation is complete
    if (simulationComplete || simulationCompleteRef.current) return

    // Check if we've reached the 365-day limit
    if (currentDay >= 365) {
      if (simulationRef.current) {
        clearInterval(simulationRef.current)
        simulationRef.current = null
      }
      setIsSimulating(false)
      setSimulationComplete(true)
      setYearLimitReached(true)
      return
    }

    const newDay = currentDay + 1

    setNodes((prevNodes) => {
      const newNodes = [...prevNodes]

      // Determine which nodes are affected by social distancing
      // Apply social distancing to a random subset of nodes based on the social distancing rate
      const socialDistancingNodeIds = new Set()
      if (simulationParams.advanced.socialDistancing > 0) {
        const socialDistancingCount = Math.floor(newNodes.length * simulationParams.advanced.socialDistancing)
        while (socialDistancingNodeIds.size < socialDistancingCount) {
          const randomNodeId = Math.floor(Math.random() * newNodes.length)
          socialDistancingNodeIds.add(randomNodeId)
        }
      }

      // Base reinfection probability (very low: 0.1% per day)
      const baseReinfectionProbability = 0.001;

      // Adjust reinfection probability based on vaccination rate and social distancing
      const reinfectionProbability =
        baseReinfectionProbability *
        (1 - simulationParams.advanced.vaccinationRate) *
        (1 - simulationParams.advanced.socialDistancing);

      // Calculate daily death probability to align with populationMortalityRate
      const dailyDeathProbability = (populationMortalityRate * recoveryRate) / (1 - populationMortalityRate);

      // For each infectious node, try to infect neighbors
      for (let i = 0; i < newNodes.length; i++) {
        if (newNodes[i].status === "infectious") {
          // Use adjacency list for O(deg(i)) neighbor lookup
          const adj = adjRef.current
          const edgeMap = edgeMapRef.current

          // Process each neighbor
          for (const neighborId of adj[i]) {
            // Get the link using O(1) lookup
            const edgeKey = `${i}-${neighborId}`
            const link = edgeMap.get(edgeKey)

            // Skip if link is inactive
            if (!link || !link.active) continue

            if (newNodes[neighborId].status === "susceptible") {
              // Calculate infection probability based on various factors
              let infectionProbability = infectionRate

              // Apply social distancing effect if either node is practicing social distancing
              if (socialDistancingNodeIds.has(i) || socialDistancingNodeIds.has(neighborId)) {
                infectionProbability *= 1 - simulationParams.advanced.socialDistancing
              }

              // Apply vaccination effect - reduce infection probability for vaccinated nodes
              // Randomly determine if this node is vaccinated based on vaccination rate
              const isVaccinated = Math.random() < simulationParams.advanced.vaccinationRate
              if (isVaccinated) {
                // Vaccination reduces infection probability by 80%
                infectionProbability *= 0.2
              }

              // Attempt infection based on calculated probability
              if (Math.random() < infectionProbability) {
                newNodes[neighborId].status = "exposed"
                newNodes[neighborId].day = newDay

                // Add new transmission link for visualization
                const newLink = { source: i, target: neighborId, day: newDay, active: true }
                setLinks((prevLinks) => [...prevLinks, newLink])

                // Update edge map with the new link
                const newEdgeKey1 = `${i}-${neighborId}`
                const newEdgeKey2 = `${neighborId}-${i}`
                edgeMapRef.current.set(newEdgeKey1, newLink)
                edgeMapRef.current.set(newEdgeKey2, newLink)
              }
            }
          }

          // Check if infectious node dies or recovers using dailyDeathProbability
          if (Math.random() < dailyDeathProbability) {
            newNodes[i].status = "deceased"
            newNodes[i].day = newDay

            // Deactivate all links connected to this node
            setLinks((prevLinks) => {
              const updatedLinks = [...prevLinks]
              const adj = adjRef.current
              const edgeMap = edgeMapRef.current

              // Deactivate links to all neighbors
              for (const neighborId of adj[i]) {
                const edgeKey = `${i}-${neighborId}`
                const link = edgeMap.get(edgeKey)
                if (link) {
                  link.active = false
                }
              }

              return updatedLinks
            })
          } else if (Math.random() < recoveryRate) {
            newNodes[i].status = "recovered"
            newNodes[i].day = newDay
          }
        }

        // Check if exposed nodes become infectious
        if (newNodes[i].status === "exposed") {
          if (Math.random() < exposedRate) {
            newNodes[i].status = "infectious"
            newNodes[i].day = newDay
          }
        }

        // SIRS model: Recovered can become susceptible again (with low probability)
        if (newNodes[i].status === "recovered") {
          if (Math.random() < 0.01) {
            newNodes[i].status = "susceptible"
            newNodes[i].day = newDay
          }
        }
      }

      const newStats = updateStats(newNodes)

      // Save this state to history
      const newState = {
        nodes: JSON.parse(JSON.stringify(newNodes)),
        links: JSON.parse(JSON.stringify(links)),
        day: newDay,
        stats: newStats,
      }

      // If we're not at the end of history (user went back), truncate history
      setSimulationHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1)
        return [...newHistory, newState]
      })

      setHistoryIndex((prev) => prev + 1)

      return newNodes
    })

    // Only update day if simulation is not complete
    setCurrentDay(newDay)
    setMaxDay((prev) => Math.max(prev, newDay))

    // Update worker with new node states
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "update",
        data: {
          nodes: JSON.parse(JSON.stringify(nodes)),
          links: JSON.parse(JSON.stringify(links)),
        },
      })

      // Manually tick the simulation
      workerRef.current.postMessage({
        type: "tick",
        data: { steps: 2 },
      })
    }
  }

  // Step backward in simulation
  const stepBackward = () => {
    // Don't proceed if we're at the beginning or simulation is running
    if (historyIndex <= 0 || isSimulating) return

    // Find the previous state in history
    const prevIndex = historyIndex - 1
    const prevState = simulationHistory[prevIndex]

    if (!prevState) return

    // Apply the previous state
    setNodes(JSON.parse(JSON.stringify(prevState.nodes)))
    setLinks(JSON.parse(JSON.stringify(prevState.links)))
    setCurrentDay(prevState.day)
    setStats(prevState.stats)
    setHistoryIndex(prevIndex)

    // If we were at the end of simulation, we're not anymore
    if (simulationComplete && (prevState.stats.exposed > 0 || prevState.stats.infectious > 0)) {
      setSimulationComplete(false)
      setYearLimitReached(false)
    }

    // Update worker with previous state
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "update",
        data: {
          nodes: JSON.parse(JSON.stringify(prevState.nodes)),
          links: JSON.parse(JSON.stringify(prevState.links)),
        },
      })

      // Manually tick the simulation
      workerRef.current.postMessage({
        type: "tick",
        data: { steps: 1 },
      })
    }

    // Render canvas if using canvas mode
    if (useCanvas) {
      renderCanvas()
    }
  }

  // Toggle simulation
  const toggleSimulation = () => {
    if (isSimulating) {
      // Stop simulation
      if (simulationRef.current) {
        clearInterval(simulationRef.current)
        simulationRef.current = null
      }

      // Stop worker simulation
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "stop" })
      }

      setIsSimulating(false)
    } else {
      // Start simulation
      // Make sure we don't exceed 365 days
      if (currentDay >= 365) {
        setYearLimitReached(true)
        setSimulationComplete(true)
        return
      }

      // Restart worker simulation
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "restart" })
      }

      simulationRef.current = setInterval(simulationStep, simulationSpeed)
      setIsSimulating(true)
    }
  }

  // Handle simulation speed change
  const handleSpeedChange = (value: number[]) => {
    // Invert the speed value so higher = faster
    const newSpeed = 2000 - value[0]
    setSimulationSpeed(newSpeed)

    // Update interval if simulation is running
    if (isSimulating && simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = setInterval(simulationStep, newSpeed)
    }
  }

  // Initialize network
  useEffect(() => {
    generateNetwork()
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current)
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [simulationParams])

  // Initialize canvas context
  useEffect(() => {
    if (canvasRef.current) {
      canvasContextRef.current = canvasRef.current.getContext("2d")

      // Set up canvas size
      const resizeCanvas = () => {
        if (canvasRef.current && containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect()
          canvasRef.current.width = width
          canvasRef.current.height = height
          renderCanvas()
        }
      }

      resizeCanvas()
      window.addEventListener("resize", resizeCanvas)

      return () => {
        window.removeEventListener("resize", resizeCanvas)
      }
    }
  }, [canvasRef.current])

  // Toggle between SVG and Canvas rendering
  useEffect(() => {
    if (useCanvas) {
      // Set up canvas zoom
      if (canvasRef.current) {
        const canvas = canvasRef.current

        const zoom = d3
          .zoom<HTMLCanvasElement, unknown>()
          .scaleExtent([0.1, 4])
          .on("zoom", (event) => {
            currentTransformRef.current = event.transform
            renderCanvas()
          })

        d3.select(canvas).call(zoom)

        // Apply the stored transform if it exists
        if (currentTransformRef.current) {
          d3.select(canvas).call(zoom.transform, currentTransformRef.current)
        }

        // Add right-click rotation handlers
        canvas.oncontextmenu = (event) => {
          event.preventDefault()
        }

        canvas.onmousedown = (event) => {
          if (event.button === 2) {
            event.preventDefault()
            const canvasBounds = canvas.getBoundingClientRect()

            // Calculate center of the canvas
            const centerX = canvasBounds.width / 2
            const centerY = canvasBounds.height / 2

            // Store starting position and current rotation
            rotationRef.current = {
              startAngle: rotationAngle,
              startX: event.clientX - canvasBounds.left,
              startY: event.clientY - canvasBounds.top,
              isDragging: true,
            }
          }
        }

        canvas.onmousemove = (event) => {
          if (rotationRef.current.isDragging) {
            event.preventDefault()
            const canvasBounds = canvas.getBoundingClientRect()

            // Calculate center of the canvas
            const centerX = canvasBounds.width / 2
            const centerY = canvasBounds.height / 2

            // Calculate starting angle from center to start point
            const startDx = rotationRef.current.startX - centerX
            const startDy = rotationRef.current.startY - centerY
            const startAngleRad = Math.atan2(startDy, startDx)

            // Calculate current angle from center to current point
            const currentX = event.clientX - canvasBounds.left
            const currentY = event.clientY - canvasBounds.top
            const currentDx = currentX - centerX
            const currentDy = currentY - centerY
            const currentAngleRad = Math.atan2(currentDy, currentDx)

            // Calculate the difference in angles and convert to degrees
            const angleDiff = (currentAngleRad - startAngleRad) * (180 / Math.PI)

            // Update the rotation angle
            const newRotationAngle = rotationRef.current.startAngle + angleDiff
            setRotationAngle(newRotationAngle)

            // Render with new rotation
            renderCanvas()
          }
        }

        canvas.onmouseup = (event) => {
          if (event.button === 2) {
            rotationRef.current.isDragging = false
          }
        }

        canvas.onmouseleave = () => {
          rotationRef.current.isDragging = false
        }

        // Store zoom reference for external controls
        zoomRef.current = zoom
      }

      // Initial render
      renderCanvas()
    }
  }, [useCanvas, nodes, links, currentDay, rotationAngle])

  // Render force-directed graph with SVG
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0 || useCanvas) return

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Clear previous content
    svg.selectAll("*").remove()

    // Create a group for the graph that will be transformed by zoom
    const g = svg.append("g")

    // Initialize zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
        // Store the current transform for use in future renders
        currentTransformRef.current = event.transform
      })

    // Store zoom reference for external controls
    zoomRef.current = zoom

    // Apply zoom to SVG and set initial transform if one exists
    svg.call(zoom)

    // Apply the stored transform if it exists
    if (currentTransformRef.current) {
      svg.call(zoom.transform, currentTransformRef.current)
    }

    // Add right-click rotation handlers
    svg.on("contextmenu", (event) => {
      event.preventDefault() // Prevent the context menu from appearing
    })

    svg.on("mousedown", (event) => {
      if (event.button === 2) {
        // Right mouse button
        event.preventDefault()
        const svgBounds = svgRef.current?.getBoundingClientRect()
        if (!svgBounds) return

        // Calculate center of the SVG
        const centerX = svgBounds.width / 2
        const centerY = svgBounds.height / 2

        // Store starting position and current rotation
        rotationRef.current = {
          startAngle: rotationAngle,
          startX: event.clientX - svgBounds.left,
          startY: event.clientY - svgBounds.top,
          isDragging: true,
        }

        // Apply the current rotation to the group
        g.style("transform-origin", "center center").style("transform", `rotate(${rotationAngle}deg)`)
      }
    })

    svg.on("mousemove", (event) => {
      if (rotationRef.current.isDragging) {
        event.preventDefault()
        const svgBounds = svgRef.current?.getBoundingClientRect()
        if (!svgBounds) return

        // Calculate center of the SVG
        const centerX = svgBounds.width / 2
        const centerY = svgBounds.height / 2

        // Calculate starting angle from center to start point
        const startDx = rotationRef.current.startX - centerX
        const startDy = rotationRef.current.startY - centerY
        const startAngleRad = Math.atan2(startDy, startDx)

        // Calculate current angle from center to current point
        const currentX = event.clientX - svgBounds.left
        const currentY = event.clientY - svgBounds.top
        const currentDx = currentX - centerX
        const currentDy = currentY - centerY
        const currentAngleRad = Math.atan2(currentDy, currentDx)

        // Calculate the difference in angles and convert to degrees
        const angleDiff = (currentAngleRad - startAngleRad) * (180 / Math.PI)

        // Update the rotation angle
        const newRotationAngle = rotationRef.current.startAngle + angleDiff
        setRotationAngle(newRotationAngle)

        // Apply the rotation to the group
        g.style("transform-origin", "center center").style("transform", `rotate(${newRotationAngle}deg)`)
      }
    })

    svg.on("mouseup", (event) => {
      if (event.button === 2) {
        rotationRef.current.isDragging = false
      }
    })

    svg.on("mouseleave", () => {
      rotationRef.current.isDragging = false
    })

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(50),
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(10))
      .alphaDecay(0.01) // Slower decay for more stable layout

    // Store simulation reference
    simulationRef2.current = simulation

    // Create links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d: any) => {
        // Color links based on day to show progression and active status
        if (!d.active) return "#616083" // Inactive links (connected to deceased nodes)
        if (d.day === 1) return "#616083"
        return d.day <= currentDay ? "#FF5555" : "transparent"
      })
      .attr("stroke-opacity", (d: any) => {
        if (!d.active) return 0.1 // Faded for inactive links
        return d.day === 1 ? 0.3 : 0.6
      })
      .attr("stroke-width", (d: any) => {
        if (!d.active) return 0.5 // Thinner for inactive links
        return d.day === 1 ? 1 : 2
      })
      .attr("stroke-dasharray", (d: any) => (!d.active ? "3,3" : "none")) // Dashed line for inactive links

    // Create nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("fill", (d: any) => {
        if (d.status === "susceptible") return "#3B82F6" // Blue
        if (d.status === "exposed") return "#FF81FF" // Pink
        if (d.status === "infectious") return "#FF5555" // Red
        if (d.status === "recovered") return "#51FAAA" // Green
        if (d.status === "deceased") return "#A855F7" // Purple
        return "#3B82F6" // Default to blue
      })
      .call(d3.drag<SVGCircleElement, any>().on("start", dragstarted).on("drag", dragged).on("end", dragended))

    // Add tooltips
    node.append("title").text((d: any) => `Node ${d.id}: ${d.status}`)

    // Update positions on simulation tick with throttling
    const throttledTick = throttle(() => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y)
    }, 50) // Throttle to 20fps

    simulation.on("tick", throttledTick)

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [nodes, links, currentDay, rotationAngle, useCanvas])

  // Zoom controls
  const handleZoomIn = () => {
    if (useCanvas && canvasRef.current && zoomRef.current) {
      d3.select(canvasRef.current).transition().call(zoomRef.current.scaleBy, 1.5)
      renderCanvas()
    } else if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.5)
    }
  }

  const handleZoomOut = () => {
    if (useCanvas && canvasRef.current && zoomRef.current) {
      d3.select(canvasRef.current).transition().call(zoomRef.current.scaleBy, 0.75)
      renderCanvas()
    } else if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.75)
    }
  }

  const handleResetZoom = () => {
    if (useCanvas && canvasRef.current && zoomRef.current) {
      d3.select(canvasRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity)
      currentTransformRef.current = d3.zoomIdentity
      renderCanvas()
    } else if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity)
      currentTransformRef.current = d3.zoomIdentity
    }
  }

  // Format percentage for display
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <GlassCard className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Network Graph (SEIRD Model)</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#616083]">High Performance Mode</span>
                <Switch checked={useCanvas} onCheckedChange={setUseCanvas} id="canvas-mode" />
                <Layers className="h-4 w-4 text-[#616083]" />
              </div>

              {simulationComplete && (
                <div className="flex items-center text-[#51FAAA] bg-[#51FAAA]/10 px-3 py-1 rounded-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Simulation Complete</span>
                </div>
              )}
            </div>
          </div>

          {yearLimitReached && (
            <Alert className="mb-4 bg-[#FF5555]/10 border-[#FF5555]/30">
              <AlertCircle className="h-4 w-4 text-[#FF5555]" />
              <AlertTitle className="text-[#FF5555]">Time Limit Reached</AlertTitle>
              <AlertDescription className="text-[#FF5555]/80">
                One year (365 days) has passed. Simulation has ended.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-[#211F36]/50 overflow-hidden relative" ref={containerRef}>
            {/* Graph visualization */}
            <div className="h-[500px] relative">
              {!useCanvas && <svg ref={svgRef} width="100%" height="100%"></svg>}
              {useCanvas && <canvas ref={canvasRef} width="100%" height="100%" className="absolute inset-0"></canvas>}

              {/* Zoom controls */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-8 h-8 p-0 bg-[#211F36]/80 border border-[#616083]/30"
                  onClick={handleZoomIn}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-8 h-8 p-0 bg-[#211F36]/80 border border-[#616083]/30"
                  onClick={handleZoomOut}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-8 h-8 p-0 bg-[#211F36]/80 border border-[#616083]/30"
                  onClick={handleResetZoom}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Legend */}
              <div className="absolute top-4 left-4 bg-[#211F36]/80 border border-[#616083]/30 rounded-md p-2">
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6] mr-2"></div>
                    <span className="text-xs text-[#616083]">Susceptible</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#FF81FF] mr-2"></div>
                    <span className="text-xs text-[#616083]">Exposed</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#FF5555] mr-2"></div>
                    <span className="text-xs text-[#616083]">Infectious</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#51FAAA] mr-2"></div>
                    <span className="text-xs text-[#616083]">Recovered</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#A855F7] mr-2"></div>
                    <span className="text-xs text-[#616083]">Deceased</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-6 gap-2 p-4 border-t border-[#616083]/20">
              <div className="flex items-center p-2 bg-[#211F36]/50 rounded-md">
                <div className="h-8 w-8 rounded-full bg-[#616083]/20 flex items-center justify-center mr-2">
                  <RefreshCw className="h-4 w-4 text-[#616083]" />
                </div>
                <div>
                  <div className="text-xs text-[#616083]">Day</div>
                  <div className="text-sm font-bold">{currentDay}</div>
                </div>
              </div>

              <div className="flex items-center p-2 bg-[#211F36]/50 rounded-md">
                <div className="h-8 w-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center mr-2">
                  <Users className="h-4 w-4 text-[#3B82F6]" />
                </div>
                <div>
                  <div className="text-xs text-[#616083]">Susceptible</div>
                  <div className="text-sm font-bold">{stats.susceptible}</div>
                </div>
              </div>

              <div className="flex items-center p-2 bg-[#211F36]/50 rounded-md">
                <div className="h-8 w-8 rounded-full bg-[#FF81FF]/20 flex items-center justify-center mr-2">
                  <Virus className="h-4 w-4 text-[#FF81FF]" />
                </div>
                <div>
                  <div className="text-xs text-[#616083]">Exposed</div>
                  <div className="text-sm font-bold">{stats.exposed}</div>
                </div>
              </div>

              <div className="flex items-center p-2 bg-[#211F36]/50 rounded-md">
                <div className="h-8 w-8 rounded-full bg-[#FF5555]/20 flex items-center justify-center mr-2">
                  <Activity className="h-4 w-4 text-[#FF5555]" />
                </div>
                <div>
                  <div className="text-xs text-[#616083]">Infectious</div>
                  <div className="text-sm font-bold">{stats.infectious}</div>
                </div>
              </div>

              <div className="flex items-center p-2 bg-[#211F36]/50 rounded-md">
                <div className="h-8 w-8 rounded-full bg-[#51FAAA]/20 flex items-center justify-center mr-2">
                  <Activity className="h-4 w-4 text-[#51FAAA]" />
                </div>
                <div>
                  <div className="text-xs text-[#616083]">Recovered</div>
                  <div className="text-sm font-bold">{stats.recovered}</div>
                </div>
              </div>

              <div className="flex items-center p-2 bg-[#211F36]/50 rounded-md">
                <div className="h-8 w-8 rounded-full bg-[#A855F7]/20 flex items-center justify-center mr-2">
                  <Skull className="h-4 w-4 text-[#A855F7]" />
                </div>
                <div>
                  <div className="text-xs text-[#616083]">Deceased</div>
                  <div className="text-sm font-bold">{stats.deceased}</div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="flex flex-col">
            <h3 className="text-lg font-medium mb-4">Simulation Controls</h3>

            <div className="space-y-6 flex-grow">
              {/* Simulation control buttons in a single row */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#616083]/30 hover:border-[#616083]/60"
                  onClick={stepBackward}
                  disabled={historyIndex <= 0 || isSimulating}
                >
                  <StepBack className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant={isSimulating ? "destructive" : "default"}
                  className={`${isSimulating ? "" : "bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] text-[#0C0E1D]"}`}
                  onClick={toggleSimulation}
                  disabled={simulationComplete}
                >
                  {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#616083]/30 hover:border-[#616083]/60"
                  onClick={simulationStep}
                  disabled={simulationComplete || isSimulating}
                >
                  <StepForward className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#616083]/30 hover:border-[#616083]/60"
                  onClick={generateNetwork}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-center text-sm">
                {isSimulating ? (
                  <span className="text-[#FF5555]">Simulating...</span>
                ) : simulationComplete ? (
                  <span className="text-[#51FAAA]">Simulation Complete</span>
                ) : (
                  <span className="text-[#616083]">{historyIndex > 0 ? "Paused" : "Ready to start"}</span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-[#616083]">Simulation Speed</label>
                  <span className="text-sm font-medium">
                    {simulationSpeed > 1500 ? "Slow" : simulationSpeed > 750 ? "Normal" : "Fast"}
                  </span>
                </div>
                <Slider
                  value={[2000 - simulationSpeed]}
                  min={250}
                  max={1750}
                  step={250}
                  onValueChange={handleSpeedChange}
                />
                <p className="text-xs text-[#616083] mt-1">Move slider right for faster simulation, left for slower.</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col">
            <h3 className="text-lg font-medium mb-4">Simulation Parameters</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">Population Size:</span>
                <span className="text-sm font-medium">{simulationParams.populationSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">Initial Infected:</span>
                <span className="text-sm font-medium">{simulationParams.initialInfected}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">R₀ Value:</span>
                <span className="text-sm font-medium">{simulationParams.r0.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">Incubation Period:</span>
                <span className="text-sm font-medium">{simulationParams.incubationPeriod} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">Infectious Period:</span>
                <span className="text-sm font-medium">{simulationParams.infectiousPeriod} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">Recovery Rate:</span>
                <span className="text-sm font-medium">{formatPercentage(simulationParams.recoveryRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">Social Distancing:</span>
                <span className="text-sm font-medium">
                  {formatPercentage(simulationParams.advanced.socialDistancing)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">Vaccination Rate:</span>
                <span className="text-sm font-medium">
                  {formatPercentage(simulationParams.advanced.vaccinationRate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#616083]">Infectious Mortality Rate:</span>
                <span className="text-sm font-medium">
                  {formatPercentage(simulationParams.advanced.infectiousMortalityRate)}
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-[#616083]/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[#FF81FF]">Population Mortality Rate:</span>
                  <span className="text-sm font-bold text-[#FF81FF]">{formatPercentage(populationMortalityRate)}</span>
                </div>
                <p className="text-xs text-[#616083] mt-1">
                  Calculated based on R₀, social distancing, vaccination rate, and infectious mortality rate.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
