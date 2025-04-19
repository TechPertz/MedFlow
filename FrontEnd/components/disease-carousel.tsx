"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useMotionValue, type PanInfo } from "framer-motion"
import { cn } from "@/lib/utils"
import DiseaseCard from "./disease-card"

// Sample disease data
const diseases = [
  {
    id: 1,
    name: "Alzheimer's Disease",
    description: "A progressive disorder causing brain cells to degenerate and die.",
  },
  {
    id: 2,
    name: "Parkinson's Disease",
    description: "A disorder of the central nervous system affecting movement and balance.",
  },
  {
    id: 3,
    name: "Type 2 Diabetes",
    description: "A chronic condition affecting how the body metabolizes glucose.",
  },
  {
    id: 4,
    name: "Hypertension",
    description: "Persistently elevated blood pressure in the arteries, a major risk factor for heart disease.",
  },
  {
    id: 5,
    name: "Asthma",
    description: "A condition causing airways to narrow, swell, and produce extra mucus.",
  },
  {
    id: 6,
    name: "Multiple Sclerosis",
    description: "A disease in which the immune system eats away at the protective covering of nerves.",
  },
  {
    id: 7,
    name: "Rheumatoid Arthritis",
    description: "An inflammatory disorder affecting the joints and sometimes multiple organs.",
  },
]

interface DiseaseCarouselProps {
  onDiseaseSelect: (diseaseName: string) => void
}

export default function DiseaseCarousel({ onDiseaseSelect }: DiseaseCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Motion value for drag
  const x = useMotionValue(0)
  const dragThreshold = 50 // Minimum drag distance to trigger slide change

  // Check if mobile on mount and when window resizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Handle drag end
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    // If dragged left (negative offset) more than threshold, go to next slide
    if (info.offset.x < -dragThreshold) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % diseases.length)
    }
    // If dragged right (positive offset) more than threshold, go to previous slide
    else if (info.offset.x > dragThreshold) {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + diseases.length) % diseases.length)
    }
  }

  // Get the visible cards with proper ordering
  const getVisibleCards = () => {
    const result = []
    const totalCards = diseases.length

    // For mobile, show fewer cards
    const visibleCount = isMobile ? 3 : 5

    for (let i = 0; i < visibleCount; i++) {
      // Calculate position relative to current (0 = current, -1 = one before, 1 = one after)
      const offset = i - Math.floor(visibleCount / 2)

      // Calculate the actual index in the array with wrapping
      const index = (currentIndex + offset + totalCards) % totalCards

      result.push({
        disease: diseases[index],
        position: offset,
      })
    }

    return result
  }

  const visibleCards = getVisibleCards()

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div ref={carouselRef} className="relative h-[300px] md:h-[320px] cursor-grab active:cursor-grabbing">
        {/* Draggable container */}
        <motion.div
          className="relative w-full h-full flex items-center justify-center"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          style={{ x }}
        >
          <AnimatePresence mode="popLayout">
            {visibleCards.map(({ disease, position }, idx) => {
              // Calculate styles based on position
              const isCenter = position === 0
              const isOffScreen = Math.abs(position) > 2

              // Z-index: center card has highest z-index
              const zIndex = 10 - Math.abs(position) * 2

              // Scale: center is largest, others get smaller
              const scale = isCenter ? 1 : 1 - Math.abs(position) * 0.1

              // Y position: center is highest, others lower
              const y = isCenter ? -15 : 0

              // X position: distribute cards horizontally
              const x = position * (isMobile ? 60 : 120)

              // Opacity: fade out cards that are further away
              const opacity = isOffScreen ? 0 : 1 - Math.abs(position) * 0.2

              return (
                <motion.div
                  key={disease.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity,
                    scale,
                    x,
                    y,
                    zIndex,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    },
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2",
                    "w-[280px] md:w-[320px]",
                    isCenter ? "pointer-events-auto" : "pointer-events-none",
                  )}
                  onClick={() => {
                    if (isCenter && !isDragging) {
                      onDiseaseSelect(disease.name)
                    }
                  }}
                >
                  <DiseaseCard disease={disease} isActive={isCenter} onCardClick={onDiseaseSelect} />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Pagination indicators */}
      <div className="flex justify-center mt-8 gap-2">
        {diseases.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              currentIndex === index ? "bg-blue-500 w-4" : "bg-slate-300 dark:bg-slate-600",
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
