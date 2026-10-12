'use client';

/**
 * @file templates/page.tsx
 * @brief Communications Template Editor Redirector.
 * @details Directs administrative workflows to the centralized messaging templates workbench.
 * @author IEEE ECU Student Branch
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TemplatesRedirect() {
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
