'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/costs', label: 'Costs' },
  { href: '/activity', label: 'Activity' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/system', label: 'System' },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      <div className="flex gap-6 min-w-max px-6 pb-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-all duration-200 pb-2 border-b-2 ${
                isActive
                  ? 'text-white border-blue-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
