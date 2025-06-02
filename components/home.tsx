"use client"

import type React from "react"

import { useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import {
  ArrowRight,
  ChevronDown,
  WormIcon as Virus,
  Activity,
  Users,
  Network,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { NetworkAnimation } from "@/components/network-animation"
import { ParameterControl } from "@/components/parameter-control"

interface HomeProps {
  simulationStarted: boolean
  simulationComplete: boolean
  simulationStatus: string
  simulationParams: {
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
  setSimulationParams: (params: any) => void
  startSimulation: () => void
  resetSimulation: () => void
  setActiveTab: (tab: string) => void
  simParamsRef: React.RefObject<HTMLDivElement>
}

export function Home({
  simulationStarted,
  simulationComplete,
  simulationStatus,
  simulationParams,
  setSimulationParams,
  startSimulation,
  resetSimulation,
  setActiveTab,
  simParamsRef,
}: HomeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -50])

  const contentOpacity = useTransform(scrollYProgress, [0.05, 0.2], [0, 1])
  const contentY = useTransform(scrollYProgress, [0.05, 0.2], [50, 0])

  const updateParam = (key: string, value: number) => {
    setSimulationParams({
      ...simulationParams,
      [key]: value,
    })
  }

  const updateAdvancedParam = (key: string, value: number) => {
    setSimulationParams({
      ...simulationParams,
      advanced: {
        ...simulationParams.advanced,
        [key]: value,
      },
    })
  }

  return (
    <div ref={containerRef} className="relative min-h-[200vh]">
      {/* Hero Section */}
      <motion.section
        className="min-h-screen flex flex-col items-center justify-center sticky top-0 z-10 overflow-hidden"
        style={{
          opacity: heroOpacity,
          scale: heroScale,
          y: heroY,
        }}
      >
        <div className="absolute inset-0 -z-10">
          <NetworkAnimation className="w-full h-full" />
        </div>

        <div className="container mx-auto px-4 text-center z-10 max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF81FF] to-[#51FAAA]">Destreza</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl text-white max-w-2xl mx-auto mb-8"
          >
            Advanced Disease Simulation Platform
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-[#616083] max-w-2xl mx-auto mb-12"
          >
            Visualize and analyze disease spread patterns with our advanced simulation tools powered by the
            Barabasi-Albert algorithm and interactive visualizations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] text-[#0C0E1D] hover:opacity-90 px-8"
              onClick={() => {
                window.scrollTo({
                  top: window.innerHeight,
                  behavior: "smooth",
                })
              }}
            >
              Configure Simulation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 5V19M12 19L5 12M12 19L19 12"
              stroke="#616083"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </motion.section>

      {/* Content Section */}
      <motion.section
        className="relative z-20 bg-transparent"
        style={{
          opacity: contentOpacity,
          y: contentY,
        }}
      >
        <div className="container mx-auto px-4 py-16 space-y-12">
          {!simulationStarted && (
            <>
              <div ref={simParamsRef}>
                <GlassCard className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold mb-6">Simulation Parameters</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-6">
                      <ParameterControl
                        label="Population Size"
                        value={simulationParams.populationSize}
                        min={100}
                        max={2500}
                        step={100}
                        onChange={(value) => updateParam("populationSize", value)}
                        tooltipContent="The total number of individuals in the simulated population. Larger populations provide more realistic results but require more computational resources."
                        unit="agents"
                      />

                      <ParameterControl
                        label="Initial Infected"
                        value={simulationParams.initialInfected}
                        min={1}
                        max={Math.floor(simulationParams.populationSize / 2)}
                        step={1}
                        onChange={(value) => updateParam("initialInfected", value)}
                        tooltipContent="The number of infected individuals at the start of the simulation. This represents the initial outbreak size."
                        unit="agents"
                      />
                    </div>

                    <div className="space-y-6">
                      <ParameterControl
                        label="R₀ (Basic Reproduction Number)"
                        value={simulationParams.r0}
                        min={0.1}
                        max={10}
                        step={0.1}
                        onChange={(value) => updateParam("r0", value)}
                        tooltipContent="The average number of secondary infections produced by a single infected individual in a completely susceptible population. Higher values indicate more contagious diseases."
                        formatValue={(value) => value.toFixed(1)}
                      />

                      <ParameterControl
                        label="Recovery Rate"
                        value={simulationParams.recoveryRate}
                        min={0.01}
                        max={0.5}
                        step={0.01}
                        onChange={(value) => updateParam("recoveryRate", value)}
                        tooltipContent="The probability that an infected individual will recover during each time step. Higher values indicate faster recovery."
                        formatValue={(value) => `${(value * 100).toFixed(0)}%`}
                      />
                    </div>
                  </div>

                  <Collapsible className="w-full" open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Advanced Parameters</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-9 p-0"
                        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                        aria-expanded={isAdvancedOpen}
                        aria-controls="advanced-parameters-content"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${isAdvancedOpen ? "rotate-180" : ""}`}
                        />
                        <span className="sr-only">Toggle Advanced Parameters</span>
                      </Button>
                    </div>

                    <CollapsibleContent id="advanced-parameters-content" className="space-y-4 pb-6 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ParameterControl
                          label="Incubation Period"
                          value={simulationParams.incubationPeriod}
                          min={1}
                          max={30}
                          step={1}
                          onChange={(value) => updateParam("incubationPeriod", value)}
                          tooltipContent="The time between exposure to the pathogen and the onset of symptoms. During this period, individuals may be infected but not yet infectious."
                          unit="days"
                        />

                        <ParameterControl
                          label="Infectious Period"
                          value={simulationParams.infectiousPeriod}
                          min={1}
                          max={30}
                          step={1}
                          onChange={(value) => updateParam("infectiousPeriod", value)}
                          tooltipContent="The duration during which an infected individual can transmit the disease to others. Longer periods increase the potential for spread."
                          unit="days"
                        />

                        <ParameterControl
                          label="Vaccination Rate"
                          value={simulationParams.advanced.vaccinationRate}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(value) => updateAdvancedParam("vaccinationRate", value)}
                          tooltipContent="The proportion of the population that is vaccinated against the disease. Higher vaccination rates provide greater herd immunity."
                          formatValue={(value) => `${(value * 100).toFixed(0)}%`}
                        />

                        <ParameterControl
                          label="Social Distancing"
                          value={simulationParams.advanced.socialDistancing}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(value) => updateAdvancedParam("socialDistancing", value)}
                          tooltipContent="The degree to which individuals reduce their social contacts. Higher values represent stricter social distancing measures, reducing disease transmission."
                          formatValue={(value) => `${(value * 100).toFixed(0)}%`}
                        />

                        <ParameterControl
                          label="Infectious Mortality Rate"
                          value={simulationParams.advanced.infectiousMortalityRate}
                          min={0.001}
                          max={0.1}
                          step={0.001}
                          onChange={(value) => updateAdvancedParam("infectiousMortalityRate", value)}
                          tooltipContent="The base probability that an infectious individual will die from the disease. This is modified by other factors like vaccination rate and social distancing."
                          formatValue={(value) => `${(value * 100).toFixed(3)}%`}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="mt-8 flex justify-center">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] text-[#0C0E1D] hover:opacity-90 px-8 py-6"
                      onClick={startSimulation}
                    >
                      Start Simulation
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </GlassCard>
              </div>

              <GlassCard className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">About Destreza</h2>
                <p className="text-[#616083] mb-6">
                  Destreza is a state-of-the-art disease simulation platform that allows researchers, policymakers, and
                  students to model the spread of infectious diseases through populations. Using advanced network
                  algorithms and epidemiological models, Destreza provides realistic visualizations and statistical
                  analysis of disease progression.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-[#FF81FF] to-[#51FAAA]/50 flex items-center justify-center mb-4">
                      <Virus className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Pathogen Modeling</h3>
                    <p className="text-sm text-[#616083]">
                      Customize pathogen parameters including transmission rate, incubation period, and virulence
                      factors.
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-[#FF81FF]/50 to-[#51FAAA] flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Network Simulation</h3>
                    <p className="text-sm text-[#616083]">
                      Generate synthetic social networks using the Barabasi-Albert algorithm to model realistic human
                      interactions.
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-[#51FAAA]/50 to-[#FF81FF]/50 flex items-center justify-center mb-4">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Real-time Analytics</h3>
                    <p className="text-sm text-[#616083]">
                      Track infection rates, recovery patterns, and intervention effectiveness with interactive charts
                      and visualizations.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </>
          )}

          {simulationStarted && (
            <GlassCard className="max-w-2xl mx-auto">
              {!simulationComplete ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-24 h-24 rounded-full bg-[#211F36] flex items-center justify-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] animate-pulse"></div>
                  </div>

                  <h2 className="text-2xl font-bold mb-6">Simulation in Progress</h2>

                  <div className="w-full max-w-md space-y-4 mb-8">
                    {[
                      { id: "initialize", label: "Initializing simulation" },
                      { id: "map", label: "Downloading map data" },
                      { id: "agents", label: "Generating agents" },
                      { id: "parameters", label: "Configuring disease parameters" },
                      { id: "running", label: "Running simulation" },
                    ].map((step, index) => {
                      // Determine step status based on current simulation status
                      let isActive = false
                      let isCompleted = false

                      if (simulationStatus.includes("Initializing")) {
                        isActive = index === 0
                        isCompleted = false
                      } else if (simulationStatus.includes("Downloading map")) {
                        isActive = index === 1
                        isCompleted = index < 1
                      } else if (simulationStatus.includes("Generating agents")) {
                        isActive = index === 2
                        isCompleted = index < 2
                      } else if (simulationStatus.includes("Configuring disease")) {
                        isActive = index === 3
                        isCompleted = index < 3
                      } else if (simulationStatus.includes("Running")) {
                        isActive = index === 4
                        isCompleted = index < 4
                      }

                      return (
                        <motion.div
                          key={step.id}
                          className="flex items-center"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{
                            opacity: isActive || isCompleted ? 1 : 0.5,
                            y: 0,
                          }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          {isCompleted ? (
                            <div className="h-5 w-5 text-[#51FAAA] mr-3">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="M20 6L9 17L4 12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          ) : isActive ? (
                            <div className="h-5 w-5 text-[#FF81FF] mr-3 animate-spin">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-full border border-[#616083]/50 mr-3" />
                          )}
                          <span className={isActive || isCompleted ? "text-white" : "text-[#616083]"}>
                            {step.label}
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>

                  <div className="w-full max-w-md bg-[#211F36]/50 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#FF81FF] to-[#51FAAA]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 6 }}
                    />
                  </div>
                </div>
              ) : (
                <motion.div
                  className="flex flex-col items-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-16 h-16 rounded-full bg-[#51FAAA]/20 flex items-center justify-center mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M20 6L9 17L4 12"
                        stroke="#51FAAA"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <h2 className="text-2xl font-bold mb-2">Your Simulation is Ready!</h2>
                  <p className="text-[#616083] mb-8 text-center max-w-md">
                    The disease simulation has completed successfully. You can now explore the results through the
                    network graph visualization or statistical analysis.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg mb-6">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[#FF81FF] to-[#51FAAA] text-[#0C0E1D] hover:opacity-90 h-auto py-6"
                      onClick={() => setActiveTab("graph")}
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
                      onClick={() => setActiveTab("stats")}
                    >
                      <div className="flex flex-col items-center">
                        <BarChart3 className="h-6 w-6 mb-2" />
                        <span className="font-medium">Analyze Statistics</span>
                        <span className="text-xs opacity-80 mt-1">Explore data and charts</span>
                      </div>
                    </Button>
                  </div>

                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-[#211F36] border border-[#616083]/30 hover:border-[#616083]/60 h-auto py-4 px-6 w-full max-w-lg"
                    onClick={resetSimulation}
                  >
                    <div className="flex items-center">
                      <RefreshCw className="h-5 w-5 mr-2" />
                      <span className="font-medium">Generate New Simulation</span>
                    </div>
                  </Button>
                </motion.div>
              )}
            </GlassCard>
          )}
        </div>
      </motion.section>
    </div>
  )
}
