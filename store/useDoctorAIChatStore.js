import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useDoctorAIChatStore = create(
    persist(
        (set, get) => ({
            // Session ID - persisted to localStorage
            sessionId: null,

            // Whether the current session was created with JWT auth
            isSessionAuthed: false,

            // Current active chat ID
            currentChatId: null,

            // Chat history list for sidebar
            chatHistory: [],

            // Current conversation messages
            messages: [],

            // Loading states
            isSessionLoading: false,
            isStreaming: false,
            isLoadingMessages: false,

            // Error state
            error: null,

            // Actions
            setSessionId: (sessionId, isAuthed = false) => set({ sessionId, isSessionAuthed: isAuthed }),

            clearSession: () =>
                set({
                    sessionId: null,
                    isSessionAuthed: false,
                    currentChatId: null,
                    chatHistory: [],
                    messages: [],
                    error: null,
                }),

            setChatHistory: (chatHistory) => set({ chatHistory }),

            setCurrentChatId: (chatId) => set({ currentChatId: chatId }),

            setMessages: (messages) => set({ messages }),

            addMessage: (message) =>
                set((state) => ({
                    messages: [...state.messages, message],
                })),

            updateLastMessage: (update) =>
                set((state) => {
                    const messages = [...state.messages]
                    if (messages.length > 0) {
                        const lastIndex = messages.length - 1
                        messages[lastIndex] = {
                            ...messages[lastIndex],
                            ...(typeof update === 'function' ? update(messages[lastIndex]) : update),
                        }
                    }
                    return { messages }
                }),

            appendToLastMessage: (text) =>
                set((state) => {
                    const messages = [...state.messages]
                    if (messages.length > 0) {
                        const lastIndex = messages.length - 1
                        messages[lastIndex] = {
                            ...messages[lastIndex],
                            text: (messages[lastIndex].text || '') + text,
                        }
                    }
                    return { messages }
                }),

            setStreaming: (isStreaming) => set({ isStreaming }),

            setSessionLoading: (isSessionLoading) => set({ isSessionLoading }),

            setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),

            setError: (error) => set({ error }),

            clearError: () => set({ error: null }),

            startNewChat: () =>
                set({
                    currentChatId: null,
                    messages: [
                        {
                            id: 'welcome',
                            sender: 'ai',
                            text: "Hello, Doctor! I'm your AI assistant. How can I help you today?",
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        },
                    ],
                    error: null,
                }),

            resetConversation: () =>
                set({
                    currentChatId: null,
                    messages: [
                        {
                            id: 'welcome',
                            sender: 'ai',
                            text: "Hello, Doctor! I'm your AI assistant. How can I help you today?",
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        },
                    ],
                }),
        }),
        {
            name: 'doctor-ai-chat-store',
            // Only persist session identifiers, not full message history
            partialize: (state) => ({
                sessionId: state.sessionId,
                isSessionAuthed: state.isSessionAuthed,
                currentChatId: state.currentChatId,
            }),
        }
    )
)
