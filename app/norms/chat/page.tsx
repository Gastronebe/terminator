'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Volume2, User, Bot, StopCircle, ArrowLeft, History, Plus, MessageSquare, ChefHat, Utensils } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { ChatMessage, ChatSession } from '@/types';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './page.module.css';

const POEM_LINES = [
    "Kuchař je umělec a psycholog a stratég,",
    "vždy plné mísy, chytře vmísí do šarvátek.",
    "Má v rukou argumenty, které přesvědčí,",
    "tedy hned a bez řečí."
];

const ALL_WORDS = POEM_LINES.join(' ').split(/\s+/);

function ProgressivePoem() {
    const [wordIndex, setWordIndex] = useState<number>(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setWordIndex(prev => (prev + 1) % ALL_WORDS.length);
        }, 400);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={styles.karaokeSingleLine}>
            {ALL_WORDS.map((word, i) => (
                <span
                    key={i}
                    className={`${styles.karaokeWord} ${i === wordIndex ? styles.wordActive : ''}`}
                >
                    {word}{' '}
                </span>
            ))}
        </div>
    );
}

const getVocativeName = (name: string | null | undefined) => {
    if (!name) return 'pane šéfe';
    const n = name.trim().toLowerCase();
    if (n === 'jana') return 'Jano';
    if (n === 'luda') return 'Luďo';
    if (n === 'pavla') return 'Pavlo';
    return name;
};

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
                { id: 'welcome', role: 'assistant', content: `Dobrý den, ${getVocativeName(user.name)}. Jsem Svaťa Kuřátko a jsem vám plně k službám. Copak dneska budeme vařit?`, timestamp: Date.now() }
            ]);
        }
    }, [user, currentSessionId]);

    // Scroll to bottom on messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

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

    const saveSession = async (updatedMessages: ChatMessage[], forcedTitle?: string, isRecipe: boolean = false) => {
        if (!user) return;
        try {
            const lastMsg = updatedMessages[updatedMessages.length - 1];

            // Get current session if exists to check its current title
            const currentSession = historyList.find(s => s.id === currentSessionId);

            // Logic for title:
            // 1. If we have a forcedTitle (from AI) and it's a recipe, we definitely want it.
            // 2. If existing session is already a recipe, we might keep its title unless new one is also a recipe.
            // 3. Fallback to generic message snippet.
            let title = forcedTitle;

            if (!title) {
                const firstUserMsg = updatedMessages.find(m => m.role === 'user')?.content || 'Nová konverzace';
                title = firstUserMsg.substring(0, 30) + (firstUserMsg.length > 30 ? '...' : '');
            }

            // Don't overwrite a specific recipe title with a generic discussion title later in the chat
            if (currentSession?.isRecipe && !isRecipe) {
                title = currentSession.title;
            }

            const res = await authFetch('/api/norms/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    userName: user.name,
                    title: title,
                    isRecipe: isRecipe || currentSession?.isRecipe || false,
                    lastMessage: lastMsg.content.substring(0, 50),
                    messages: updatedMessages
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (!currentSessionId && data.id) {
                    setCurrentSessionId(data.id);
                }
                fetchHistory(); // Refresh list to show update
            }
        } catch (err) {
            console.error('Save session error:', err);
        }
    };

    // Handle Send
    const handleSend = async () => {
        if (!input.trim() || loading) return;

        if (!user) {
            console.error('handleSend: No user session found');
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Omlouvám se, nejste přihlášen. Zkuste prosím obnovit stránku.',
                timestamp: Date.now()
            }]);
            return;
        }

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
            saveSession(finalMessages, data.suggestedTitle, data.isRecipe);

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
        // Reset to welcome message
        if (user) {
            setMessages([
                { id: 'welcome', role: 'assistant', content: `Dobrý den, ${getVocativeName(user.name)}. Jsem Svaťa Kuřátko a jsem vám plně k službám. Copak dneska budeme vařit?`, timestamp: Date.now() }
            ]);
        }
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
        <div className={styles.pageWrapper}>
            <main className={`container ${styles.container}`}>
                {/* Header */}
                <div className={styles.header}>
                    <Link href="/norms" className={styles.backButton}>
                        <ArrowLeft size={24} />
                    </Link>

                    <div className={styles.titleArea}>
                        <h1>
                            <Bot className="text-orange-600" size={24} />
                            Svatopluk Kuřátko
                        </h1>
                        <p className={styles.subtitle}>AI Kuchařský Mistr (Sváťa)</p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={styles.iconButton}
                            title="Historie konverzací"
                        >
                            <History size={24} />
                        </button>
                        <button
                            onClick={startNewChat}
                            className={styles.iconButton}
                            title="Nový chat"
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                </div>

                {/* History Overlay/Sidebar */}
                {showHistory && (
                    <div className={styles.historyOverlay} onClick={() => setShowHistory(false)}>
                        <div className={styles.historySidebar} onClick={e => e.stopPropagation()}>
                            <div className={styles.historyHeader}>
                                <h2>
                                    <MessageSquare size={18} className="text-indigo-600" />
                                    Historie (Všichni)
                                </h2>
                                <button onClick={() => setShowHistory(false)} className={styles.closeButton}>&times;</button>
                            </div>

                            <div className={styles.historyList}>
                                {historyList.length === 0 ? (
                                    <div className={styles.emptyHistory}>
                                        <p>Zatím žádná historie</p>
                                    </div>
                                ) : (
                                    historyList.map(session => (
                                        <div
                                            key={session.id}
                                            className={`${styles.historyItem} ${currentSessionId === session.id ? styles.activeHistoryItem : ''}`}
                                            onClick={() => loadSession(session)}
                                        >
                                            <div className={styles.historyItemMain}>
                                                {session.isRecipe ? (
                                                    <ChefHat size={14} className={styles.recipeIcon} />
                                                ) : (
                                                    <MessageSquare size={14} className={styles.chatIcon} />
                                                )}
                                                <div className={styles.historyItemTitle}>{session.title}</div>
                                            </div>
                                            <div className={styles.historyItemDate}>
                                                <span className="flex items-center gap-1">
                                                    <User size={10} /> {session.userName || 'Neznámý'}
                                                </span>
                                                <span>{new Date(session.updatedAt).toLocaleDateString('cs-CZ')}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages Area */}
                <div className={styles.messagesArea}>
                    {messages.map((msg, idx) => (
                        <div key={msg.id} className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : ''}`}>
                            {/* Avatar */}
                            <div className={`${styles.avatar} ${msg.role === 'user' ? styles.userAvatar : styles.botAvatar}`}>
                                {msg.role === 'user' ? <User size={14} /> : <img src="/svata.png" alt="Sváťa" className={styles.avatarImg} />}
                            </div>

                            {/* Content */}
                            <div className={`${styles.messageContentWrapper} ${msg.role === 'user' ? styles.userContentWrapper : ''}`}>
                                <span className={styles.senderName}>
                                    {msg.role === 'user' ? 'Vy' : 'Sváťa Kuřátko'}
                                </span>

                                <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.botBubble}`}>
                                    {msg.role === 'user' ? (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    ) : (
                                        <div className="prose prose-sm prose-orange max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-orange-800 prose-ul:my-1 prose-li:my-0">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }: { children?: React.ReactNode }) => <p className={styles.mdParagraph}>{children}</p>,
                                                    table: ({ children }: { children?: React.ReactNode }) => <div className={styles.tableWrapper}><table>{children}</table></div>,
                                                    th: ({ children }: { children?: React.ReactNode }) => <th>{children}</th>,
                                                    td: ({ children }: { children?: React.ReactNode }) => <td>{children}</td>,
                                                    text: ({ value }: { value?: string }) => {
                                                        if (!value) return null;
                                                        // Source parsing helper to keep links in correct places
                                                        const parts = value.split(/(\[ZDROJ:\s*\d+[^\]]*\])/gi);
                                                        return (
                                                            <>
                                                                {parts.map((part, i) => {
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
                                                                                Norma {id}
                                                                            </Link>
                                                                        );
                                                                    }
                                                                    return part;
                                                                })}
                                                            </>
                                                        );
                                                    }
                                                } as any}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}

                                    {/* Sources (Standalone) */}
                                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                        <div className={styles.sources}>
                                            <span className={styles.sourceLabel}>
                                                Zdroje:
                                            </span>
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
                                            {isSpeaking ? <StopCircle size={14} /> : <Volume2 size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className={styles.messageRow}>
                            <div className={`${styles.avatar} ${styles.botAvatar}`}>
                                <img src="/svata.png" alt="Sváťa" className={styles.avatarImg} />
                            </div>
                            <div className={styles.loadingBubble}>
                                <ProgressivePoem />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} style={{ height: '1rem' }} />
                </div>

                {/* Input Area */}
                <div className={styles.inputArea}>
                    <div className={styles.inputContainer}>
                        <button
                            onClick={toggleListening}
                            className={`${styles.iconButton} ${isListening ? styles.listening : ''}`}
                            title="Hlasové zadávání"
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
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
