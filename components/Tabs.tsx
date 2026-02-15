export const Tabs = ({ tabs, activeTab, onTabChange }: { tabs: { id: string, label: string }[], activeTab: string, onTabChange: (id: string) => void }) => {
    return (
        <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: 20 }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        padding: '12px 24px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid #007AFF' : '2px solid transparent',
                        color: activeTab === tab.id ? '#007AFF' : '#666',
                        fontWeight: activeTab === tab.id ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: 15
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
