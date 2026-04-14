import {
  collection,
  addDoc,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import { detectDevice } from './device';

export async function logClick(slug: string): Promise<void> {
  const device = detectDevice(navigator.userAgent);
  const referrer = document.referrer || 'direct';

  await Promise.all([
    updateDoc(doc(db, 'links', slug), { clicks: increment(1) }),
    addDoc(collection(db, 'links', slug, 'events'), {
      timestamp: serverTimestamp(),
      referrer,
      ua: navigator.userAgent,
      device,
    }),
  ]);
}
