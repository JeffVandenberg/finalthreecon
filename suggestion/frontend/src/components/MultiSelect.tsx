import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectAll = () => {
    onChange(options.map(opt => opt.value))
  }

  const clearAll = () => {
    onChange([])
  }

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder
    if (selected.length === 1) {
      return options.find(opt => opt.value === selected[0])?.label || placeholder
    }
    return `${selected.length} selected`
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <span className={selected.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {getDisplayText()}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Select All / Clear All */}
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 py-2 flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-600 hover:text-gray-700 font-medium"
            >
              Clear All
            </button>
          </div>

          {/* Options */}
          <div className="py-1">
            {options.map((option) => {
              const isSelected = selected.includes(option.value)
              return (
                <label
                  key={option.value}
                  className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(option.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    {isSelected && (
                      <Check className="absolute w-3 h-3 text-primary-600 pointer-events-none" style={{ left: '2px' }} />
                    )}
                  </div>
                  <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                </label>
              )
            })}
          </div>

          {options.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  )
}
