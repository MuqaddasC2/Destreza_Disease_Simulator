"use client"

import type * as React from "react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface ParameterControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  tooltipContent: React.ReactNode
  unit?: string
  className?: string
  formatValue?: (value: number) => string
}

export function ParameterControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  tooltipContent,
  unit,
  className,
  formatValue,
}: ParameterControlProps) {
  // Local state to track input value during editing
  const [inputValue, setInputValue] = useState<string>(value.toString())

  // Update local state when prop value changes
  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow free typing by updating local state
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      validateAndUpdateValue()
    }
  }

  const handleBlur = () => {
    validateAndUpdateValue()
  }

  const validateAndUpdateValue = () => {
    const newValue = Number.parseFloat(inputValue)

    // Check if the value is a valid number and within bounds
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue)
    } else {
      // Reset to current value if invalid
      setInputValue(value.toString())
    }
  }

  const displayValue = formatValue ? formatValue(value) : value.toString()

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <Label htmlFor={`param-${label}`}>{label}</Label>
        <div className="flex items-center">
          <Input
            id={`param-${label}`}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-20 h-8 bg-[#211F36]/50 border-[#616083]/30 text-right"
            style={{ appearance: "textfield" }}
          />
          {unit && <span className="text-sm text-[#616083] ml-2">{unit}</span>}
        </div>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(values) => onChange(values[0])} />
      <p className="text-xs text-[#616083] mt-1">
        {tooltipContent} (Valid range: {min} to {max})
      </p>
    </div>
  )
}
