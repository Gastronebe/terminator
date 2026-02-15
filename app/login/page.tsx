'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'; // Added createUser
import { auth, db } from '@/lib/firebase'; // Added db
import { doc, setDoc } from 'firebase/firestore'; // Added doc, setDoc
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import styles from './page.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState(''); // Added name for registration

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            if (isRegistering) {
                // Registration logic
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Create user document in Firestore
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    email: userCredential.user.email,
                    name: name || email.split('@')[0],
                    role: 'user', // Default role
                    createdAt: Date.now()
                });
            } else {
                // Login logic
                await signInWithEmailAndPassword(auth, email, password);
            }
            // Router push is handled, but redundant if AuthContext redirects or we rely on state change. 
            // However, explicit push is good UX here.
            router.push('/');
        } catch (err: any) {
            console.error(err);
            let msg = 'Neznámá chyba';
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                msg = 'Nesprávný email nebo heslo.';
            } else if (err.code === 'auth/email-already-in-use') {
                msg = 'Email je již používán.';
            } else if (err.code === 'auth/weak-password') {
                msg = 'Heslo je příliš slabé.';
            } else {
                msg = err.message;
            }
            setError(msg);
        }
    };

    return (
        <main className="container">
            <div className={styles.wrapper}>
                <Card title={isRegistering ? "Registrace" : "Přihlášení"}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <p className={styles.error}>{error}</p>}

                        {isRegistering && (
                            <div className={styles.field}>
                                <label>Jméno</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={styles.input}
                                    required={isRegistering}
                                />
                            </div>
                        )}

                        <div className={styles.field}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={styles.input}
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
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">
                            {isRegistering ? "Vytvořit účet" : "Přihlásit se"}
                        </button>

                        <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => setIsRegistering(!isRegistering)}
                        >
                            {isRegistering ? "Již máte účet? Přihlaste se" : "Nemáte účet? Zaregistrujte se"}
                        </button>
                    </form>
                </Card>
            </div>
        </main>
    );
}
