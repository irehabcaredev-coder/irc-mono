'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDoctorAIChatStore } from '@/store/useDoctorAIChatStore'
import { useDoctorStore } from '@/store/useDoctorStore'
import {
    createSession,
    deleteSession,
    sendChatMessage,
    sendChatFileMessage,
    getChatHistory,
    getChatMessages,
    streamResponse,
} from '@/lib/rehabAIClient'

/**
 * Hook for doctor-side AI chat — mirrors useRehabAIChat but:
 *  - Uses useDoctorAIChatStore (doctor-ai-chat-store) for state isolation
 *  - Authenticates using doctor_token (always authenticated)
 *  - Uses doctor-specific welcome message
 */
export function useDoctorAIChat() {
    const queryClient = useQueryClient()
    const abortControllerRef = useRef(null)

    // Doctor is always authenticated on the dashboard
    const isAuthed = true

    // Get AI chat state from doctor-specific store
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
    } = useDoctorAIChatStore()

    /**
     * Create a fresh doctor session. Passes doctor_token as Bearer JWT
     * so the AI backend can associate the session with the doctor.
     */
    const createFreshSession = useCallback(async () => {
        setSessionLoading(true)
        setError(null)

        try {
            // Sends the doctor JWT so the session (and its chat history) belongs to this doctor
            const data = await createSession(true, 'doctor_token')
            const newSessionId = data.session_id

            setSessionId(newSessionId, true)
            startNewChat()
            return newSessionId
        } catch (err) {
            console.error('[useDoctorAIChat] Failed to create session:', err)
            setError('Failed to initialize chat session. Please refresh the page.')
            return null
        } finally {
            setSessionLoading(false)
        }
    }, [setSessionId, setSessionLoading, setError, startNewChat])

    // Initialize session on mount
    useEffect(() => {
        async function initSession() {
            // Auth state changed — recreate session
            if (sessionId && !isSessionAuthed) {
                deleteSession(sessionId).catch((err) =>
                    console.warn('[useDoctorAIChat] Failed to delete old session:', err)
                )
                clearSession()
            }

            if (sessionId) {
                console.info('[useDoctorAIChat] Reusing existing session on mount')
                if (messages.length === 0 && !currentChatId) {
                    startNewChat()
                }
                return
            }

            console.info('[useDoctorAIChat] Creating new session on mount')
            await createFreshSession()
        }

        initSession()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Fetch chat history with React Query
    const {
        data: chatHistoryData,
        isLoading: isChatHistoryLoading,
        refetch: refetchChatHistory,
    } = useQuery({
        queryKey: ['doctorChatHistory', sessionId],
        queryFn: async () => {
            if (!sessionId) return { chats: [] }
            const response = await getChatHistory(sessionId)
            return response
        },
        enabled: !!sessionId,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
    })

    // Sync cached chat history when data changes
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

            // Add user message immediately
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

            // Add placeholder AI streaming message
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
                const activeChatId = useDoctorAIChatStore.getState().currentChatId
                const isFirstChatRequest = !activeChatId

                abortControllerRef.current = new AbortController()

                const attemptSend = async (sid) => {
                    if (isFileMode) {
                        return sendChatFileMessage(sid, text.trim(), attachment.file, activeChatId, abortControllerRef.current?.signal)
                    }
                    return sendChatMessage(sid, text.trim(), activeChatId, 'chat', null)
                }

                let response
                try {
                    response = await attemptSend(sessionId)
                } catch (sendErr) {
                    if (isFileMode) {
                        if (sendErr.status === 401) {
                            console.warn('[useDoctorAIChat] 401 on file upload — re-creating session.')
                            const newSid = await createFreshSession()
                            if (!newSid) throw new Error('Failed to re-create session after 401')
                            response = await attemptSend(newSid)
                        } else if (sendErr.status === 403) {
                            throw new Error('File analysis limit reached. Please start a new chat session.')
                        } else {
                            throw sendErr
                        }
                    } else {
                        if (sendErr.status === 401 || sendErr.status === 403) {
                            console.warn('[useDoctorAIChat] Session expired. Re-creating session.')
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

                const headerChatId =
                    response.headers.get('x-chat-id') ||
                    response.headers.get('chat-id') ||
                    response.headers.get('chat_id')

                if (headerChatId && !newChatId) {
                    newChatId = headerChatId
                    setCurrentChatId(newChatId)
                }

                if (isFileMode) {
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
                    for await (const chunk of streamResponse(response)) {
                        if (abortControllerRef.current?.signal.aborted) break

                        const chunkChatId = chunk.chat_id || chunk.chatId
                        if (chunkChatId && !newChatId) {
                            newChatId = chunkChatId
                            setCurrentChatId(newChatId)
                        }

                        if (chunk.content || chunk.text || chunk.delta) {
                            const chunkText = chunk.content || chunk.text || chunk.delta
                            fullText += chunkText
                            appendToLastMessage(chunkText)
                        }

                        if (chunk.message) {
                            fullText = chunk.message
                            updateLastMessage({ text: chunk.message })
                        }
                    }
                }

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
                console.error('[useDoctorAIChat] Failed to send message:', err)
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

    // Load a specific chat by ID
    const loadChat = useCallback(
        async (chatId) => {
            if (!sessionId || !chatId) return

            setLoadingMessages(true)
            clearError()

            try {
                const response = await getChatMessages(sessionId, chatId)
                const sourceMessages = Array.isArray(response?.messages) ? response.messages : []

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
                    const isUserRole = ['user', 'human', 'patient', 'client', 'doctor'].includes(role)

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
                    orderedMessages.reverse()
                }

                const transformedMessages = orderedMessages.map(({ _ts, _seq, _senderOrder, ...msg }) => msg)

                setCurrentChatId(chatId)
                setMessages(transformedMessages)
            } catch (err) {
                console.error('[useDoctorAIChat] Failed to load chat:', err)
                setError('Failed to load chat messages')
            } finally {
                setLoadingMessages(false)
            }
        },
        [sessionId, setCurrentChatId, setMessages, setLoadingMessages, setError, clearError]
    )

    // Cancel in-flight streaming
    const cancelStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setStreaming(false)
        updateLastMessage({ isStreaming: false })
    }, [setStreaming, updateLastMessage])

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
