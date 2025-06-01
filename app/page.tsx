"use client"

import { useState, useRef } from "react"
import { NavBar } from "@/components/nav-bar"
import { Home } from "@/components/home"
import { ForceGraph } from "@/components/force-graph"
import { ChartsFixed } from "@/components/charts-fixed"
import { AnimatedBackground } from "@/components/animated-background"

// Define the simulation history type
interface SimulationHistory {
  day: number
  stats: {
    susceptible: number
    exposed: number
    infectious: number
    recovered: number
    deceased: number
  }
}

interface SimulationState {
  nodes: any[]
  links: any[]
  day: number
  stats: {
    susceptible: number
    exposed: number
    infectious: number
    recovered: number
    deceased: number
  }
}

export default function Page() {
  const [activeTab, setActiveTab] = useState("home")
  const [simulationStarted, setSimulationStarted] = useState(false)
  const [simulationComplete, setSimulationComplete] = useState(false)
  const [simulationStatus, setSimulationStatus] = useState("")
  const simParamsRef = useRef<HTMLDivElement>(null)
  const [simulationParams, setSimulationParams] = useState({
    populationSize: 200,
    initialInfected: 10,
    r0: 2.5,
    incubationPeriod: 5,
    infectiousPeriod: 10,
    recoveryRate: 0.05,
    advanced: {
      mobilityFactor: 0.7,
      socialDistancing: 0.0,
      maskUsage: 0.0,
      vaccinationRate: 0.0,
      infectiousMortalityRate: 0.005, // Added infectious mortality rate
    },
  })

  // Add simulation history state to track disease progression
  const [simulationHistory, setSimulationHistory] = useState<SimulationHistory[]>([])
  const [currentDay, setCurrentDay] = useState(1)
  const [simulationStateHistory, setSimulationStateHistory] = useState<SimulationState[]>([])

  // Track if charts have been generated
  const [chartsGenerated, setChartsGenerated] = useState(false)

  const startSimulation = () => {
    setSimulationStarted(true)
    setSimulationStatus("Initializing simulation...")

    // Reset simulation history
    const initialStats = {
      susceptible: simulationParams.populationSize - simulationParams.initialInfected,
      exposed: 0,
      infectious: simulationParams.initialInfected,
      recovered: 0,
      deceased: 0,
    }

    setSimulationHistory([{ day: 1, stats: initialStats }])
    setCurrentDay(1)
    setChartsGenerated(false)
    setSimulationStateHistory([])

    // Simulate the loading process with faster timing
    setTimeout(() => setSimulationStatus("Downloading map data..."), 600)
    setTimeout(() => setSimulationStatus("Generating agents..."), 1800)
    setTimeout(() => setSimulationStatus("Configuring disease parameters..."), 3000)
    setTimeout(() => setSimulationStatus("Running simulation..."), 4200)
    setTimeout(() => {
      setSimulationStatus("Simulation complete!")
      setSimulationComplete(true)
    }, 6000)
  }

  // Handle simulation completion and get the history data
  const handleSimulationComplete = (history: SimulationState[]) => {
    setSimulationStateHistory(history)

    // Convert simulation state history to the format needed for charts
    const chartHistory = history.map((state) => ({
      day: state.day,
      stats: state.stats,
    }))

    setSimulationHistory(chartHistory)
    setChartsGenerated(true)
    console.log(`Received ${history.length} days of simulation history for charts`)
  }

  // Update day counter from ForceGraph component
  const updateDayCounter = (day: number) => {
    setCurrentDay(day)
  }

  // Extract chart data for the current day
  const getCurrentDayData = () => {
    // Filter simulation history to only include data up to the current day
    return simulationHistory.filter((entry) => entry.day <= currentDay)
  }

  const resetSimulation = () => {
    setSimulationStarted(false)
    setSimulationComplete(false)
    setSimulationStatus("")
    setActiveTab("home")
    setSimulationHistory([])
    setCurrentDay(1)
    setChartsGenerated(false)
    setSimulationStateHistory([])

    // Scroll to simulation parameters section
    setTimeout(() => {
      if (simParamsRef.current) {
        simParamsRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }, 100)
  }

  const scrollToSimParams = () => {
    setActiveTab("home")
    setTimeout(() => {
      if (simParamsRef.current) {
        simParamsRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }, 100)
  }

  return (
    <main className="min-h-screen">
      <AnimatedBackground />
      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="container mx-auto px-4 py-8 overflow-hidden">
        {activeTab === "home" && (
          <Home
            simulationStarted={simulationStarted}
            simulationComplete={simulationComplete}
            simulationStatus={simulationStatus}
            simulationParams={simulationParams}
            setSimulationParams={setSimulationParams}
            startSimulation={startSimulation}
            resetSimulation={resetSimulation}
            setActiveTab={setActiveTab}
            simParamsRef={simParamsRef}
          />
        )}
        {activeTab === "graph" &&
          (simulationComplete ? (
            <ForceGraph
              simulationParams={simulationParams}
              onDayChange={updateDayCounter}
              initialDay={currentDay}
              onSimulationComplete={handleSimulationComplete}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <h2 className="text-2xl font-bold mb-4">Network Graph</h2>
              <p className="text-[#616083] mb-8 text-center max-w-md">
                Start a simulation from the Home tab to visualize the disease spread network.
              </p>
              <button
                onClick={scrollToSimParams}
                className="bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] text-[#0C0E1D] px-6 py-3 rounded-md font-medium"
              >
                Configure Simulation
              </button>
            </div>
          ))}
        {activeTab === "stats" &&
          (simulationComplete ? (
            <ChartsFixed
              simulationParams={simulationParams}
              simulationHistory={getCurrentDayData()}
              currentDay={currentDay}
              key={`charts-${currentDay}`} // Force re-render when current day changes
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <h2 className="text-2xl font-bold mb-4">Statistics</h2>
              <p className="text-[#616083] mb-8 text-center max-w-md">
                Start a simulation from the Home tab to view detailed statistics and charts.
              </p>
              <button
                onClick={scrollToSimParams}
                className="bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] text-[#0C0E1D] px-6 py-3 rounded-md font-medium"
              >
                Configure Simulation
              </button>
            </div>
          ))}
      </div>
    </main>
  )
}
