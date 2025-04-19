"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ClinicalTrialCardProps {
  trial: {
    title: string
    condition: string
    intervention: string
    eligibility: string
  }
  onViewDetails: (trial: {
    title: string
    condition: string
    intervention: string
    eligibility: string
  }) => void
}

export default function ClinicalTrialCard({ trial, onViewDetails }: ClinicalTrialCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn("neomorphic-card rounded-xl p-4", "transition-all duration-300")}
    >
      <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-2">{trial.title}</h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Condition</p>
          <p className="text-slate-700 dark:text-slate-300">{trial.condition}</p>
        </div>

        <div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Intervention</p>
          <p className="text-slate-700 dark:text-slate-300">{trial.intervention}</p>
        </div>

        <div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Eligibility</p>
          <p className="text-slate-700 dark:text-slate-300">{trial.eligibility}</p>
        </div>
      </div>

      <div className="mt-3 text-right">
        <motion.button
          onClick={() => onViewDetails(trial)}
          className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          View details
        </motion.button>
      </div>
    </motion.div>
  )
}
