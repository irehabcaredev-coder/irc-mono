'use client'

import { useState } from 'react'
import { Send, Paperclip, MessageSquare, Plus, Search, MoreVertical, FileText, ArrowRight, PanelRightClose, PanelRightOpen, History } from 'lucide-react'

// Mock Data
const chatHistory = [
    { id: 1, title: 'Headache Consultation', date: 'Today' },
    { id: 2, title: 'Diet Plan Query', date: 'Yesterday' },
    { id: 3, title: 'Lab Report Analysis', date: 'Apr 20' },
    { id: 4, title: 'General Inquiry', date: 'Apr 15' },
]

export default function ChatInterface() {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: 'Hello! I am your personal health assistant. How can I help you today?', time: '10:00 AM' },
    ])
    const [inputText, setInputText] = useState('')
    const [showHistory, setShowHistory] = useState(true) // Desktop sidebar state
    const [showMobileHistory, setShowMobileHistory] = useState(false) // Mobile overlay state

    const handleSendMessage = () => {
        if (!inputText.trim()) return

        const newMessage = {
            id: messages.length + 1,
            sender: 'user',
            text: inputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }

        setMessages([...messages, newMessage])
        setInputText('')

        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: prev.length + 1,
                sender: 'ai',
                text: "I understand. Can you tell me more about your symptoms?",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }])
        }, 1000)
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white border border-gray-200 rounded-lg overflow-hidden max-w-7xl mx-auto my-4 sm:my-8 shadow-sm relative">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white w-full min-w-0">
                {/* Chat Header */}
                <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 bg-white">
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
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-xs text-gray-500">Online</span>
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
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] sm:max-w-[70%] ${msg.sender === 'user' ? 'order-1' : 'order-2'}`}>
                                <div
                                    className={`p-3 sm:p-4 rounded-2xl shadow-sm text-sm sm:text-base ${msg.sender === 'user'
                                        ? 'bg-primary-blue text-white rounded-tr-none'
                                        : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                                <p className={`text-xs text-gray-400 mt-1.5 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                    {msg.time}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2 sm:gap-4 max-w-4xl mx-auto items-center">
                        <button className="p-2 sm:p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type a message..."
                                className="w-full pl-4 pr-10 sm:pr-12 py-2 sm:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary-blue transition-all text-sm sm:text-base"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputText.trim()}
                                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-primary-blue text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar - Chat History (Desktop - Right Side) */}
            <div className={`border-l border-gray-200 bg-gray-50 hidden md:flex flex-col transition-all duration-300 ease-in-out ${showHistory ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                <div className="p-4 border-b border-gray-200 min-w-[20rem]">
                    <button className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-primary-blue px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-sm">
                        <Plus className="w-4 h-4" />
                        New Chat
                    </button>
                </div>

                <div className="p-4 min-w-[20rem]">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary-blue bg-white"
                        />
                    </div>

                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent</h3>

                    <div className="space-y-2 overflow-y-auto">
                        {chatHistory.map(chat => (
                            <button key={chat.id} className="w-full text-left p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all group">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-primary-blue" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{chat.title}</p>
                                        <p className="text-xs text-gray-500">{chat.date}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
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
                        <button className="w-full flex items-center justify-center gap-2 bg-primary-blue text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium mb-6">
                            <Plus className="w-4 h-4" />
                            New Chat
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
                            {chatHistory.map(chat => (
                                <button key={chat.id} className="w-full text-left p-3 rounded-lg bg-white shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className="w-4 h-4 text-gray-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{chat.title}</p>
                                            <p className="text-xs text-gray-500">{chat.date}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
