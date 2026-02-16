'use client';

import { useAssetItems, useDocuments, useAssets, useSubscriptions, useBirthdays, useCalendarEvents } from "@/hooks/useData";
import { calculateStatus } from "@/utils/status";
import { LogOut, Calendar, Gift, ChefHat } from 'lucide-react';
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import StatusCard from "@/components/StatusCard";
import DashboardWidget from "@/components/DashboardWidget";
import PollWidget from "@/components/PollWidget";
import styles from "./page.module.css";
/* Removed ImportantEventsWidget import as logic moves here or to a new wrapper */
/* Actually, let's keep logic inline or use a custom component if needed. 
   To keep it clean, I will implement logic here for MVP. */

export default function Home() {
  const router = useRouter();
  const { data: assetItems } = useAssetItems();
  const { data: documents } = useDocuments();
  const { data: assets } = useAssets();
  const { data: subscriptions } = useSubscriptions();
  const { data: birthdays } = useBirthdays();
  const { data: events } = useCalendarEvents();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const getStats = (type: 'car' | 'property' | 'document' | 'subscription') => {
    let itemsToCheck: any[] = [];
    if (type === 'car') itemsToCheck = assetItems.filter(i => assets.find(a => a.id === i.assetId)?.type === 'car');
    else if (type === 'property') itemsToCheck = assetItems.filter(i => assets.find(a => a.id === i.assetId)?.type === 'property');
    else if (type === 'document') itemsToCheck = documents;
    else if (type === 'subscription') itemsToCheck = subscriptions.filter(s => s.trackStatus !== false).map(s => ({ validUntil: s.nextPaymentDate, notifyBeforeDays: 7 }));

    let expired = 0, warning = 0, active = 0;
    itemsToCheck.forEach(item => {
      const status = calculateStatus(item.validUntil, item.notifyBeforeDays || 30);
      if (status === 'expired') expired++;
      else if (status === 'warning') warning++;
      else active++;
    });
    return { expired, warning, active, total: itemsToCheck.length };
  };

  const carStats = getStats('car');
  const propertyStats = getStats('property');
  const docStats = getStats('document');
  const subStats = getStats('subscription');

  const totalExpired = carStats.expired + propertyStats.expired + docStats.expired + subStats.expired;
  const totalWarning = carStats.warning + propertyStats.warning + docStats.warning + subStats.warning;
  const totalActive = carStats.active + propertyStats.active + docStats.active + subStats.active;

  // Birthday logic
  const getNextBirthday = (date: number) => {
    const d = new Date(date);
    const today = new Date();
    const currentYear = today.getFullYear();
    let next = new Date(currentYear, d.getMonth(), d.getDate());
    today.setHours(0, 0, 0, 0);
    if (next < today) next.setFullYear(currentYear + 1);
    return next;
  };

  const nearestBirthday = birthdays.length > 0 ? birthdays.sort((a, b) => getNextBirthday(a.date).getTime() - getNextBirthday(b.date).getTime())[0] : null;
  const birthdayDays = nearestBirthday ? Math.ceil((getNextBirthday(nearestBirthday.date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;

  // Event logic
  const nearestEvent = events && events.length > 0 ? events[0] : null;

  const getEventDays = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };
  const eventDays = nearestEvent ? getEventDays(nearestEvent.start) : null;


  return (
    <main className="container">
      {/* Sticky Header */}
      <header className={styles.stickyHeader}>
        <div className={styles.logoRow}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="T3000" style={{ height: 40, width: 'auto' }} />
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}><LogOut size={20} /></button>
        </div>
      </header>

      {/* Status Bar */}
      <section className={styles.statusGrid}>
        <StatusCard type="expired" count={totalExpired} onClick={() => router.push('/status/expired')} />
        <StatusCard type="warning" count={totalWarning} onClick={() => router.push('/status/warning')} />
        <StatusCard type="active" count={totalActive} onClick={() => router.push('/status/active')} />
      </section>

      {/* Widget Grid (3 columns) */}
      <section className={styles.widgetGrid}>
        {/* Events Widget */}
        <DashboardWidget title="Události" icon={Calendar} color="var(--color-events)" onClick={() => router.push('/events')}>
          {nearestEvent ? (
            <>
              <div className={styles.widgetValue}>{nearestEvent.summary}</div>
              <div className={styles.widgetLabel}>
                {eventDays === 0 ? 'Dnes' : eventDays === 1 ? 'Zítra' : `Za ${eventDays} dní`}
              </div>
            </>
          ) : (
            <div className={styles.widgetValue} style={{ color: '#aaa' }}>Žádné akce</div>
          )}
        </DashboardWidget>

        {/* Birthday Widget */}
        <DashboardWidget title="Narozeniny" icon={Gift} color="var(--color-birthdays)" onClick={() => router.push('/birthdays')}>
          {nearestBirthday ? (
            <>
              <div className={styles.widgetValue}>{nearestBirthday.name}</div>
              <div className={styles.widgetLabel}>
                {birthdayDays === 0 ? 'Dnes' : birthdayDays === 1 ? 'Zítra' : `Za ${birthdayDays} dní`}
              </div>
            </>
          ) : (
            <div className={styles.widgetValue} style={{ color: '#aaa' }}>-</div>
          )}
        </DashboardWidget>

        {/* Cooking Widget (Poll) */}
        <PollWidget />
      </section>

    </main>
  );
}
