'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, MessageSquare, Plus, Search, MoreVertical, ArrowRight, PanelRightClose, PanelRightOpen, History, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { useRehabAIChat } from '@/hooks/useRehabAIChat'

function formatChatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ChatInterface() {
    const {
        sessionId,
        currentChatId,
        messages,
        chatHistory,
        isSessionLoading,
        isStreaming,
        isLoadingMessages,
        isChatHistoryLoading,
        error,
        isAuthed,
        sendMessage,
        loadChat,
        startNewChat,
        cancelStreaming,
        clearError,
    } = useRehabAIChat()

    const [inputText, setInputText] = useState('')
    const [showHistory, setShowHistory] = useState(true) // Desktop sidebar state
    const [showMobileHistory, setShowMobileHistory] = useState(false) // Mobile overlay state
    const [imageData, setImageData] = useState(null) // Base64 image data
    const [imagePreview, setImagePreview] = useState(null) // Preview URL
    const [isCreatingNewChat, setIsCreatingNewChat] = useState(false) // New chat creation state
    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSendMessage = async () => {
        if (!inputText.trim() || isStreaming || isSessionLoading) return

        const text = inputText
        const image = imageData

        setInputText('')
        setImageData(null)
        setImagePreview(null)

        await sendMessage(text, image)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB')
            return
        }

        // Create preview URL
        setImagePreview(URL.createObjectURL(file))

        // Convert to base64
        const reader = new FileReader()
        reader.onload = () => {
            const base64 = reader.result.split(',')[1]
            setImageData(base64)
        }
        reader.readAsDataURL(file)

        // Reset input
        e.target.value = ''
    }

    const removeImage = () => {
        setImageData(null)
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview)
            setImagePreview(null)
        }
    }

    const handleChatSelect = async (chatId) => {
        await loadChat(chatId)
        setShowMobileHistory(false)
    }

    const handleNewChat = async () => {
        setIsCreatingNewChat(true)
        try {
            await startNewChat()
        } finally {
            setIsCreatingNewChat(false)
        }
        setShowMobileHistory(false)
    }

    // Loading state - only show full-page loader on initial mount, not on new chat creation
    if (isSessionLoading && !isCreatingNewChat) {
        return (
            <div className="flex h-[calc(100vh-8rem)] bg-white border border-gray-200 rounded-lg overflow-hidden max-w-7xl mx-auto my-4 sm:my-8 shadow-sm items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-blue mx-auto mb-4" />
                    <p className="text-gray-600">Initializing chat...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white border border-gray-200 rounded-lg overflow-hidden max-w-7xl mx-auto my-4 sm:my-8 shadow-sm relative">
            {/* Error Banner */}
            {error && (
                <div className="absolute top-0 left-0 right-0 z-30 bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-red-700">{error}</p>
                    <button
                        onClick={clearError}
                        className="text-red-500 hover:text-red-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white w-full min-w-0">
                {/* Chat Header */}
                <div className={`h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 bg-white ${error ? 'mt-12' : ''}`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowMobileHistory(true)}
                            className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        >
                            <History className="w-5 h-5" />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary-blue flex-shrink-0">
                            <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-semibold text-gray-900 text-sm sm:text-base truncate">Health Assistant</h2>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${sessionId ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                <span className="text-xs text-gray-500">
                                    {sessionId ? 'Online' : 'Connecting...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="hidden md:flex p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title={showHistory ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            {showHistory ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-md">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/30">
                    {isLoadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-blue" />
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] sm:max-w-[70%] ${msg.sender === 'user' ? 'order-1' : 'order-2'}`}>
                                        {/* Image attachment */}
                                        {msg.image && (
                                            <div className="mb-2">
                                                <img
                                                    src={`data:image/jpeg;base64,${msg.image}`}
                                                    alt="Attached"
                                                    className="max-w-full max-h-48 rounded-lg"
                                                />
                                            </div>
                                        )}
                                        <div
                                            className={`p-3 sm:p-4 rounded-2xl shadow-sm text-sm sm:text-base ${msg.sender === 'user'
                                                ? 'bg-primary-blue text-white rounded-tr-none'
                                                : msg.isError
                                                    ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-none'
                                                    : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
                                                }`}
                                        >
                                            {msg.text || (msg.isStreaming && (
                                                <span className="inline-flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                </span>
                                            ))}
                                        </div>
                                        <p className={`text-xs text-gray-400 mt-1.5 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                            {msg.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Image Preview */}
                {imagePreview && (
                    <div className="px-4 pt-2 bg-white border-t border-gray-100">
                        <div className="relative inline-block">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="h-20 rounded-lg border border-gray-200"
                            />
                            <button
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2 sm:gap-4 max-w-4xl mx-auto items-center">
                        {/* File attachment - only show for authenticated users */}
                        {isAuthed && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isStreaming}
                                    className="p-2 sm:p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors disabled:opacity-50"
                                    title="Attach image for analysis"
                                >
                                    {imageData ? (
                                        <ImageIcon className="w-5 h-5 text-primary-blue" />
                                    ) : (
                                        <Paperclip className="w-5 h-5" />
                                    )}
                                </button>
                            </>
                        )}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={imageData ? "Describe what you'd like to know about this image..." : "Type a message..."}
                                disabled={isStreaming || !sessionId}
                                className="w-full pl-4 pr-10 sm:pr-12 py-2 sm:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary-blue transition-all text-sm sm:text-base disabled:bg-gray-50"
                            />
                            {isStreaming ? (
                                <button
                                    onClick={cancelStreaming}
                                    className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                                    title="Cancel"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputText.trim() || !sessionId}
                                    className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-primary-blue text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar - Chat History (Desktop - Right Side) */}
            <div className={`border-l border-gray-200 bg-gray-50 hidden md:flex flex-col transition-all duration-300 ease-in-out ${showHistory ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                <div className="p-4 border-b border-gray-200 min-w-[20rem]">
                    <button
                        onClick={handleNewChat}
                        disabled={isCreatingNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-primary-blue px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreatingNewChat ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        {isCreatingNewChat ? 'Creating...' : 'New Chat'}
                    </button>
                </div>

                <div className="p-4 min-w-[20rem] flex-1 overflow-hidden flex flex-col">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary-blue bg-white"
                        />
                    </div>

                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent</h3>

                    <div className="space-y-2 overflow-y-auto flex-1">
                        {isChatHistoryLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                        ) : chatHistory.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No chat exists.</p>
                        ) : (
                            chatHistory.map((chat) => (
                                <button
                                    key={chat.chat_id}
                                    onClick={() => handleChatSelect(chat.chat_id)}
                                    className={`w-full text-left p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all group ${currentChatId === chat.chat_id ? 'bg-white shadow-sm border border-blue-100' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className={`w-4 h-4 ${currentChatId === chat.chat_id ? 'text-primary-blue' : 'text-gray-400 group-hover:text-primary-blue'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{chat.title || 'Untitled Chat'}</p>
                                            <p className="text-xs text-gray-500">{formatChatDate(chat.updated_at || chat.created_at)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile History Sidebar (Overlay) */}
            {showMobileHistory && (
                <div className="absolute inset-0 z-20 bg-gray-50 md:hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                        <h3 className="font-semibold text-gray-900">Chat History</h3>
                        <button onClick={() => setShowMobileHistory(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                            <ArrowRight className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto bg-gray-50">
                        <button
                            onClick={handleNewChat}
                            disabled={isCreatingNewChat}
                            className="w-full flex items-center justify-center gap-2 bg-primary-blue text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreatingNewChat ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            {isCreatingNewChat ? 'Creating...' : 'New Chat'}
                        </button>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary-blue bg-white"
                            />
                        </div>

                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent</h3>

                        <div className="space-y-2">
                            {isChatHistoryLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                </div>
                            ) : chatHistory.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">No chat exists.</p>
                            ) : (
                                chatHistory.map((chat) => (
                                    <button
                                        key={chat.chat_id}
                                        onClick={() => handleChatSelect(chat.chat_id)}
                                        className={`w-full text-left p-3 rounded-lg bg-white shadow-sm border ${currentChatId === chat.chat_id ? 'border-blue-200' : 'border-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <MessageSquare className={`w-4 h-4 ${currentChatId === chat.chat_id ? 'text-primary-blue' : 'text-gray-400'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{chat.title || 'Untitled Chat'}</p>
                                                <p className="text-xs text-gray-500">{formatChatDate(chat.updated_at || chat.created_at)}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
