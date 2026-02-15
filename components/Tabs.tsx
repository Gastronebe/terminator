import styles from './Tabs.module.css';

interface Tab {
    id: string;
    label: string;
}

interface Props {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (id: string) => void;
    accentColor?: string;
}

export const Tabs = ({ tabs, activeTab, onTabChange, accentColor }: Props) => {
    return (
        <div className={`${styles.tabsContainer} no-scrollbar`}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
                    style={activeTab === tab.id && accentColor ? { color: accentColor, borderColor: accentColor } : undefined}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
