import { differenceInDays, isPast, isToday } from 'date-fns';
import { Status } from '@/types';

export const calculateStatus = (validUntil: number | Date, notifyBeforeDays: number = 30): Status => {
    const validDate = new Date(validUntil);

    if (isPast(validDate) && !isToday(validDate)) {
        return 'expired';
    }

    const daysUntilExpiration = differenceInDays(validDate, new Date());

    if (daysUntilExpiration <= notifyBeforeDays) {
        return 'warning';
    }

    return 'active';
};

export const formatDate = (date: number | Date): string => {
    return new Date(date).toLocaleDateString('cs-CZ', { year: 'numeric', month: 'long', day: 'numeric' });
};
