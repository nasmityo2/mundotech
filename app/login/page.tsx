import { Suspense } from 'react';
import LoginClient from './LoginClient';

function LoginFallback() {
  return (
    <div className="min-h-[calc(100dvh-60px)] sm:min-h-[calc(100dvh-104px)] bg-[#0B0F14]" />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
