import { Suspense } from 'react';
import LoginClient from './LoginClient';

function LoginFallback() {
  return (
    <div className="min-h-[45vh] rounded-3xl border border-slate-200/80 bg-white/60 animate-pulse" />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
