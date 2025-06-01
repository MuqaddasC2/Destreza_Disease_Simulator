"use client"

import type React from "react"
import { AreaChart, BarChart, LineChart, PieChart, ResponsiveContainer } from "recharts"

interface ChartWrapperProps {
  children: React.ReactNode
  data: any[]
  type: "line" | "bar" | "area" | "pie"
  height?: number
  width?: number
}

export function ChartWrapper({ children, data, type, height = 300, width = "100%" }: ChartWrapperProps) {
  // Ensure we have dimensions for the chart to render properly
  const dimensions = {
    width: width,
    height: height,
  }

  // Select the appropriate chart component based on type
  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            {children}
          </LineChart>
        )
      case "bar":
        return (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            {children}
          </BarChart>
        )
      case "area":
        return (
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            {children}
          </AreaChart>
        )
      case "pie":
        return <PieChart>{children}</PieChart>
      default:
        return (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            {children}
          </LineChart>
        )
    }
  }

  return (
    <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
      {renderChart()}
    </ResponsiveContainer>
  )
}
