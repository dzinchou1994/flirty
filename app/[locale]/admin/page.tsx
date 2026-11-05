import type { Metadata } from 'next';
import { AdminQueueClient } from '@/components/admin/AdminQueueClient';

export const metadata: Metadata = {
  title: 'Moderation',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <h1>მოდერაცია</h1>
      <p className="muted">რეაგირების მიზანი: 24 საათი.</p>
      <AdminQueueClient />
    </>
  );
}
