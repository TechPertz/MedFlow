"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

interface DiseaseCardProps {
  disease: {
    id: number
    name: string
    description: string
  }
  onCardClick?: (diseaseName: string) => void
  isActive?: boolean
}

export default function DiseaseCard({ disease, onCardClick, isActive = false }: DiseaseCardProps) {
  return (
    <motion.div
      whileHover={isActive ? { scale: 1.03 } : {}}
      whileTap={isActive ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "h-44 rounded-3xl p-6 flex flex-col relative overflow-hidden",
        "transition-all duration-300",
        isActive
          ? "bg-white/90 dark:bg-slate-800/90 shadow-lg border border-blue-100 dark:border-blue-900/30"
          : "bg-white/70 dark:bg-slate-800/70 shadow-md",
      )}
    >
      {/* Decorative accent */}
      {isActive && (
        <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-blue-100/50 dark:bg-blue-900/20" />
      )}

      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2 relative z-10">{disease.name}</h3>

      <p className="text-sm text-slate-600 dark:text-slate-300 flex-1 relative z-10 line-clamp-3">
        {disease.description}
      </p>

      {isActive && (
        <motion.div
          className="mt-4 relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button
            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation() // Prevent triggering the parent div's onClick
              if (onCardClick) {
                onCardClick(disease.name)
              }
            }}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.95 }}
          >
            Get research
            <ArrowRight size={14} />
          </motion.button>
        </motion.div>
      )}

      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-blue-500"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        />
      )}
    </motion.div>
  )
}
