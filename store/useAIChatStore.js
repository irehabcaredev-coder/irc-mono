import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAIChatStore = create(
  persist(
    (set, get) => ({
      // Session ID - persisted to localStorage
      sessionId: null,

      // Whether the user was authenticated when the session was created (persisted)
      authAtCreation: false,

      // Session state machine: 'idle' | 'loading' | 'ready' | 'error'
      sessionState: 'idle',

      // Backend-reported session metadata
      sessionUserType: null,
      sessionReferenceType: null,

      // Current active chat ID
      currentChatId: null,

      // Chat history list for sidebar
      chatHistory: [],

      // Current conversation messages
      messages: [],

      // Loading states
      isStreaming: false,
      isLoadingMessages: false,

      // Error state
      error: null,

      // Derived: is session currently loading (backward-compat)
      get isSessionLoading() {
        return get().sessionState === 'loading'
      },

      // Actions
      setSessionId: (sessionId) => set({ sessionId }),

      // Set session ID and auth context atomically, plus backend metadata
      setSessionMeta: (sessionId, authAtCreation, userType, referenceType) =>
        set({
          sessionId,
          authAtCreation,
          sessionState: 'ready',
          sessionUserType: userType || null,
          sessionReferenceType: referenceType || null,
          error: null,
        }),

      setSessionState: (sessionState) => set({ sessionState }),

      clearSession: () =>
        set({
          sessionId: null,
          authAtCreation: false,
          sessionState: 'idle',
          sessionUserType: null,
          sessionReferenceType: null,
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

      setSessionLoading: (loading) =>
        set({ sessionState: loading ? 'loading' : get().sessionId ? 'ready' : 'idle' }),

      setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),

      setError: (error) => set({ error, sessionState: error ? 'error' : get().sessionState }),

      clearError: () => set({ error: null }),

      startNewChat: () =>
        set({
          currentChatId: null,
          messages: [
            {
              id: 'welcome',
              sender: 'ai',
              text: 'Hello! I am your personal health assistant. How can I help you today?',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
          error: null,
        }),

      // Reset for new session (keeps sessionId but clears conversation state)
      resetConversation: () =>
        set({
          currentChatId: null,
          messages: [
            {
              id: 'welcome',
              sender: 'ai',
              text: 'Hello! I am your personal health assistant. How can I help you today?',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        }),
    }),
    {
      name: 'ai-chat-store',
      // Persist sessionId and auth context
      partialize: (state) => ({
        sessionId: state.sessionId,
        authAtCreation: state.authAtCreation,
      }),
    }
  )
)
