"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Loader2, Network, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SimulationStep {
  id: string
  label: string
  duration: number
}

interface SimulationProgressProps {
  status: string
  isComplete: boolean
  onViewGraph: () => void
  onViewStats: () => void
}

export function SimulationProgress({ status, isComplete, onViewGraph, onViewStats }: SimulationProgressProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  const steps: SimulationStep[] = [
    { id: "initialize", label: "Initializing simulation", duration: 600 },
    { id: "map", label: "Downloading map data", duration: 1200 },
    { id: "agents", label: "Generating agents", duration: 1200 },
    { id: "parameters", label: "Configuring disease parameters", duration: 1200 },
    { id: "running", label: "Running simulation", duration: 1800 },
  ]

  useEffect(() => {
    if (isComplete) return

    let stepIndex = 0
    const advanceStep = () => {
      if (stepIndex < steps.length) {
        const step = steps[stepIndex]
        setActiveStep(stepIndex)
        setCompletedSteps((prev) => [...prev, step.id])

        stepIndex++
        if (stepIndex < steps.length) {
          setTimeout(advanceStep, steps[stepIndex - 1].duration)
        }
      }
    }

    advanceStep()
  }, [isComplete])

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {!isComplete ? (
        <>
          <div className="w-24 h-24 rounded-full bg-[#211F36] flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] animate-pulse"></div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Simulation in Progress</h2>

          <div className="w-full max-w-md space-y-4 mb-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className="flex items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: index <= activeStep ? 1 : 0.5,
                  y: 0,
                }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                {completedSteps.includes(step.id) ? (
                  <CheckCircle2 className="h-5 w-5 text-[#51FAAA] mr-3" />
                ) : index === activeStep ? (
                  <Loader2 className="h-5 w-5 text-[#FF81FF] mr-3 animate-spin" />
                ) : (
                  <div className="h-5 w-5 rounded-full border border-[#616083]/50 mr-3" />
                )}
                <span className={index <= activeStep ? "text-white" : "text-[#616083]"}>{step.label}</span>
              </motion.div>
            ))}
          </div>

          <div className="w-full max-w-md bg-[#211F36]/50 h-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FF81FF] to-[#51FAAA]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 6 }}
            />
          </div>
        </>
      ) : (
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-full bg-[#51FAAA]/20 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-8 w-8 text-[#51FAAA]" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Your Simulation is Ready!</h2>
          <p className="text-[#616083] mb-8 text-center max-w-md">
            The disease simulation has completed successfully. You can now explore the results through the network graph
            visualization or statistical analysis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] text-[#0C0E1D] hover:opacity-90 h-auto py-6"
              onClick={onViewGraph}
            >
              <div className="flex flex-col items-center">
                <Network className="h-6 w-6 mb-2" />
                <span className="font-medium">Observe Network Graph</span>
                <span className="text-xs opacity-80 mt-1">View disease spread visualization</span>
              </div>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-[#616083]/30 hover:border-[#616083]/60 h-auto py-6"
              onClick={onViewStats}
            >
              <div className="flex flex-col items-center">
                <BarChart3 className="h-6 w-6 mb-2" />
                <span className="font-medium">Analyze Statistics</span>
                <span className="text-xs opacity-80 mt-1">Explore data and charts</span>
              </div>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
