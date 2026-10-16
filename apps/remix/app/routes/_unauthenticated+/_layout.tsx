import backgroundPattern from '@documenso/assets/images/background-pattern.png';
import { Link, Outlet } from 'react-router';

import { PublicLegalLinks } from '~/components/general/public-legal-links';

export default function Layout() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden px-4 py-8 md:p-12">
      {/* グローバルブランドヘッダー */}
      <header className="z-10 mb-8 flex w-full max-w-7xl items-center justify-between">
        <Link to="/" className="group flex items-center gap-x-3">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500/20 transition-transform group-hover:scale-105">
            <img src="/images/denkei-mascot-circle.webp" alt="デンケイ" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-foreground text-lg leading-tight tracking-tight sm:text-xl">
                デンケイ
              </span>
              <span className="rounded bg-red-600 px-1.5 py-0.5 font-black text-[9px] text-white uppercase tracking-wider">
                電子契約
              </span>
            </div>
            <span className="font-medium text-[11px] text-muted-foreground">中小企業特化・月額2,980円（100件）</span>
          </div>
        </Link>
        <Link
          to="/"
          className="font-bold text-muted-foreground text-xs transition-colors hover:text-foreground sm:text-sm"
        >
          ← トップページへ
        </Link>
      </header>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="absolute -inset-[min(600px,max(400px,60vw))] -z-[1] flex items-center justify-center opacity-70">
          <img
            src={backgroundPattern}
            alt="background pattern"
            className="dark:brightness-95 dark:contrast-[70%] dark:invert dark:sepia"
            style={{
              mask: 'radial-gradient(rgba(255, 255, 255, 1) 0%, transparent 80%)',
              WebkitMask: 'radial-gradient(rgba(255, 255, 255, 1) 0%, transparent 80%)',
            }}
          />
        </div>

        <div className="relative flex w-full items-center justify-center">
          <Outlet />
        </div>
      </div>

      <footer className="z-10 mt-8 w-full">
        <PublicLegalLinks />
      </footer>
    </main>
  );
}
