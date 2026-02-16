'use client';

import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useUsers } from '@/hooks/useData';
import Card from '@/components/Card';
import { Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function AdminUsersPage() {
    const { data: users, loading } = useUsers();
    const { user: currentUser } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // Form state (Shared for Create/Edit)
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
                window.location.reload(); // Simple refresh for now
            } else {
                setMessage(`Chyba: ${data.error}`);
            }
        } catch (err) {
            setMessage('Chyba při komunikaci se serverem');
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setMessage('Aktualizuji...');

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, role }),
            });

            if (res.ok) {
                setMessage('Uživatel aktualizován');
                setEditingUser(null);
                window.location.reload();
            } else {
                const data = await res.json();
                setMessage(`Chyba: ${data.error}`);
            }
        } catch (err) {
            setMessage('Chyba při komunikaci se serverem');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (userId === currentUser?.id) {
            alert('Nemůžete smazat sama sebe!');
            return;
        }

        if (!confirm('Opravdu chcete tohoto uživatele smazat? Tato akce je nevratná.')) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                window.location.reload();
            } else {
                const data = await res.json();
                alert(`Chyba při mazání: ${data.error}`);
            }
        } catch (err) {
            alert('Chyba při komunikaci se serverem');
        }
    };

    const startEdit = (user: any) => {
        setEditingUser(user);
        setName(user.name);
        setRole(user.role);
        setIsCreating(false);
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
                <Card title="Nový uživatel (Přihlašovací údaje)" className={styles.formCard}>
                    <form onSubmit={handleCreateUser} className={styles.form}>
                        <div className={styles.field}>
                            <label>Jméno</label>
                            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Svatopluk Kuřátko" />
                        </div>
                        <div className={styles.field}>
                            <label>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="svata@priklad.cz" />
                        </div>
                        <div className={styles.field}>
                            <label>Heslo</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <div className={styles.field}>
                            <label>Role</label>
                            <select value={role} onChange={e => setRole(e.target.value as any)}>
                                <option value="user">Uživatel</option>
                                <option value="admin">Administrátor</option>
                            </select>
                        </div>
                        <div className={styles.actions}>
                            <button type="submit" className="btn btn-primary">Vytvořit</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Zrušit</button>
                        </div>
                        {message && <p className={styles.message}>{message}</p>}
                    </form>
                </Card>
            )}

            {editingUser && (
                <Card title={`Editace: ${editingUser.name}`} className={styles.formCard}>
                    <form onSubmit={handleUpdateUser} className={styles.form}>
                        <div className={styles.field}>
                            <label>Jméno</label>
                            <input value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className={styles.field}>
                            <label>Role</label>
                            <select value={role} onChange={e => setRole(e.target.value as any)}>
                                <option value="user">Uživatel</option>
                                <option value="admin">Administrátor</option>
                            </select>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email ({editingUser.email}) nelze měnit.</p>
                        <div className={styles.actions}>
                            <button type="submit" className="btn btn-primary">Uložit změny</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Zrušit</button>
                        </div>
                        {message && <p className={styles.message}>{message}</p>}
                    </form>
                </Card>
            )}

            <div className={styles.grid}>
                {users.map(user => (
                    <Card key={user.createdAt + user.email} className={styles.userCard}>
                        <div className={styles.userCardHeader}>
                            <div className={styles.userInfo}>
                                <h3>{user.name}</h3>
                                <p>{user.email}</p>
                            </div>
                            <div className={styles.userActions}>
                                <button
                                    className={styles.actionBtn}
                                    onClick={() => startEdit(user)}
                                    title="Upravit"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                    onClick={() => handleDeleteUser(user.id)}
                                    title="Smazat"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.cardFooter}>
                            <span className={`status-badge ${user.role === 'admin' ? 'status-active' : ''}`}>
                                {user.role === 'admin' ? 'Administrátor' : 'Uživatel'}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>
        </AdminLayout>
    );
}
