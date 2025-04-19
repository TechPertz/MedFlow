"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X, FileText, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface MedicalRecordUploaderProps {
  onRecordsUploaded: (records: string) => void
  onRecordsRemoved: () => void
  hasRecords: boolean
}

export default function MedicalRecordUploader({
  onRecordsUploaded,
  onRecordsRemoved,
  hasRecords,
}: MedicalRecordUploaderProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [fileName, setFileName] = useState<string>("")
  const [recordContent, setRecordContent] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setRecordContent(content)
      onRecordsUploaded(content)
    }
    reader.readAsText(file)
  }

  const handleButtonClick = () => {
    if (hasRecords) {
      setShowPreview(!showPreview)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleRemoveRecords = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFileName("")
    setRecordContent("")
    onRecordsRemoved()
    setShowPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.pdf,.doc,.docx"
        className="hidden"
        aria-label="Upload medical records"
      />

      <motion.button
        className={cn(
          "neomorphic-button rounded-full p-2 transition-all duration-300",
          "hover:shadow-neomorphic-pressed focus:outline-none",
          "flex items-center justify-center",
          hasRecords && "bg-green-50 dark:bg-green-900",
        )}
        onClick={handleButtonClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        aria-label={hasRecords ? "View uploaded medical records" : "Upload medical records"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {hasRecords ? (
          <FileText size={18} className="text-green-600 dark:text-green-400" />
        ) : (
          <Upload size={18} className="text-slate-600 dark:text-slate-300" />
        )}
      </motion.button>

      {hasRecords && isHovering && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center"
          onClick={handleRemoveRecords}
          aria-label="Remove uploaded medical records"
        >
          <X size={10} className="text-white" />
        </motion.button>
      )}

      {hasRecords && (
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute bottom-full mb-2 right-0 w-64 p-3 neomorphic-card rounded-lg z-10"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center">
                  <FileText size={14} className="mr-1 text-green-600 dark:text-green-400" />
                  {fileName}
                </h4>
                <motion.button
                  onClick={handleRemoveRecords}
                  className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  aria-label="Remove uploaded medical records"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={14} />
                </motion.button>
              </div>
              <div className="max-h-40 overflow-y-auto text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                {recordContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {hasRecords && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 bg-green-500 rounded-full w-3 h-3 flex items-center justify-center"
        >
          <Check size={8} className="text-white" />
        </motion.span>
      )}
    </div>
  )
}
