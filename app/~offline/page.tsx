import { WifiOff } from 'lucide-react';

export const metadata = {
    title: "Jste offline",
};

export default function OfflinePage() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: 20,
            textAlign: 'center',
            color: '#333'
        }}>
            <WifiOff size={64} color="#666" style={{ marginBottom: 20 }} />
            <h1 style={{ fontSize: '1.5rem', marginBottom: 10 }}>Jste offline</h1>
            <p style={{ color: '#666' }}>
                Nemáte připojení k internetu.
                <br />
                Aplikace se snaží načíst data z mezipaměti.
            </p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    marginTop: 20,
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer'
                }}
            >
                Zkusit znovu
            </button>
        </div>
    );
}
