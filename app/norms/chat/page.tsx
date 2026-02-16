'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Volume2, User, Bot, StopCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: string[]; // IDs of recipes
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', role: 'assistant', content: 'Dobrý den, jsem váš asistent pro gastronomické normy teplých pokrmů (ČSN 1986). Zeptejte se mě na recept, technologický postup nebo přepočet surovin.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle Send
    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/norms/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userMsg.content })
            });

            if (!res.ok) throw new Error('Failed to fetch response');

            const data = await res.json();
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer,
                sources: data.sourceIds
            };
            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Omlouvám se, došlo k chybě při komunikaci se serverem.' }]);
        } finally {
            setLoading(false);
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
        <main className={`container ${styles.container}`}>
            {/* Header */}
            <div className={styles.header}>
                <Link href="/norms" className={styles.backButton}>
                    <ArrowLeft size={24} />
                </Link>
                <div className={styles.titleArea}>
                    <h1>
                        <Bot className="text-indigo-600" />
                        Zeptat se norem
                    </h1>
                    <p className={styles.subtitle}>AI asistent (ČSN 1986)</p>
                </div>
            </div>

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
                                {msg.role === 'user' ? 'Vy' : 'Asistent (ČSN 1986)'}
                            </span>

                            <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.botBubble}`}>
                                {msg.content}

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
