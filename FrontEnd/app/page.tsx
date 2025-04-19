"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { Send, Sparkles, ArrowLeft, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import ChatMessage from "@/components/chat-message"
import DiseaseCarousel from "@/components/disease-carousel"
import ClinicalTrialCard from "@/components/clinical-trial-card"
import MedicalRecordUploader from "@/components/medical-record-uploader"

// Conversation stages
type ConversationStage = "initial" | "asking_symptoms" | "asking_history" | "analyzing" | "results" | "followup"

// API response type
interface ApiResponse {
  answer: string
  clinical_trials?: Array<{
    title: string
    condition: string
    intervention: string
    eligibility: string
  }>
}

// Clinical trial type
interface ClinicalTrial {
  title: string
  condition: string
  intervention: string
  eligibility: string
}

export default function HomePage() {
  const [messages, setMessages] = useState<Array<{ id: number; text: string; sender: "user" | "bot" }>>([])
  const [newMessage, setNewMessage] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationStage, setConversationStage] = useState<ConversationStage>("initial")
  const [userSymptoms, setUserSymptoms] = useState("")
  const [userHistory, setUserHistory] = useState("")
  const [medicalRecords, setMedicalRecords] = useState<string>("")
  const [hasMedicalRecords, setHasMedicalRecords] = useState(false)
  const [clinicalTrials, setClinicalTrials] = useState<ApiResponse["clinical_trials"]>([])
  const [showTrials, setShowTrials] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const controls = useAnimation()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  // Animate input on focus
  const [inputFocused, setInputFocused] = useState(false)

  // Handle medical records upload
  const handleRecordsUploaded = (records: string) => {
    setMedicalRecords(records)
    setHasMedicalRecords(true)

    // If conversation has already started, notify the user that records were uploaded
    if (messages.length > 0) {
      const notificationMessage = {
        id: messages.length + 1,
        text: "✅ Medical records uploaded successfully. These will be included in the analysis and risk assessment.",
        sender: "bot" as const,
      }
      setMessages((prev) => [...prev, notificationMessage])
    }
  }

  const handleRecordsRemoved = () => {
    setMedicalRecords("")
    setHasMedicalRecords(false)

    // If conversation has already started, notify the user that records were removed
    if (messages.length > 0) {
      const notificationMessage = {
        id: messages.length + 1,
        text: "Medical records have been removed from the analysis.",
        sender: "bot" as const,
      }
      setMessages((prev) => [...prev, notificationMessage])
    }
  }

  // Handle clinical trial details view
  const handleViewTrialDetails = (trial: ClinicalTrial) => {
    // Format the trial details as a message with health records if available
    let trialDetailsMessage = `
I'm interested in this clinical trial:

**Title**: ${trial.title}
**Condition**: ${trial.condition}
**Intervention**: ${trial.intervention}
**Eligibility**: ${trial.eligibility}

What are the key factors to make this a success?`

    // Add health records context if available
    if (hasMedicalRecords && medicalRecords) {
      trialDetailsMessage += `\n\nBased on my health records below, what are my chances of success with this clinical trial?\n\n**My Health Records**:\n${medicalRecords}`
    } else {
      trialDetailsMessage += "\n\nWhat are the typical chances of success for patients in this trial?"
    }

    // Add the message to the chat as if the user sent it
    const userMessage = {
      id: messages.length + 1,
      text: trialDetailsMessage.trim(),
      sender: "user" as const,
    }
    setMessages((prev) => [...prev, userMessage])

    // Show analyzing message
    setTimeout(() => {
      const analyzingMessage = {
        id: messages.length + 2,
        text: `Analyzing the clinical trial details${hasMedicalRecords ? " with your medical records" : ""}...`,
        sender: "bot" as const,
      }
      setMessages((prev) => [...prev, analyzingMessage])

      // Make API call with the trial details and success factors question
      makeApiCall(trialDetailsMessage, "")
    }, 600)
  }

  // Start the conversation with the first question
  const startConversation = () => {
    setIsExpanded(true)
    setConversationStage("asking_symptoms")

    // Add the first question about symptoms
    const botMessage = {
      id: 1,
      text: "What are your symptoms?",
      sender: "bot" as const,
    }
    setMessages([botMessage])

    // If medical records are already uploaded, acknowledge them
    if (hasMedicalRecords) {
      setTimeout(() => {
        const recordsMessage = {
          id: 2,
          text: "I see you've uploaded your medical records. These will be considered in my analysis and risk assessment.",
          sender: "bot" as const,
        }
        setMessages((prev) => [...prev, recordsMessage])
      }, 600)
    }
  }

  const handleSendMessage = () => {
    if (newMessage.trim() === "" || isLoading) return

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: newMessage,
      sender: "user" as const,
    }
    setMessages([...messages, userMessage])

    // Process based on conversation stage
    if (conversationStage === "asking_symptoms") {
      // Store symptoms and ask for history
      setUserSymptoms(newMessage)
      setConversationStage("asking_history")

      setTimeout(() => {
        const historyQuestion = {
          id: messages.length + 2,
          text: "What is your medical history?",
          sender: "bot" as const,
        }
        setMessages((prev) => [...prev, historyQuestion])
      }, 600)
    } else if (conversationStage === "asking_history") {
      // Store history and make API call
      setUserHistory(newMessage)
      setConversationStage("analyzing")

      setTimeout(() => {
        const analyzingMessage = {
          id: messages.length + 2,
          text: `Analyzing your symptoms and medical history${hasMedicalRecords ? ", along with your uploaded records" : ""}...`,
          sender: "bot" as const,
        }
        setMessages((prev) => [...prev, analyzingMessage])

        // Make API call with symptoms and history
        makeApiCall(userSymptoms, newMessage)
      }, 600)
    } else {
      // For all subsequent messages, send them as symptoms with empty history
      setTimeout(() => {
        const analyzingMessage = {
          id: messages.length + 2,
          text: `Analyzing your new information${hasMedicalRecords ? " with your medical records" : ""}...`,
          sender: "bot" as const,
        }
        setMessages((prev) => [...prev, analyzingMessage])

        // Make API call with new message as symptoms and empty history
        makeApiCall(newMessage, "")
      }, 600)
    }

    setNewMessage("")

    // Animate the send button
    controls.start({
      scale: [1, 0.8, 1],
      transition: { duration: 0.3 },
    })
  }

  const makeApiCall = async (symptoms: string, history: string) => {
    setIsLoading(true)

    try {
      // Prepare request payload
      const payload: any = {
        symptoms: symptoms,
        history: history || "",
      }

      // Add medical records if available
      if (hasMedicalRecords && medicalRecords) {
        payload.medical_records = medicalRecords

        // Add risk assessment prompt if medical records are present
        if (!symptoms.includes("keep in mind these health parameter")) {
          payload.symptoms = `${symptoms}\n\nkeep in mind these health parameter of the patient and suggest if the patient is at risk`
        }
      }

      // Log the curl command equivalent
      console.log(`
        curl -X POST "http://localhost:8000/analyze" \\
          -H "Content-Type: application/json" \\
          -d '${JSON.stringify(payload)}'
      `)

      // Make the API call
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data: ApiResponse = await response.json()

      // Check if clinical trials exist in the response
      if (data.clinical_trials && data.clinical_trials.length > 0) {
        setClinicalTrials(data.clinical_trials)
        setShowTrials(true)
      } else {
        setClinicalTrials([])
        setShowTrials(false)
      }

      // Add the response to the chat
      const resultMessage = {
        id: messages.length + 3,
        text: data.answer,
        sender: "bot" as const,
      }

      setMessages((prev) => [...prev, resultMessage])
      setConversationStage("followup")
    } catch (error) {
      console.error("Error making API call:", error)

      // Add error message to chat
      const errorMessage = {
        id: messages.length + 3,
        text: "I'm sorry, there was an error processing your request. Please try again later.",
        sender: "bot" as const,
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiseaseSelect = (diseaseName: string) => {
    // Start the conversation if it hasn't started yet
    if (conversationStage === "initial") {
      startConversation()
    } else {
      // If conversation already started, just add a message about the disease
      const userMessage = {
        id: messages.length + 1,
        text: `I'd like to know more about ${diseaseName}`,
        sender: "user" as const,
      }
      setMessages([...messages, userMessage])
      setIsExpanded(true)

      // Make API call with the disease query
      setTimeout(() => {
        const analyzingMessage = {
          id: messages.length + 2,
          text: `Analyzing your request${hasMedicalRecords ? " with your medical records" : ""}...`,
          sender: "bot" as const,
        }
        setMessages((prev) => [...prev, analyzingMessage])

        makeApiCall(`I'd like to know more about ${diseaseName}`, "")
      }, 600)
    }
  }

  const focusInput = () => {
    inputRef.current?.focus()
    setInputFocused(true)
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 transition-all duration-500">
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <motion.div
              className="relative inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-blue-100/50 dark:bg-blue-900/20 blur-xl"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                }}
              />
              <motion.div
                className="absolute -bottom-5 -left-5 w-24 h-24 rounded-full bg-indigo-100/50 dark:bg-indigo-900/20 blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 0],
                }}
                transition={{
                  duration: 7,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                  delay: 1,
                }}
              />
              <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-slate-800 dark:text-slate-100 relative">
                Health Assistant
              </h1>
            </motion.div>
            <motion.p
              className="text-lg text-slate-600 dark:text-slate-300 max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Get personalized health insights with our chat interface
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        className={cn(
          "w-full rounded-3xl overflow-hidden transition-all duration-500",
          "neomorphic-container",
          isExpanded ? "fixed inset-0 z-50 rounded-none" : "h-auto",
        )}
        animate={{
          height: isExpanded ? "100vh" : "auto",
          width: isExpanded ? "100%" : "90%",
          maxWidth: isExpanded ? "none" : "2xl",
        }}
        transition={{ duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }}
      >
        <motion.div layout className={cn("flex flex-col", isExpanded ? "h-full" : "h-auto")}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center"
            >
              <motion.button
                onClick={() => setIsExpanded(false)}
                className={cn(
                  "neomorphic-button p-2 rounded-full transition-all duration-300 mr-4",
                  "hover:shadow-neomorphic-pressed active:shadow-neomorphic-pressed",
                  "flex items-center justify-center",
                )}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                aria-label="Back to homepage"
              >
                <ArrowLeft size={18} className="text-slate-600 dark:text-slate-300" />
              </motion.button>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Health Consultation</h2>

              {hasMedicalRecords && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-auto flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-xs"
                >
                  <FileText size={12} />
                  <span>Records Uploaded</span>
                </motion.div>
              )}
            </motion.div>
          )}

          {isExpanded && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      mass: 1,
                    }}
                    className="mb-4"
                  >
                    <ChatMessage message={message} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Display clinical trials if available and relevant */}
              {showTrials && clinicalTrials && clinicalTrials.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  className="mt-4 mb-4"
                >
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Clinical Trials</h3>
                  <div className="space-y-4">
                    {clinicalTrials.map((trial, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: { delay: index * 0.1 },
                        }}
                      >
                        <ClinicalTrialCard trial={trial} onViewDetails={handleViewTrialDetails} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center my-4"
                >
                  <motion.div
                    animate={{
                      rotate: 360,
                      transition: {
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 1.5,
                        ease: "linear",
                      },
                    }}
                  >
                    <Loader2 size={24} className="text-blue-500" />
                  </motion.div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </motion.div>
          )}

          <motion.div
            layout
            className={cn("p-4", isExpanded ? "border-t border-slate-200 dark:border-slate-700" : "py-6")}
            onClick={focusInput}
          >
            <motion.div
              className={cn(
                "flex items-center gap-3 p-3 rounded-full",
                "neomorphic-input transition-all duration-300",
                inputFocused ? "shadow-neomorphic-input-focus" : "hover:shadow-neomorphic-input-hover",
              )}
              animate={inputFocused ? { scale: 1.02 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {!isExpanded && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Sparkles size={20} className="text-slate-500 dark:text-slate-400 ml-2" />
                </motion.div>
              )}

              <MedicalRecordUploader
                onRecordsUploaded={handleRecordsUploaded}
                onRecordsRemoved={handleRecordsRemoved}
                hasRecords={hasMedicalRecords}
              />

              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={isExpanded ? "Type your message..." : "Describe your symptoms..."}
                className="flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                disabled={isLoading}
              />
              <motion.button
                onClick={handleSendMessage}
                className={cn(
                  "neomorphic-button p-3 rounded-full transition-all duration-300",
                  "hover:shadow-neomorphic-pressed active:shadow-neomorphic-pressed",
                  "flex items-center justify-center",
                  isLoading && "opacity-50 cursor-not-allowed",
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={controls}
                disabled={isLoading}
              >
                <Send size={18} className="text-slate-600 dark:text-slate-300" />
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {!isExpanded && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-10 mb-12 flex flex-wrap justify-center gap-4"
          >
            {["Start health consultation", "Check my symptoms", "Get medical advice"].map((suggestion, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  startConversation()
                }}
                className="neomorphic-pill px-4 py-2 rounded-full text-sm text-slate-700 dark:text-slate-200 transition-all duration-300 hover:shadow-neomorphic-pressed"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.6 + index * 0.1 },
                }}
              >
                {suggestion}
              </motion.button>
            ))}
          </motion.div>

          {/* Disease Carousel - only visible when not expanded */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6 text-center">
              Explore Health Conditions
            </h2>
            <DiseaseCarousel onDiseaseSelect={handleDiseaseSelect} />
          </motion.div>
        </>
      )}
    </main>
  )
}
