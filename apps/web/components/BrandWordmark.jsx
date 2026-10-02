'use client'

import { BRAND_NAME, TRICOLOR } from '@/lib/brand'

/**
 * BrandWordmark component - iRehabCare with Indian tricolor styling
 * Option A: Tricolor underline accent with optional chakra dot
 */
export default function BrandWordmark({ 
  size = 'lg', 
  showChakra = true,
  className = '',
  variant = 'light' // 'light' or 'dark' for text color on different backgrounds
}) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  const textSize = sizeClasses[size] || sizeClasses.lg
  const textColor = variant === 'dark' ? 'text-white' : 'text-primary-blue'

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <div className="relative inline-flex items-center">
        {/* Optional Chakra Dot */}
        {showChakra && (
          <span
            className="inline-block w-2 h-2 rounded-full mr-1"
            style={{ backgroundColor: variant === 'dark' ? TRICOLOR.white : TRICOLOR.navy }}
            aria-hidden="true"
          />
        )}
        {/* Brand Name */}
        <span className={`font-bold ${textSize} ${textColor}`}>
          {BRAND_NAME}
        </span>
      </div>
      {/* Tricolor Underline */}
      <div className="flex h-1 w-full mt-0.5">
        <div
          className="flex-1"
          style={{ backgroundColor: TRICOLOR.saffron }}
          aria-hidden="true"
        />
        <div
          className="flex-1"
          style={{ backgroundColor: TRICOLOR.white }}
          aria-hidden="true"
        />
        <div
          className="flex-1"
          style={{ backgroundColor: TRICOLOR.green }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

