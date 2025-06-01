"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChartIcon, RefreshCw } from "lucide-react"
import { ChartWrapper } from "@/components/ui/chart-wrapper"
import { Area, Bar, CartesianGrid, Cell, Line, Pie, Tooltip, XAxis, YAxis } from "recharts"

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

interface ChartsFixedProps {
  simulationParams: SimulationParams
  simulationHistory: SimulationHistory[]
  currentDay: number
}

export function ChartsFixed({ simulationParams, simulationHistory, currentDay }: ChartsFixedProps) {
  const [timeRange, setTimeRange] = useState("all")
  const [filteredHistory, setFilteredHistory] = useState<SimulationHistory[]>([])

  // Calculate derived metrics
  const totalPopulation = simulationParams.populationSize

  // Get the latest stats based on the current day
  const latestStats =
    simulationHistory.length > 0
      ? simulationHistory[simulationHistory.length - 1].stats
      : { susceptible: 0, exposed: 0, infectious: 0, recovered: 0, deceased: 0 }

  const activeCases = latestStats.infectious + latestStats.exposed

  const recoveryRate = totalPopulation > 0 ? (latestStats.recovered / totalPopulation) * 100 : 0

  // Calculate percentage change for active cases
  const calculatePercentChange = (metric: "infectious" | "recovered" | "deceased") => {
    if (simulationHistory.length < 2) return 0

    const current = latestStats[metric]

    // Get stats from 7 days ago or the earliest available
    const previousIndex = Math.max(0, simulationHistory.length - Math.min(8, simulationHistory.length))
    const previous = simulationHistory[previousIndex].stats[metric]

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

  // Generate age-based infection data based on simulation parameters and current stats
  const generateAgeData = () => {
    // Create realistic age-based infection rates based on current infected percentage
    const infectedPercent = totalPopulation > 0 ? (latestStats.infectious + latestStats.exposed) / totalPopulation : 0

    const baseRate = (simulationParams.r0 / 10) * infectedPercent * 10
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

  // Log data for debugging
  useEffect(() => {
    console.log("Chart data loaded for day:", currentDay, {
      historyLength: simulationHistory.length,
      filteredLength: filteredHistory.length,
      timeSeriesData: timeSeriesData.length,
    })
  }, [simulationHistory, filteredHistory, timeSeriesData, currentDay])

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0C0E1D] border border-[#616083]/30 p-2 rounded-md shadow-md">
          <p className="text-sm font-medium">{`Day ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-xs" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Colors for the charts
  const COLORS = {
    susceptible: "#3B82F6", // Blue
    exposed: "#FF81FF", // Pink
    infectious: "#FF5555", // Red
    recovered: "#51FAAA", // Green
    deceased: "#A855F7", // Purple
  }

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
          <div className="h-[400px] rounded-lg bg-[#211F36]/50 p-4 overflow-hidden">
            {timeSeriesData.length > 0 ? (
              <ChartWrapper type="line" data={timeSeriesData} height={350}>
                <CartesianGrid strokeDasharray="3 3" stroke="#616083" opacity={0.2} />
                <XAxis dataKey="day" stroke="#616083" />
                <YAxis stroke="#616083" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="susceptible" stroke={COLORS.susceptible} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="exposed" stroke={COLORS.exposed} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="infectious" stroke={COLORS.infectious} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="recovered" stroke={COLORS.recovered} strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="deceased"
                  stroke={COLORS.deceased}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                />
              </ChartWrapper>
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
          <div className="h-[300px] rounded-lg bg-[#211F36]/50 p-4 overflow-hidden">
            <ChartWrapper type="bar" data={ageData} height={250}>
              <CartesianGrid strokeDasharray="3 3" stroke="#616083" opacity={0.2} />
              <XAxis dataKey="age" stroke="#616083" />
              <YAxis stroke="#616083" />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF81FF" />
                  <stop offset="100%" stopColor="#51FAAA" />
                </linearGradient>
              </defs>
              <Bar dataKey="infectionRate" name="Infection Rate (%)" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
            </ChartWrapper>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Intervention Effectiveness</h2>
          </div>
          <div className="h-[300px] rounded-lg bg-[#211F36]/50 p-4 overflow-hidden">
            <ChartWrapper type="bar" data={interventionData} height={250}>
              <CartesianGrid strokeDasharray="3 3" stroke="#616083" opacity={0.2} />
              <XAxis dataKey="name" stroke="#616083" />
              <YAxis stroke="#616083" />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="interventionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#51FAAA" />
                  <stop offset="100%" stopColor="#FF81FF" />
                </linearGradient>
              </defs>
              <Bar
                dataKey="effectiveness"
                name="Effectiveness (%)"
                fill="url(#interventionGradient)"
                radius={[4, 4, 0, 0]}
              />
            </ChartWrapper>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Current Population Distribution</h2>
          </div>
          <div className="h-[300px] rounded-lg bg-[#211F36]/50 p-4 overflow-hidden flex items-center justify-center">
            <ChartWrapper type="pie" data={distributionData} height={250}>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={distributionData}
                dataKey="value"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {distributionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index === 0
                        ? COLORS.susceptible
                        : index === 1
                          ? COLORS.exposed
                          : index === 2
                            ? COLORS.infectious
                            : index === 3
                              ? COLORS.recovered
                              : COLORS.deceased
                    }
                  />
                ))}
              </Pie>
            </ChartWrapper>
          </div>
          <div className="mt-4 space-y-2">
            {distributionData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor: [
                        COLORS.susceptible,
                        COLORS.exposed,
                        COLORS.infectious,
                        COLORS.recovered,
                        COLORS.deceased,
                      ][index % 5],
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

              <div className="mt-4 bg-[#211F36]/50 rounded-lg p-4 h-[200px] overflow-hidden">
                {timeSeriesData.length > 0 ? (
                  <ChartWrapper type="area" data={timeSeriesData.slice(-14)} height={170}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#616083" opacity={0.2} />
                    <XAxis dataKey="day" stroke="#616083" />
                    <YAxis stroke="#616083" />
                    <Tooltip content={<CustomTooltip />} />
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF5555" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#FF5555" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="infectious"
                      name="Infectious"
                      stroke="#FF5555"
                      fill="url(#areaGradient)"
                      strokeWidth={2}
                    />
                  </ChartWrapper>
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
