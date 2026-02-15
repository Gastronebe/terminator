'use client';

import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useUsers } from '@/hooks/useData';
import Card from '@/components/Card';
import styles from './page.module.css';

export default function AdminUsersPage() {
    const { data: users, loading } = useUsers();
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [message, setMessage] = useState('');

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Vytvářím...');

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('Uživatel vytvořen');
                setName('');
                setEmail('');
                setPassword('');
                setIsCreating(false);
            } else {
                setMessage(`Chyba: ${data.error}`);
            }
        } catch (err) {
            setMessage('Chyba při komunikaci se serverem');
        }
    };

    return (
        <AdminLayout>
            <div className={styles.header}>
                <h1>Správa uživatelů</h1>
                <button className="btn btn-primary" onClick={() => setIsCreating(!isCreating)}>
                    {isCreating ? 'Zrušit' : 'Přidat uživatele'}
                </button>
            </div>

            {isCreating && (
                <Card title="Nový uživatel" className={styles.formCard}>
                    <form onSubmit={handleCreateUser} className={styles.form}>
                        <div className={styles.field}>
                            <label>Jméno</label>
                            <input value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className={styles.field}>
                            <label>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div className={styles.field}>
                            <label>Heslo</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <div className={styles.field}>
                            <label>Role</label>
                            <select value={role} onChange={e => setRole(e.target.value as any)}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary">Vytvořit</button>
                        {message && <p>{message}</p>}
                    </form>
                </Card>
            )}

            <div className={styles.grid}>
                {users.map(user => (
                    <Card key={user.createdAt + user.email} title={user.name}>
                        <p>{user.email}</p>
                        <span className={`status-badge ${user.role === 'admin' ? 'status-active' : ''}`}>
                            {user.role}
                        </span>
                    </Card>
                ))}
            </div>
        </AdminLayout>
    );
}
