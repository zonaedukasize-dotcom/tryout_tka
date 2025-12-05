// app/layout.tsx (atau buat wrapper khusus)

import { Suspense } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (

        <Suspense fallback={<div>Loading...</div>}>
          {children}
        </Suspense>

  );
}