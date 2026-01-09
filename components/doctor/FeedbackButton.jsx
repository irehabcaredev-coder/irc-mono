'use client'

import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import FeedbackModal from './FeedbackModal'

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-blue text-white rounded-full shadow-lg hover:bg-primary-blue/90 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
        aria-label="Send Feedback"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Feedback Modal */}
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
