'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Volume2, User, Bot, StopCircle, ArrowLeft, History, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { ChatMessage, ChatSession } from '@/types';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './page.module.css';

export default function ChatPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyList, setHistoryList] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial welcome
    useEffect(() => {
        if (!currentSessionId && messages.length === 0 && user) {
            setMessages([
                { id: 'welcome', role: 'assistant', content: `Dobrý den, ${user.name || 'pane šéfe'}. Jsem Svaťa Kuřátko a jsem vám plně k službám. Copak dneska budeme vařit?`, timestamp: Date.now() }
            ]);
        }
    }, [user, currentSessionId]);

    // Fetch history on mount
    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        if (!user) return;
        try {
            const res = await authFetch('/api/norms/history');
            if (res.ok) {
                const data = await res.json();
                setHistoryList(data);
            }
        } catch (err) {
            console.error('Fetch history error:', err);
        }
    };

    const saveSession = async (updatedMessages: ChatMessage[]) => {
        if (!user) return;
        try {
            const lastMsg = updatedMessages[updatedMessages.length - 1];
            const firstUserMsg = updatedMessages.find(m => m.role === 'user')?.content || 'Nová konverzace';

            const res = await authFetch('/api/norms/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    title: firstUserMsg.substring(0, 30) + (firstUserMsg.length > 30 ? '...' : ''),
                    lastMessage: lastMsg.content.substring(0, 50),
                    messages: updatedMessages
                })
            });
            const data = await res.json();
            if (data.id && !currentSessionId) {
                setCurrentSessionId(data.id);
            }
            fetchHistory();
        } catch (err) {
            console.error('Save session error:', err);
        }
    };

    // Handle Send
    const handleSend = async () => {
        if (!input.trim() || loading || !user) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            // Only send actual conversation history, excluding welcome if too long or system prompts
            const historyForApi = messages.filter(m => m.id !== 'welcome');

            const res = await authFetch('/api/norms/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: userMsg.content,
                    history: historyForApi,
                    userName: user.name
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Failed to fetch response');
            }

            const data = await res.json();
            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer,
                timestamp: Date.now(),
                sources: data.sourceIds
            };
            const finalMessages = [...newMessages, botMsg];
            setMessages(finalMessages);
            saveSession(finalMessages);

        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Omlouvám se, došlo k chybě: ${error.message || 'Chyba serveru'}.`,
                timestamp: Date.now()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const loadSession = (session: ChatSession) => {
        setCurrentSessionId(session.id);
        setMessages(session.messages);
        setShowHistory(false);
    };

    const startNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setShowHistory(false);
    };

    // Speech to Text (Web Speech API)
    const toggleListening = () => {
        if (isListening) {
            window.speechSynthesis.cancel();
            setIsListening(false);
            return;
        }

        if (!('webkitSpeechRecognition' in window)) {
            alert('Váš prohlížeč nepodporuje rozpoznávání hlasu.');
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'cs-CZ';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (e: any) => {
            console.error('Speech recognition error', e);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };

        recognition.start();
    };

    // Text to Speech
    const speak = (text: string) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'cs-CZ';
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <main className={`container ${styles.container}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className="flex items-center gap-2">
                    <Link href="/norms" className={styles.backButton}>
                        <ArrowLeft size={24} />
                    </Link>
                    <button onClick={() => setShowHistory(!showHistory)} className={styles.iconButton} title="Historie chatů">
                        <History size={24} />
                    </button>
                    <button onClick={startNewChat} className={styles.iconButton} title="Nový chat">
                        <Plus size={24} />
                    </button>
                </div>
                <div className={styles.titleArea}>
                    <h1>
                        <Bot className="text-indigo-600" />
                        Zeptat se Svatopluka
                    </h1>
                    <p className={styles.subtitle}>AI asistent (Sváťa Kuřátko)</p>
                </div>
            </div>

            {/* History Sidebar/Overlay */}
            {showHistory && (
                <div className={styles.historyOverlay} onClick={() => setShowHistory(false)}>
                    <div className={styles.historySidebar} onClick={e => e.stopPropagation()}>
                        <div className={styles.historyHeader}>
                            <h2>Historie konverzací</h2>
                            <button onClick={() => setShowHistory(false)} className={styles.closeButton}>×</button>
                        </div>
                        <div className={styles.historyList}>
                            {historyList.length === 0 ? (
                                <p className={styles.emptyHistory}>Zatím žádná historie</p>
                            ) : (
                                historyList.map(session => (
                                    <div
                                        key={session.id}
                                        className={`${styles.historyItem} ${currentSessionId === session.id ? styles.activeHistoryItem : ''}`}
                                        onClick={() => loadSession(session)}
                                    >
                                        <div className={styles.historyItemTitle}>{session.title}</div>
                                        <div className={styles.historyItemDate}>{new Date(session.updatedAt).toLocaleDateString('cs-CZ')}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className={styles.messagesArea}>
                {messages.map(msg => (
                    <div key={msg.id} className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : ''}`}>
                        {/* Avatar */}
                        <div className={`${styles.avatar} ${msg.role === 'user' ? styles.userAvatar : styles.botAvatar}`}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>

                        {/* Content */}
                        <div className={`${styles.messageContentWrapper} ${msg.role === 'user' ? styles.userContentWrapper : ''}`}>
                            <span className={styles.senderName}>
                                {msg.role === 'user' ? 'Vy' : 'Sváťa Kuřátko'}
                            </span>

                            <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.botBubble}`}>
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ children }: { children: React.ReactNode }) => <p className={styles.mdParagraph}>{children}</p>,
                                            table: ({ children }: { children: React.ReactNode }) => <div className={styles.tableWrapper}><table>{children}</table></div>,
                                            text: ({ value }: { value: string }) => {
                                                if (!value) return null;
                                                return value.split(/(\[ZDROJ:\s*\d+[^\]]*\])/gi).map((part, i) => {
                                                    const match = part.match(/\[ZDROJ:\s*(\d+)([^\]]*)\]/i);
                                                    if (match) {
                                                        const id = match[1];
                                                        const name = match[2].trim();
                                                        return (
                                                            <Link
                                                                key={i}
                                                                href={`/norms/recipe/${id}`}
                                                                className={styles.inlineSourceLink}
                                                                title={`Přejít na recept: ${name}`}
                                                            >
                                                                [Norma č. {id} {name}]
                                                            </Link>
                                                        );
                                                    }
                                                    return part;
                                                });
                                            }
                                        } as any}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                )}

                                {/* Sources */}
                                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                    <div className={styles.sources}>
                                        <span className={styles.sourceLabel}>Zdroje:</span>
                                        {msg.sources.map((s, i) => (
                                            <Link key={i} href={`/norms/recipe/${s}`} className={styles.sourceLink}>
                                                {s}
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {/* TTS Action */}
                                {msg.role === 'assistant' && (
                                    <button
                                        onClick={() => speak(msg.content)}
                                        className={styles.ttsButton}
                                        title="Přečíst nahlas"
                                    >
                                        {isSpeaking ? <StopCircle size={16} /> : <Volume2 size={16} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className={styles.messageRow}>
                        <div className={`${styles.avatar} ${styles.botAvatar}`}>
                            <Bot size={16} />
                        </div>
                        <div className={styles.loadingBubble}>
                            Přemýšlím... (čtu v knize norem)
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
                <button
                    onClick={toggleListening}
                    className={`${styles.iconButton} ${isListening ? styles.listening : ''}`}
                >
                    <Mic size={20} />
                </button>

                <input
                    type="text"
                    className={styles.textInput}
                    placeholder="Zeptejte se na recept..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                />

                <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className={styles.sendButton}
                >
                    <Send size={20} />
                </button>
            </div>
        </main>
    );
}
