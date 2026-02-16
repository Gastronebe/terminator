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
import { differenceInCalendarDays } from 'date-fns';
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

  // Celebration logic (Birthdays & Name Days)
  const getNextOccurrence = (date: number) => {
    const d = new Date(date);
    const today = new Date();
    const currentYear = today.getFullYear();
    let next = new Date(currentYear, d.getMonth(), d.getDate());
    today.setHours(0, 0, 0, 0);
    if (next < today) next.setFullYear(currentYear + 1);
    return next;
  };

  const allCelebrations: any[] = [];
  birthdays.forEach(b => {
    // Add Birthday
    allCelebrations.push({
      id: `${b.id}-bday`,
      name: b.name,
      photoUrl: b.photoUrl,
      date: getNextOccurrence(b.date),
      type: 'birthday',
      icon: '🎂'
    });
    // Add Name Day if exists
    if (b.nameDayDate) {
      allCelebrations.push({
        id: `${b.id}-nday`,
        name: b.name,
        photoUrl: b.photoUrl,
        date: getNextOccurrence(b.nameDayDate),
        type: 'nameday',
        icon: '🌸'
      });
    }
  });

  const sortedCelebrations = allCelebrations.sort((a, b) => a.date.getTime() - b.date.getTime());
  const nearestCelebrations = sortedCelebrations.length > 0
    ? sortedCelebrations.filter(c => differenceInCalendarDays(c.date, sortedCelebrations[0].date) === 0)
    : [];

  // Event logic
  const nearestEvent = events && events.length > 0 ? events[0] : null;
  const eventDays = nearestEvent ? differenceInCalendarDays(new Date(nearestEvent.start), new Date()) : null;

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
                {eventDays === 0 ? 'Dnes' : new Date(nearestEvent.start).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
              </div>
            </>
          ) : (
            <div className={styles.widgetValue} style={{ color: '#aaa' }}>Žádné akce</div>
          )}
        </DashboardWidget>

        {/* Celebrations Widget */}
        <DashboardWidget title="Oslavy" icon={Gift} color="var(--color-birthdays)" onClick={() => router.push('/birthdays')}>
          {nearestCelebrations.length > 0 ? (
            <div className={styles.birthdayContainer}>
              {nearestCelebrations.map((cel, idx) => (
                <div key={cel.id} className={styles.birthdayRow} style={{ marginTop: idx > 0 ? 8 : 0 }}>
                  {cel.photoUrl && (
                    <img src={cel.photoUrl} alt={cel.name} className={styles.birthdayPhoto} />
                  )}
                  <div>
                    <div className={styles.widgetValue}>
                      <span style={{ marginRight: 6 }}>{cel.icon}</span>
                      {cel.name}
                    </div>
                    <div className={styles.widgetLabel}>
                      {differenceInCalendarDays(cel.date, new Date()) === 0 ? 'Dnes' : cel.date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
              <div className={styles.birthdayReminder}>
                Už máš dárek? Pokud tě nikdo nepozval, připomeň se!
              </div>
            </div>
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
