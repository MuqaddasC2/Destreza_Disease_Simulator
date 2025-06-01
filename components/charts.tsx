"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChartIcon, RefreshCw } from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  Bar,
  Area,
  Pie,
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
} from "@/components/ui/chart"

// Types for simulation data
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

interface ChartsProps {
  simulationParams: SimulationParams
  simulationHistory: SimulationHistory[]
  currentDay: number
}

export function Charts({ simulationParams, simulationHistory, currentDay }: ChartsProps) {
  const [timeRange, setTimeRange] = useState("all")
  const [filteredHistory, setFilteredHistory] = useState<SimulationHistory[]>([])

  // Calculate derived metrics
  const totalPopulation = simulationParams.populationSize
  const activeCases =
    simulationHistory.length > 0
      ? simulationHistory[simulationHistory.length - 1].stats.infectious +
        simulationHistory[simulationHistory.length - 1].stats.exposed
      : 0
  const recoveryRate =
    simulationHistory.length > 0 && totalPopulation > 0
      ? (simulationHistory[simulationHistory.length - 1].stats.recovered / totalPopulation) * 100
      : 0

  // Calculate percentage change for active cases (last 7 days or less)
  const calculatePercentChange = (metric: "infectious" | "recovered" | "deceased") => {
    if (simulationHistory.length < 2) return 0

    const current = simulationHistory[simulationHistory.length - 1].stats[metric]
    const previous =
      simulationHistory.length > 7
        ? simulationHistory[simulationHistory.length - 8].stats[metric]
        : simulationHistory[0].stats[metric]

    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  // Filter history based on selected time range
  useEffect(() => {
    if (simulationHistory.length === 0) {
      setFilteredHistory([])
      return
    }

    let filtered
    switch (timeRange) {
      case "7":
        filtered = simulationHistory.slice(-7)
        break
      case "14":
        filtered = simulationHistory.slice(-14)
        break
      case "30":
        filtered = simulationHistory.slice(-30)
        break
      case "60":
        filtered = simulationHistory.slice(-60)
        break
      case "90":
        filtered = simulationHistory.slice(-90)
        break
      case "all":
      default:
        filtered = simulationHistory
        break
    }
    setFilteredHistory(filtered)
  }, [timeRange, simulationHistory])

  // Generate age-based infection data based on simulation parameters
  const generateAgeData = () => {
    // Create realistic age-based infection rates based on R0 and other parameters
    const baseRate = simulationParams.r0 / 10
    const vaccinationImpact = 1 - simulationParams.advanced.vaccinationRate * 0.8

    return [
      { age: "0-9", infectionRate: Math.round(baseRate * 0.5 * vaccinationImpact * 10) / 10 },
      { age: "10-19", infectionRate: Math.round(baseRate * 0.8 * vaccinationImpact * 10) / 10 },
      { age: "20-29", infectionRate: Math.round(baseRate * 1.5 * vaccinationImpact * 10) / 10 },
      { age: "30-39", infectionRate: Math.round(baseRate * 1.2 * vaccinationImpact * 10) / 10 },
      { age: "40-49", infectionRate: Math.round(baseRate * 1.0 * vaccinationImpact * 10) / 10 },
      { age: "50-59", infectionRate: Math.round(baseRate * 1.8 * vaccinationImpact * 10) / 10 },
      { age: "60-69", infectionRate: Math.round(baseRate * 2.2 * vaccinationImpact * 10) / 10 },
      { age: "70-79", infectionRate: Math.round(baseRate * 2.5 * vaccinationImpact * 10) / 10 },
      { age: "80+", infectionRate: Math.round(baseRate * 3.0 * vaccinationImpact * 10) / 10 },
    ]
  }

  // Generate intervention effectiveness data based on simulation parameters
  const generateInterventionData = () => {
    // Calculate effectiveness based on simulation parameters
    const socialDistancingEffect = Math.round(simulationParams.advanced.socialDistancing * 100)
    const maskEffect = Math.round(simulationParams.advanced.maskUsage * 100)
    const vaccineEffect = Math.round(simulationParams.advanced.vaccinationRate * 75)

    // Calculate lockdown effect (hypothetical based on social distancing)
    const lockdownEffect = Math.min(95, Math.round(socialDistancingEffect * 1.5))

    // Calculate combined effect (not just sum, but with diminishing returns)
    const combinedEffect = Math.min(95, Math.round((socialDistancingEffect + maskEffect + vaccineEffect) * 0.85))

    return [
      { name: "No Intervention", effectiveness: 0 },
      { name: "Social Distancing", effectiveness: socialDistancingEffect },
      { name: "Mask Wearing", effectiveness: maskEffect },
      { name: "Vaccination", effectiveness: vaccineEffect },
      { name: "Lockdown", effectiveness: lockdownEffect },
      { name: "Combined Measures", effectiveness: combinedEffect },
    ]
  }

  // Generate current population distribution data from the latest simulation state
  const generateDistributionData = () => {
    if (simulationHistory.length === 0) {
      return [
        { category: "Susceptible", value: 100 },
        { category: "Exposed", value: 0 },
        { category: "Infectious", value: 0 },
        { category: "Recovered", value: 0 },
        { category: "Deceased", value: 0 },
      ]
    }

    const latestStats = simulationHistory[simulationHistory.length - 1].stats
    const total = totalPopulation

    return [
      { category: "Susceptible", value: Math.round((latestStats.susceptible / total) * 100) },
      { category: "Exposed", value: Math.round((latestStats.exposed / total) * 100) },
      { category: "Infectious", value: Math.round((latestStats.infectious / total) * 100) },
      { category: "Recovered", value: Math.round((latestStats.recovered / total) * 100) },
      { category: "Deceased", value: Math.round((latestStats.deceased / total) * 100) },
    ]
  }

  // Calculate total cases for the overview section
  const calculateTotalCases = () => {
    if (simulationHistory.length === 0) return 0

    const latestStats = simulationHistory[simulationHistory.length - 1].stats
    return totalPopulation - latestStats.susceptible
  }

  // Format the simulation history data for charts
  const formatTimeSeriesData = () => {
    return filteredHistory.map((entry) => ({
      day: entry.day,
      susceptible: entry.stats.susceptible,
      exposed: entry.stats.exposed,
      infectious: entry.stats.infectious,
      recovered: entry.stats.recovered,
      deceased: entry.stats.deceased,
      total: totalPopulation,
    }))
  }

  // Prepare data for charts
  const timeSeriesData = formatTimeSeriesData()
  const ageData = generateAgeData()
  const interventionData = generateInterventionData()
  const distributionData = generateDistributionData()
  const totalCases = calculateTotalCases()
  const infectiousChange = calculatePercentChange("infectious")
  const recoveredChange = calculatePercentChange("recovered")

  // Fix the chart rendering issues by ensuring proper data handling and container styling

  // 1. Add a useEffect to log chart data for debugging
  useEffect(() => {
    console.log("Chart data:", {
      timeSeriesData: timeSeriesData.length,
      ageData: ageData.length,
      interventionData: interventionData.length,
      distributionData: distributionData.length,
    })
  }, [timeSeriesData, ageData, interventionData, distributionData])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Agent States Over Time</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-sm text-[#616083] mr-2">Time Range:</span>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[100px] bg-[#211F36]/50 border-[#616083]/30">
                    <SelectValue placeholder="All days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="all">All days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-[#616083]/30 hover:border-[#616083]/60"
                onClick={() => setTimeRange(timeRange)} // Just refresh the current view
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
          <div
            className="h-[400px] rounded-lg bg-[#211F36]/50 p-4 overflow-hidden"
            style={{ minHeight: "400px", width: "100%" }}
          >
            {timeSeriesData.length > 0 ? (
              <ChartContainer
                className="h-full"
                data={timeSeriesData}
                xAxisKey="day"
                yAxisWidth={50}
                tooltip={
                  <ChartTooltip>
                    <ChartTooltipContent className="bg-[#0C0E1D] border-[#616083]/30" />
                  </ChartTooltip>
                }
              >
                <LineChart>
                  <Line name="Susceptible" dataKey="susceptible" stroke="#3B82F6" strokeWidth={2} />
                  <Line name="Exposed" dataKey="exposed" stroke="#FF81FF" strokeWidth={2} />
                  <Line name="Infectious" dataKey="infectious" stroke="#FF5555" strokeWidth={2} />
                  <Line name="Recovered" dataKey="recovered" stroke="#51FAAA" strokeWidth={2} />
                  <Line name="Deceased" dataKey="deceased" stroke="#A855F7" strokeWidth={2} strokeDasharray="3 3" />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#616083]">No simulation data available</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center mt-4 space-x-4 space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#3B82F6] mr-2"></div>
              <span className="text-sm text-[#616083]">Susceptible</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#FF81FF] mr-2"></div>
              <span className="text-sm text-[#616083]">Exposed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#FF5555] mr-2"></div>
              <span className="text-sm text-[#616083]">Infectious</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#51FAAA] mr-2"></div>
              <span className="text-sm text-[#616083]">Recovered</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#A855F7] mr-2"></div>
              <span className="text-sm text-[#616083]">Deceased</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Infection Rate by Age Group</h2>
          </div>
          <div
            className="h-[300px] rounded-lg bg-[#211F36]/50 p-4 overflow-hidden"
            style={{ minHeight: "300px", width: "100%" }}
          >
            <ChartContainer
              className="h-full"
              data={ageData}
              xAxisKey="age"
              yAxisWidth={50}
              tooltip={
                <ChartTooltip>
                  <ChartTooltipContent className="bg-[#0C0E1D] border-[#616083]/30" />
                </ChartTooltip>
              }
            >
              <BarChart>
                <Bar name="Infection Rate (%)" dataKey="infectionRate" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF81FF" />
                    <stop offset="100%" stopColor="#51FAAA" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ChartContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Intervention Effectiveness</h2>
          </div>
          <div
            className="h-[300px] rounded-lg bg-[#211F36]/50 p-4 overflow-hidden"
            style={{ minHeight: "300px", width: "100%" }}
          >
            <ChartContainer
              className="h-full"
              data={interventionData}
              xAxisKey="name"
              yAxisWidth={50}
              tooltip={
                <ChartTooltip>
                  <ChartTooltipContent className="bg-[#0C0E1D] border-[#616083]/30" />
                </ChartTooltip>
              }
            >
              <BarChart>
                <Bar
                  name="Effectiveness (%)"
                  dataKey="effectiveness"
                  fill="url(#interventionGradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="interventionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#51FAAA" />
                    <stop offset="100%" stopColor="#FF81FF" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ChartContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Current Population Distribution</h2>
          </div>
          <div
            className="h-[300px] rounded-lg bg-[#211F36]/50 p-4 overflow-hidden flex items-center justify-center"
            style={{ minHeight: "300px", width: "100%" }}
          >
            <ChartContainer
              className="h-full w-full"
              data={distributionData}
              tooltip={
                <ChartTooltip>
                  <ChartTooltipContent className="bg-[#0C0E1D] border-[#616083]/30" />
                </ChartTooltip>
              }
            >
              <PieChart>
                <Pie
                  dataKey="value"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  cornerRadius={4}
                  colors={["#3B82F6", "#FF81FF", "#FF5555", "#51FAAA", "#A855F7"]}
                />
              </PieChart>
            </ChartContainer>
          </div>
          <div className="mt-4 space-y-2">
            {distributionData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor: ["#3B82F6", "#FF81FF", "#FF5555", "#51FAAA", "#A855F7"][index % 5],
                    }}
                  ></div>
                  <span className="text-sm text-[#616083]">{item.category}</span>
                </div>
                <span className="text-sm font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <div className="flex justify-between items-center mb-4">
              <TabsList className="bg-[#211F36]/50">
                <TabsTrigger value="overview" className="data-[state=active]:bg-[#616083]/20">
                  <BarChartIcon className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="m-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#211F36]/50 rounded-lg p-4">
                  <div className="text-sm text-[#616083] mb-1">Total Cases</div>
                  <div className="text-2xl font-bold">{totalCases.toLocaleString()}</div>
                  <div
                    className={`text-xs flex items-center mt-1 ${infectiousChange < 0 ? "text-[#51FAAA]" : "text-[#FF81FF]"}`}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-1"
                    >
                      <path
                        d={infectiousChange < 0 ? "M18 15L12 9L6 15" : "M6 9L12 15L18 9"}
                        stroke={infectiousChange < 0 ? "#51FAAA" : "#FF81FF"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {Math.abs(infectiousChange).toFixed(1)}% {infectiousChange < 0 ? "decrease" : "increase"}
                  </div>
                </div>
                <div className="bg-[#211F36]/50 rounded-lg p-4">
                  <div className="text-sm text-[#616083] mb-1">Active Cases</div>
                  <div className="text-2xl font-bold">{activeCases.toLocaleString()}</div>
                  <div
                    className={`text-xs flex items-center mt-1 ${infectiousChange < 0 ? "text-[#51FAAA]" : "text-[#FF81FF]"}`}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-1"
                    >
                      <path
                        d={infectiousChange < 0 ? "M18 15L12 9L6 15" : "M6 9L12 15L18 9"}
                        stroke={infectiousChange < 0 ? "#51FAAA" : "#FF81FF"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {Math.abs(infectiousChange).toFixed(1)}% {infectiousChange < 0 ? "decrease" : "increase"}
                  </div>
                </div>
                <div className="bg-[#211F36]/50 rounded-lg p-4">
                  <div className="text-sm text-[#616083] mb-1">Recovery Rate</div>
                  <div className="text-2xl font-bold">{recoveryRate.toFixed(1)}%</div>
                  <div
                    className={`text-xs flex items-center mt-1 ${recoveredChange > 0 ? "text-[#51FAAA]" : "text-[#FF81FF]"}`}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-1"
                    >
                      <path
                        d={recoveredChange > 0 ? "M18 15L12 9L6 15" : "M6 9L12 15L18 9"}
                        stroke={recoveredChange > 0 ? "#51FAAA" : "#FF81FF"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {Math.abs(recoveredChange).toFixed(1)}% {recoveredChange > 0 ? "increase" : "decrease"}
                  </div>
                </div>
              </div>

              <div
                className="mt-4 bg-[#211F36]/50 rounded-lg p-4 h-[200px] overflow-hidden"
                style={{ minHeight: "200px", width: "100%" }}
              >
                {timeSeriesData.length > 0 ? (
                  <ChartContainer
                    className="h-full"
                    data={timeSeriesData.slice(-14)}
                    xAxisKey="day"
                    yAxisWidth={50}
                    tooltip={
                      <ChartTooltip>
                        <ChartTooltipContent className="bg-[#0C0E1D] border-[#616083]/30" />
                      </ChartTooltip>
                    }
                  >
                    <AreaChart>
                      <Area
                        name="Infectious"
                        dataKey="infectious"
                        fill="url(#areaGradient)"
                        stroke="#FF5555"
                        strokeWidth={2}
                      />
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5555" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#FF5555" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[#616083]">No simulation data available</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </GlassCard>
      </div>
    </div>
  )
}
