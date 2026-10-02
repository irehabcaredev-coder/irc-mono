'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAIChatStore } from '@/store/useAIChatStore'
import { usePatientStore } from '@/store/usePatientStore'
import {
  createSession,
  deleteSession,
  sendChatMessage,
  sendChatFileMessage,
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
    isSessionAuthed,
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
    clearSession,
    startNewChat,
  } = useAIChatStore()

  // Helper: create a fresh session and return the new session ID
  const createFreshSession = useCallback(async () => {
    setSessionLoading(true)
    setError(null)

    try {
      const response = await createSession(isAuthed)
      setSessionId(response.session_id, isAuthed)
      startNewChat()
      return response.session_id
    } catch (err) {
      console.error('[useRehabAIChat] Failed to create session:', err)
      setError('Failed to initialize chat session. Please refresh the page.')
      return null
    } finally {
      setSessionLoading(false)
    }
  }, [isAuthed, setSessionId, setSessionLoading, setError, startNewChat])

  // Initialize session on mount; reuse existing sessionId when possible.
  useEffect(() => {
    async function initSession() {
      // Auth state mismatch — delete old session on backend first
      if (sessionId && isSessionAuthed !== isAuthed) {
        console.info(
          `[useRehabAIChat] Auth state changed (session: ${isSessionAuthed ? 'authed' : 'anon'} → user: ${isAuthed ? 'authed' : 'anon'}). Deleting old session & re-creating.`
        )
        deleteSession(sessionId).catch((err) =>
          console.warn('[useRehabAIChat] Failed to delete old session:', err)
        )
        clearSession()
      }

      if (sessionId) {
        console.info('[useRehabAIChat] Reusing existing session on mount')
        if (messages.length === 0 && !currentChatId) {
          startNewChat()
        }
        return
      }

      console.info('[useRehabAIChat] Creating new session on mount')
      await createFreshSession()
    }

    initSession()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

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
    if (Array.isArray(chatHistoryData?.chats)) {
      setChatHistory(chatHistoryData.chats)
    }
  }, [chatHistoryData, setChatHistory])

  // Send message with streaming
  const sendMessage = useCallback(
    async (text, attachment = null) => {
      if (!sessionId || !text.trim()) return

      clearError()

      const isFileMode = Boolean(attachment?.file)

      // Add user message
      const userMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachment: attachment
          ? {
            name: attachment.file?.name,
            type: attachment.file?.type,
            previewUrl: attachment.previewUrl || null,
          }
          : null,
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
        // Read latest chat ID at send time to avoid stale-closure edge cases.
        const activeChatId = useAIChatStore.getState().currentChatId
        const isFirstChatRequest = !activeChatId

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController()

        // Helper to attempt sending the message
        const attemptSend = async (sid) => {
          if (isFileMode) {
            return sendChatFileMessage(sid, text.trim(), attachment.file, activeChatId, abortControllerRef.current?.signal)
          }

          return sendChatMessage(
            sid,
            text.trim(),
            activeChatId,
            'chat',
            null
          )
        }

        let response
        try {
          response = await attemptSend(sessionId)
        } catch (sendErr) {
          if (isFileMode) {
            // File endpoint: 401 = session expired → re-create and retry; 403 = usage limit hit
            if (sendErr.status === 401) {
              console.warn('[useRehabAIChat] Got 401 on file upload — session expired. Re-creating session and retrying.')
              const newSid = await createFreshSession()
              if (!newSid) throw new Error('Failed to re-create session after 401')
              response = await attemptSend(newSid)
            } else if (sendErr.status === 403) {
              throw new Error('File analysis limit reached (100 per session). Please start a new chat session.')
            } else {
              throw sendErr
            }
          } else {
            // Regular chat: 403 = session expired → re-create and retry
            if (sendErr.status === 403) {
              console.warn('[useRehabAIChat] Got 403 — session expired. Re-creating session and retrying.')
              const newSid = await createFreshSession()
              if (!newSid) throw new Error('Failed to re-create session after 403')
              response = await attemptSend(newSid)
            } else {
              throw sendErr
            }
          }
        }

        let newChatId = activeChatId
        let fullText = ''

        // Some backends return chat id in response headers instead of stream chunks.
        const headerChatId =
          response.headers.get('x-chat-id') ||
          response.headers.get('chat-id') ||
          response.headers.get('chat_id')

        if (headerChatId && !newChatId) {
          newChatId = headerChatId
          setCurrentChatId(newChatId)
        }

        if (isFileMode) {
          // API spec: response is always a streaming plain-text body.
          // X-Chat-Id header (captured above) carries the conversation ID.
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          try {
            while (true) {
              if (abortControllerRef.current?.signal.aborted) break
              const { done, value } = await reader.read()
              if (done) break
              const chunkText = decoder.decode(value, { stream: true })
              if (chunkText) {
                fullText += chunkText
                appendToLastMessage(chunkText)
              }
            }
          } finally {
            reader.releaseLock()
          }
        } else {
          // Process streaming response
          for await (const chunk of streamResponse(response)) {
            // Check for abort
            if (abortControllerRef.current?.signal.aborted) {
              break
            }

            // Handle different chunk types
            const chunkChatId = chunk.chat_id || chunk.chatId

            if (chunkChatId && !newChatId) {
              newChatId = chunkChatId
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
        }

        // Finalize message
        updateLastMessage({
          isStreaming: false,
          text: fullText || 'I apologize, but I could not generate a response. Please try again.',
        })

        if (isFirstChatRequest && response.ok) {
          refetchChatHistory()
        } else if (!isFirstChatRequest) {
          refetchChatHistory()
        }
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
      addMessage,
      appendToLastMessage,
      updateLastMessage,
      setStreaming,
      setCurrentChatId,
      setError,
      clearError,
      refetchChatHistory,
      createFreshSession,
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
        const sourceMessages = Array.isArray(response?.messages) ? response.messages : []

        // Transform backend variants into UI messages, then order oldest -> newest.
        const normalizedMessages = sourceMessages.flatMap((msg, index) => {
          const timeValue = msg.timestamp || msg.created_at || msg.updated_at || msg.time
          const timestampMs = timeValue ? new Date(timeValue).getTime() : NaN
          const formattedTime = Number.isNaN(timestampMs)
            ? ''
            : new Date(timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

          const pairMessages = []
          if (msg.user_message || msg.prompt || msg.question) {
            pairMessages.push({
              id: `${chatId}-${index}-user`,
              sender: 'user',
              text: msg.user_message || msg.prompt || msg.question || '',
              time: formattedTime,
              _ts: timestampMs,
              _seq: index * 2,
              _senderOrder: 0,
            })
          }
          if (msg.assistant_response || msg.response || msg.answer) {
            pairMessages.push({
              id: `${chatId}-${index}-ai`,
              sender: 'ai',
              text: msg.assistant_response || msg.response || msg.answer || '',
              time: formattedTime,
              _ts: timestampMs,
              _seq: index * 2 + 1,
              _senderOrder: 1,
            })
          }
          if (pairMessages.length > 0) return pairMessages

          const role = String(msg.role || msg.sender || msg.type || '').toLowerCase()
          const text = msg.content || msg.text || msg.message || ''
          const isUserRole = ['user', 'human', 'patient', 'client'].includes(role)

          return [{
            id: `${chatId}-${index}`,
            sender: isUserRole ? 'user' : 'ai',
            text,
            time: formattedTime,
            _ts: timestampMs,
            _seq: index,
            _senderOrder: isUserRole ? 0 : 1,
          }]
        })

        const hasAnyTimestamp = normalizedMessages.some((m) => !Number.isNaN(m._ts))
        let orderedMessages = [...normalizedMessages]

        if (hasAnyTimestamp) {
          orderedMessages.sort((a, b) => {
            const aHasTs = !Number.isNaN(a._ts)
            const bHasTs = !Number.isNaN(b._ts)

            if (aHasTs && bHasTs && a._ts !== b._ts) return a._ts - b._ts
            if (a._seq !== b._seq) return a._seq - b._seq
            return a._senderOrder - b._senderOrder
          })
        } else if (
          orderedMessages.length >= 2 &&
          orderedMessages[0].sender === 'ai' &&
          orderedMessages.some((m) => m.sender === 'user')
        ) {
          // Fallback when backend sends newest-first without timestamps.
          orderedMessages.reverse()
        }

        const transformedMessages = orderedMessages.map(({ _ts, _seq, _senderOrder, ...msg }) => msg)

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

  // Start a new chat — keep the same session, just reset conversation state
  const handleStartNewChat = useCallback(async () => {
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
