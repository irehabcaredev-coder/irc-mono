'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAIChatStore } from '@/store/useAIChatStore'
import { usePatientStore } from '@/store/usePatientStore'
import {
  createSession,
  sendChatMessage,
  getChatHistory,
  getChatMessages,
  streamResponse,
} from '@/lib/rehabAIClient'

export function useRehabAIChat() {
  const queryClient = useQueryClient()
  const abortControllerRef = useRef(null)

  // Get auth state from patient store
  const isAuthed = usePatientStore((state) => state.isAuthed)

  // Get AI chat state
  const {
    sessionId,
    currentChatId,
    messages,
    isSessionLoading,
    isStreaming,
    isLoadingMessages,
    error,
    chatHistory: cachedChatHistory,
    setSessionId,
    setChatHistory,
    setCurrentChatId,
    setMessages,
    addMessage,
    appendToLastMessage,
    updateLastMessage,
    setStreaming,
    setSessionLoading,
    setLoadingMessages,
    setError,
    clearError,
    startNewChat,
  } = useAIChatStore()

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      if (sessionId) return // Already have a session

      setSessionLoading(true)
      setError(null)

      try {
        const response = await createSession(isAuthed)
        setSessionId(response.session_id)

        // Initialize with welcome message
        startNewChat()
      } catch (err) {
        console.error('[useRehabAIChat] Failed to create session:', err)
        setError('Failed to initialize chat session. Please refresh the page.')
      } finally {
        setSessionLoading(false)
      }
    }

    initSession()
  }, [sessionId, isAuthed, setSessionId, setSessionLoading, setError, startNewChat])

  // Fetch chat history with React Query
  const {
    data: chatHistoryData,
    isLoading: isChatHistoryLoading,
    refetch: refetchChatHistory,
  } = useQuery({
    queryKey: ['chatHistory', sessionId],
    queryFn: async () => {
      if (!sessionId) return { chats: [] }
      const response = await getChatHistory(sessionId)
      return response
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })

  // Update cached chat history when data changes
  useEffect(() => {
    if (chatHistoryData?.chats) {
      setChatHistory(chatHistoryData.chats)
    }
  }, [chatHistoryData, setChatHistory])

  // Send message with streaming
  const sendMessage = useCallback(
    async (text, imageData = null) => {
      if (!sessionId || !text.trim()) return

      clearError()

      // Determine mode based on image presence and auth
      const mode = imageData && isAuthed ? 'image_analysis' : 'general'

      // Add user message
      const userMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: imageData || null,
      }
      addMessage(userMessage)

      // Add placeholder AI message
      const aiMessageId = `ai-${Date.now()}`
      addMessage({
        id: aiMessageId,
        sender: 'ai',
        text: '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: true,
      })

      setStreaming(true)

      try {
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController()

        const response = await sendChatMessage(
          sessionId,
          text.trim(),
          currentChatId,
          mode,
          imageData
        )

        let newChatId = currentChatId
        let fullText = ''

        // Process streaming response
        for await (const chunk of streamResponse(response)) {
          // Check for abort
          if (abortControllerRef.current?.signal.aborted) {
            break
          }

          // Handle different chunk types
          if (chunk.chat_id && !newChatId) {
            newChatId = chunk.chat_id
            setCurrentChatId(newChatId)
          }

          if (chunk.content || chunk.text || chunk.delta) {
            const text = chunk.content || chunk.text || chunk.delta
            fullText += text
            appendToLastMessage(text)
          }

          // Handle complete message
          if (chunk.message) {
            fullText = chunk.message
            updateLastMessage({ text: chunk.message })
          }
        }

        // Finalize message
        updateLastMessage({
          isStreaming: false,
          text: fullText || 'I apologize, but I could not generate a response. Please try again.',
        })

        // Refetch chat history to include new chat
        refetchChatHistory()
      } catch (err) {
        console.error('[useRehabAIChat] Failed to send message:', err)

        // Update AI message with error
        updateLastMessage({
          isStreaming: false,
          text: 'Sorry, I encountered an error processing your request. Please try again.',
          isError: true,
        })

        setError(err.message || 'Failed to send message')
      } finally {
        setStreaming(false)
        abortControllerRef.current = null
      }
    },
    [
      sessionId,
      currentChatId,
      isAuthed,
      addMessage,
      appendToLastMessage,
      updateLastMessage,
      setStreaming,
      setCurrentChatId,
      setError,
      clearError,
      refetchChatHistory,
    ]
  )

  // Load a specific chat
  const loadChat = useCallback(
    async (chatId) => {
      if (!sessionId || !chatId) return

      setLoadingMessages(true)
      clearError()

      try {
        const response = await getChatMessages(sessionId, chatId)

        // Transform messages to our format
        const transformedMessages = response.messages.map((msg, index) => ({
          id: `${chatId}-${index}`,
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          text: msg.content,
          time: msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
        }))

        setCurrentChatId(chatId)
        setMessages(transformedMessages)
      } catch (err) {
        console.error('[useRehabAIChat] Failed to load chat:', err)
        setError('Failed to load chat messages')
      } finally {
        setLoadingMessages(false)
      }
    },
    [sessionId, setCurrentChatId, setMessages, setLoadingMessages, setError, clearError]
  )

  // Cancel streaming
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStreaming(false)
    updateLastMessage({ isStreaming: false })
  }, [setStreaming, updateLastMessage])

  // Start a new chat
  const handleStartNewChat = useCallback(() => {
    startNewChat()
  }, [startNewChat])

  return {
    // State
    sessionId,
    currentChatId,
    messages,
    chatHistory: cachedChatHistory,
    isSessionLoading,
    isStreaming,
    isLoadingMessages,
    isChatHistoryLoading,
    error,
    isAuthed,

    // Actions
    sendMessage,
    loadChat,
    startNewChat: handleStartNewChat,
    cancelStreaming,
    clearError,
    refetchChatHistory,
  }
}
