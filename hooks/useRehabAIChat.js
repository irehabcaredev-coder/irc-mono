'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAIChatStore } from '@/store/useAIChatStore'
import { usePatientStore } from '@/store/usePatientStore'
import {
  createSession,
  deleteSession,
  sendChatMessage,
  getChatHistory,
  getChatMessages,
  streamResponse,
} from '@/lib/rehabAIClient'

export function useRehabAIChat() {
  const queryClient = useQueryClient()
  const abortControllerRef = useRef(null)
  const prevIsAuthedRef = useRef(null)
  // In-flight session promise — ensures only one createSession is ever in-flight
  const sessionPromiseRef = useRef(null)
  // Guard against React StrictMode double-effect
  const initGuardRef = useRef(false)

  // Get auth state from patient store
  const isAuthed = usePatientStore((state) => state.isAuthed)

  // Get AI chat state
  const {
    sessionId,
    authAtCreation,
    sessionState,
    currentChatId,
    messages,
    isStreaming,
    isLoadingMessages,
    error,
    chatHistory: cachedChatHistory,
    setSessionMeta,
    setSessionState,
    setChatHistory,
    setCurrentChatId,
    setMessages,
    addMessage,
    appendToLastMessage,
    updateLastMessage,
    setStreaming,
    setLoadingMessages,
    setError,
    clearError,
    clearSession,
    startNewChat,
  } = useAIChatStore()

  // Derived booleans
  const isSessionLoading = sessionState === 'loading'
  const sessionReady = sessionState === 'ready' && !!sessionId

  // Helper: create a fresh session and store it (deduped via sessionPromiseRef)
  const createAndStoreSession = useCallback(async () => {
    // If a session creation is already in-flight, reuse that promise
    if (sessionPromiseRef.current) {
      console.info('[Session] Dedup — reusing in-flight session promise')
      return sessionPromiseRef.current
    }

    const promise = (async () => {
      try {
        const response = await createSession()
        setSessionMeta(
          response.session_id,
          isAuthed,
          response.user_type,
          response.reference_type
        )
        return response.session_id
      } finally {
        sessionPromiseRef.current = null
      }
    })()

    sessionPromiseRef.current = promise
    return promise
  }, [isAuthed, setSessionMeta])

  // ── Retry session init (exposed to UI) ──
  const retrySession = useCallback(async () => {
    const oldId = useAIChatStore.getState().sessionId
    clearSession()
    setSessionState('loading')
    clearError()

    // Best-effort cleanup of the old backend session
    if (oldId) {
      deleteSession(oldId).catch((e) =>
        console.warn('[Session] Failed to delete old session during retry:', e)
      )
    }

    try {
      await createAndStoreSession()
      startNewChat()
    } catch (err) {
      console.error('[Session] Retry failed:', err)
      setError(
        err.errorCode === 'AUTH_MISMATCH'
          ? err.message
          : 'Failed to initialize chat session. Please try again.'
      )
    }
  }, [clearSession, setSessionState, clearError, createAndStoreSession, startNewChat, setError])

  // ── Unified session lifecycle effect ──
  // Handles both initial mount and auth-state changes in a single effect,
  // eliminating the race between two separate effects.
  useEffect(() => {
    const isFirstRender = prevIsAuthedRef.current === null
    const authChanged = !isFirstRender && prevIsAuthedRef.current !== isAuthed
    prevIsAuthedRef.current = isAuthed

    // Determine if we need a new session
    const needsNewSession =
      !sessionId ||                      // No session at all
      authAtCreation !== isAuthed ||      // Auth state doesn't match session
      authChanged                        // Auth just changed this render

    if (!needsNewSession) {
      // If we already have a valid session, make sure state is ready
      if (sessionId && sessionState === 'idle') {
        setSessionState('ready')
      }
      return
    }

    // StrictMode guard: skip duplicate mount effect
    if (isFirstRender) {
      if (initGuardRef.current) {
        console.info('[Session] Dedup — skipping StrictMode duplicate init')
        return
      }
      initGuardRef.current = true
    }

    async function ensureSession() {
      if (sessionId) {
        console.info('[Session] Clearing stale session — auth mismatch or change', {
          sessionId,
          authAtCreation,
          currentAuth: isAuthed,
          authChanged,
        })
        // Best-effort cleanup of the old backend session
        deleteSession(sessionId).catch((e) =>
          console.warn('[Session] Failed to delete stale session:', e)
        )
        clearSession()
      }

      setSessionState('loading')

      try {
        await createAndStoreSession()
        startNewChat()
      } catch (err) {
        console.error('[Session] Failed to create session:', err)
        setError(
          err.errorCode === 'AUTH_MISMATCH'
            ? err.message
            : err.errorCode === 'TIMEOUT'
              ? 'Chat session timed out. Please try again.'
              : 'Failed to initialize chat session. Please try again.'
        )
      }
    }

    ensureSession()

    // Cleanup: allow re-init on unmount (StrictMode remount)
    return () => {
      initGuardRef.current = false
    }
  }, [sessionId, authAtCreation, isAuthed, sessionState, setSessionState, setError, startNewChat, clearSession, createAndStoreSession])

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
    enabled: !!sessionId && sessionState === 'ready',
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })

  // Update cached chat history when data changes
  useEffect(() => {
    if (chatHistoryData?.chats) {
      setChatHistory(chatHistoryData.chats)
    }
  }, [chatHistoryData, setChatHistory])

  // Send message with streaming — includes 401 and 403 retry logic
  const sendMessage = useCallback(
    async (text, imageData = null) => {
      // Block until session is fully ready
      if (!sessionReady || isStreaming || !text.trim()) return

      clearError()

      // Determine mode based on image presence and auth
      const mode = imageData && isAuthed ? 'image_analysis' : 'chat'

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

      // Helper to process a streaming response
      const processStream = async (response) => {
        let newChatId = currentChatId
        let fullText = ''

        for await (const chunk of streamResponse(response)) {
          if (abortControllerRef.current?.signal.aborted) break

          if (chunk.chat_id && !newChatId) {
            newChatId = chunk.chat_id
            setCurrentChatId(newChatId)
          }

          if (chunk.content || chunk.text || chunk.delta) {
            const t = chunk.content || chunk.text || chunk.delta
            fullText += t
            appendToLastMessage(t)
          }

          if (chunk.message) {
            fullText = chunk.message
            updateLastMessage({ text: chunk.message })
          }
        }

        return fullText
      }

      try {
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        let activeSessionId = sessionId
        let response

        try {
          response = await sendChatMessage(
            activeSessionId,
            text.trim(),
            currentChatId,
            mode,
            imageData,
            signal
          )
        } catch (firstErr) {
          // 401 = session invalid/expired → re-init session once and retry once
          if (firstErr.status === 401) {
            console.info('[Chat] 401 received — re-initializing session and retrying once', {
              oldSessionId: activeSessionId,
            })

            try {
              activeSessionId = await createAndStoreSession()
              setCurrentChatId(null) // new session → reset chat context
              response = await sendChatMessage(
                activeSessionId,
                text.trim(),
                null, // new session → new chat
                mode,
                imageData,
                signal
              )
            } catch (retryErr) {
              console.error('[Chat] Retry after 401 also failed:', retryErr)
              updateLastMessage({
                isStreaming: false,
                text: 'Session expired. Please refresh the page and try again.',
                isError: true,
              })
              setError(retryErr.message || 'Session expired')
              setStreaming(false)
              abortControllerRef.current = null
              return
            }
            // 403 = valid session but tier/usage limit hit → show limit message (no retry)
          } else if (firstErr.status === 403) {
            console.info('[Chat] 403 received — usage/tier limit reached', {
              sessionId: activeSessionId,
              error: firstErr.message,
            })
            updateLastMessage({
              isStreaming: false,
              text: 'You have reached your chat limit. Please try again later or sign in for more access.',
              isError: true,
            })
            setError('Usage limit reached')
            setStreaming(false)
            abortControllerRef.current = null
            return
          } else {
            throw firstErr
          }
        }

        const fullText = await processStream(response)

        // Finalize message
        updateLastMessage({
          isStreaming: false,
          text: fullText || 'I apologize, but I could not generate a response. Please try again.',
        })

        // Refetch chat history to include new chat
        refetchChatHistory()
      } catch (err) {
        console.error('[Chat] Failed to send message:', err)

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
      sessionReady,
      currentChatId,
      isAuthed,
      isStreaming,
      addMessage,
      appendToLastMessage,
      updateLastMessage,
      setStreaming,
      setCurrentChatId,
      setError,
      clearError,
      refetchChatHistory,
      createAndStoreSession,
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
        console.error('[Chat] Failed to load chat:', err)
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
    sessionReady,
    sessionState,

    // Actions
    sendMessage,
    loadChat,
    startNewChat: handleStartNewChat,
    cancelStreaming,
    clearError,
    refetchChatHistory,
    retrySession,
  }
}
