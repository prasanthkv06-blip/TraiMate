/**
 * Smart booking reminder service.
 * Schedules local notifications for upcoming bookings
 * (24hrs before departure/check-in + morning-of at 8 AM).
 */
import * as Notifications from 'expo-notifications';
import { loadTripsIndex, loadTripLocally, type BookingLocal } from './storageCache';

// ── Notification identifiers ────────────────────────────────────────

function reminderId(bookingId: string, type: 'day_before' | 'morning_of') {
  return `booking_reminder_${bookingId}_${type}`;
}

// ── Build notification content ──────────────────────────────────────

function buildTitle(booking: BookingLocal, type: 'day_before' | 'morning_of'): string {
  switch (booking.type) {
    case 'flight':
      if (type === 'day_before') {
        const route = booking.from && booking.to ? `: ${booking.from} → ${booking.to}` : '';
        return `Flight Tomorrow${route}`;
      }
      return `Flight Today — ${booking.title}`;
    case 'hotel':
      return type === 'day_before'
        ? `Check-in Tomorrow — ${booking.title}`
        : `Check-in Day — ${booking.title}`;
    case 'train':
      return type === 'day_before'
        ? `Train Tomorrow — ${booking.title}`
        : `Train Today — ${booking.title}`;
    case 'activity':
      return type === 'day_before'
        ? `Activity Tomorrow — ${booking.title}`
        : `Activity Today — ${booking.title}`;
    case 'car_rental':
      return type === 'day_before'
        ? `Car Pickup Tomorrow — ${booking.title}`
        : `Car Pickup Today — ${booking.title}`;
    default:
      return `Booking Reminder — ${booking.title}`;
  }
}

function buildBody(booking: BookingLocal, type: 'day_before' | 'morning_of'): string {
  const parts: string[] = [];
  if (booking.provider) parts.push(booking.provider);
  if (booking.confirmationCode) parts.push(`Ref: ${booking.confirmationCode}`);
  if (booking.startTime) parts.push(`at ${booking.startTime}`);
  if (booking.location) parts.push(booking.location);
  return parts.join(' · ') || 'Check your booking details';
}

// ── Schedule reminders for one booking ──────────────────────────────

export async function scheduleBookingReminders(
  _tripId: string,
  booking: BookingLocal,
): Promise<void> {
  if (!booking.startDate) return;

  const startDate = new Date(booking.startDate);
  if (isNaN(startDate.getTime())) return;

  const now = new Date();

  // 24 hours before
  const dayBefore = new Date(startDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(10, 0, 0, 0); // 10 AM day before

  if (dayBefore > now) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: reminderId(booking.id, 'day_before'),
        content: {
          title: buildTitle(booking, 'day_before'),
          body: buildBody(booking, 'day_before'),
          data: { bookingId: booking.id, type: 'booking_reminder' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayBefore },
      });
    } catch {
      // Notification scheduling can fail on simulators / unsupported platforms
    }
  }

  // Morning-of at 8 AM
  const morningOf = new Date(startDate);
  morningOf.setHours(8, 0, 0, 0);

  if (morningOf > now) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: reminderId(booking.id, 'morning_of'),
        content: {
          title: buildTitle(booking, 'morning_of'),
          body: buildBody(booking, 'morning_of'),
          data: { bookingId: booking.id, type: 'booking_reminder' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morningOf },
      });
    } catch {
      // silent
    }
  }
}

// ── Cancel reminders for one booking ────────────────────────────────

export async function cancelBookingReminders(bookingId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId(bookingId, 'day_before'));
    await Notifications.cancelScheduledNotificationAsync(reminderId(bookingId, 'morning_of'));
  } catch {
    // silent
  }
}

// ── Sync all booking reminders (call on app launch) ─────────────────

export async function syncAllBookingReminders(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return;
    }

    // Cancel all existing booking reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('booking_reminder_')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // Re-schedule from all trips
    const trips = await loadTripsIndex();
    for (const trip of trips) {
      const blob = await loadTripLocally(trip.id);
      if (!blob?.bookings) continue;
      for (const booking of blob.bookings) {
        await scheduleBookingReminders(trip.id, booking);
      }
    }
  } catch {
    // Silent — notifications are best-effort
  }
}
