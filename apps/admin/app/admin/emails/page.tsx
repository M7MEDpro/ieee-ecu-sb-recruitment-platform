'use client';

/**
 * @file emails/page.tsx
 * @brief Admin Communications Redirector.
 * @details Seamlessly redirects navigation from legacy email routes to the unified WhatsApp & Communications Studio.
 * @author IEEE ECU Student Branch
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmailsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/whatsapp');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-sm text-slate-400">Redirecting to WhatsApp & Groups Studio...</p>
    </div>
  );
}
