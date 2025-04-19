"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

type Message = {
  id: number
  text: string
  sender: "user" | "bot"
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.sender === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          mass: 1,
        }}
        className={cn(
          "max-w-[80%] p-4 rounded-2xl",
          isUser ? "neomorphic-container-user ml-auto" : "neomorphic-container-bot mr-auto",
        )}
        whileHover={{ scale: 1.01 }}
      >
        {isUser ? (
          <p className="text-sm sm:text-base text-white">{message.text}</p>
        ) : (
          <div className="markdown-content text-sm sm:text-base text-slate-700 dark:text-slate-200">
            <ReactMarkdown
              components={{
                // Style links
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                // Style headings
                h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold my-4" />,
                h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold my-3" />,
                h3: ({ node, ...props }) => <h3 {...props} className="text-base font-bold my-2" />,
                // Style paragraphs
                p: ({ node, ...props }) => <p {...props} className="my-2" />,
                // Style lists
                ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 my-2" />,
                ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 my-2" />,
                li: ({ node, ...props }) => <li {...props} className="my-1" />,
                // Style emphasis
                em: ({ node, ...props }) => <em {...props} className="italic" />,
                // Style strong/bold
                strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        )}
      </motion.div>
    </div>
  )
}
