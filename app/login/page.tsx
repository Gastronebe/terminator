'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Removed createUser
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import styles from './page.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Verify redirect logic in AuthGuard/Context
            router.push('/');
        } catch (err: any) {
            console.error(err);
            let msg = 'Neznámá chyba';
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                msg = 'Nesprávný email nebo heslo.';
            } else if (err.code === 'auth/too-many-requests') {
                msg = 'Příliš mnoho pokusů. Zkuste to později.';
            } else {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container">
            <div className={styles.wrapper}>
                <Card title="Přihlášení">
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <p className={styles.error}>{error}</p>}

                        <div className={styles.field}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={styles.input}
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Heslo</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className={styles.input}
                                placeholder="••••••••"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Přihlašuji..." : "Přihlásit se"}
                        </button>
                    </form>
                </Card>
            </div>
        </main>
    );
}
