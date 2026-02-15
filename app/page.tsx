'use client';

import Card from "@/components/Card";
import Link from "next/link";
import styles from "./page.module.css";
// import { MOCK_ASSET_ITEMS, MOCK_DOCUMENTS } from "@/lib/mockData"; // REMOVED
import { useAssetItems, useDocuments, useAssets, useSubscriptions, useBirthdays, useCalendarEvents } from "@/hooks/useData";
import { calculateStatus } from "@/utils/status";
import { Car, Home as HomeIcon, CreditCard, FileText, PieChart, Gift, LogOut, Calendar } from 'lucide-react';
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import ImportantEvents from "@/components/ImportantEvents";
import ImportantEventsWidget from "@/components/ImportantEventsWidget";

export default function Home() {
  const router = useRouter();
  const { data: assetItems } = useAssetItems();
  const { data: documents } = useDocuments();
  const { data: assets } = useAssets();
  const { data: subscriptions } = useSubscriptions();
  const { data: birthdays } = useBirthdays();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // ... (previous stats logic) ...
  const getStats = (type: 'car' | 'property' | 'document' | 'subscription') => {
    let itemsToCheck: any[] = [];

    if (type === 'car') {
      itemsToCheck = assetItems.filter(i => {
        const parent = assets.find(a => a.id === i.assetId);
        return parent?.type === 'car';
      });
    } else if (type === 'property') {
      itemsToCheck = assetItems.filter(i => {
        const parent = assets.find(a => a.id === i.assetId);
        return parent?.type === 'property';
      });
    } else if (type === 'document') {
      itemsToCheck = documents;
    } else if (type === 'subscription') {
      itemsToCheck = subscriptions
        .filter(s => s.trackStatus !== false) // Only track if true or undefined (backwards compatibility)
        .map(s => ({ validUntil: s.nextPaymentDate, notifyBeforeDays: 7 }));
    }

    let expired = 0;
    let warning = 0;
    let active = 0;

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

  // Overall Stats
  const totalExpired = carStats.expired + propertyStats.expired + docStats.expired + subStats.expired;
  const totalWarning = carStats.warning + propertyStats.warning + docStats.warning + subStats.warning;
  const totalActive = carStats.active + propertyStats.active + docStats.active + subStats.active;

  // Calculate Nearest Birthday
  const getNextBirthday = (birthDateTimestamp: number) => {
    const birthDate = new Date(birthDateTimestamp);
    const today = new Date();
    const currentYear = today.getFullYear();
    let next = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
    today.setHours(0, 0, 0, 0);
    if (next < today) {
      next.setFullYear(currentYear + 1);
    }
    return next;
  };

  const nearestBirthday = birthdays.length > 0 ? birthdays.sort((a, b) => {
    return getNextBirthday(a.date).getTime() - getNextBirthday(b.date).getTime();
  })[0] : null;

  const nearestBirthdayDate = nearestBirthday ? getNextBirthday(nearestBirthday.date) : null;
  const daysToBirthday = nearestBirthdayDate ? Math.ceil((nearestBirthdayDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)) : null;

  return (
    <main className={`container ${styles.main}`}>
      <header className={styles.header}>
        <div style={{ marginBottom: 24 }}>
          {/* <h1 className={styles.title} style={{ marginBottom: 12 }}>Přehled</h1> */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, position: 'relative' }}>
            <img src="/logo.png" alt="Home Liability" style={{ height: 60, objectFit: 'contain' }} />
            <button
              onClick={handleLogout}
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666'
              }}
              aria-label="Odhlásit se"
            >
              <LogOut size={24} />
            </button>
          </div>

          <div className={styles.semaphoreBox}>
            <Link href="/status/expired" className={styles.semaphoreItem} style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <span className={styles.dotRed}>🔴</span>
              <span className={styles.semaphoreCount}>{totalExpired}</span>
            </Link>
            <div className={styles.semaphoreDivider}></div>
            <Link href="/status/warning" className={styles.semaphoreItem} style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <span className={styles.dotOrange}>🟠</span>
              <span className={styles.semaphoreCount}>{totalWarning}</span>
            </Link>
            <div className={styles.semaphoreDivider}></div>
            <Link href="/status/active" className={styles.semaphoreItem} style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <span className={styles.dotGreen}>🟢</span>
              <span className={styles.semaphoreCount}>{totalActive}</span>
            </Link>
          </div>

          {/* Nearest Birthday Widget */}
          {nearestBirthday && (
            <div className={styles.birthdayBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                {nearestBirthday.photoUrl ? (
                  <img src={nearestBirthday.photoUrl} alt={nearestBirthday.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                ) : <span style={{ fontSize: 24 }}>🎂</span>}

                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {daysToBirthday === 0 ? 'Dnes slaví:' : `Za ${daysToBirthday} dní slaví:`}
                  </div>
                  <div style={{ fontSize: 16, color: '#007AFF' }}>
                    {nearestBirthday.name} ({getNextBirthday(nearestBirthday.date).getFullYear() - new Date(nearestBirthday.date).getFullYear()} let)
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4, width: '100%' }}>
                Nezapomeň na dárek 🎁, nejsi pozvaný? Připomeň se!
              </div>
            </div>
          )}

          {/* Important Events Widget */}
          <ImportantEventsWidget />
        </div>
      </header>

      <section className={styles.grid}>
        <Link href="/assets/cars" className={styles.linkCard}>
          <Card title="Auta" icon={<Car size={24} />} status={carStats.expired > 0 ? 'expired' : undefined} headerAction={carStats.expired > 0 ? <span className={styles.statusDotRed}>{carStats.expired}</span> : undefined}>
            <p>Správa vozidel a STK</p>
          </Card>
        </Link>
        <Link href="/assets/properties" className={styles.linkCard}>
          <Card title="Nemovitosti" icon={<HomeIcon size={24} />} status={propertyStats.expired > 0 ? 'expired' : undefined} headerAction={propertyStats.expired > 0 ? <span className={styles.statusDotRed}>{propertyStats.expired}</span> : undefined}>
            <p>Pojištění, daně, revize</p>
          </Card>
        </Link>
        <Link href="/subscriptions" className={styles.linkCard}>
          <Card title="Předplatné" icon={<CreditCard size={24} />} status={subStats.expired > 0 ? 'expired' : undefined} headerAction={subStats.expired > 0 ? <span className={styles.statusDotRed}>{subStats.expired}</span> : undefined}>
            <p>Netflix, Spotify, atd.</p>
          </Card>
        </Link>
        <Link href="/documents" className={styles.linkCard}>
          <Card title="Doklady" icon={<FileText size={24} />} status={docStats.expired > 0 ? 'expired' : undefined} headerAction={docStats.expired > 0 ? <span className={styles.statusDotRed}>{docStats.expired}</span> : undefined}>
            <p>Občanské průkazy, pasy</p>
          </Card>
        </Link>
        <Link href="/birthdays" className={styles.linkCard}>
          <Card title="Narozeniny" icon={<Gift size={24} />} headerAction={daysToBirthday !== null && daysToBirthday <= 7 ? <span className={styles.statusDotRed}>!</span> : undefined}>
            <p>Oslavy a výročí</p>
          </Card>
        </Link>
        <Link href="/events" className={styles.linkCard}>
          <Card title="Události" icon={<Calendar size={24} />}>
            <p>Informace o událostech z kalendáře</p>
          </Card>
        </Link>
        <Link href="/cards" className={styles.linkCard}>
          <Card title="Karty" icon={<CreditCard size={24} />}>
            <p>Slevové a věrnostní karty</p>
          </Card>
        </Link>
        <Link href="/finance" className={styles.linkCard}>
          <Card title="Statistiky" icon={<PieChart size={24} />}>
            <p>Přehled nákladů</p>
          </Card>
        </Link>
      </section>
    </main>
  );
}
