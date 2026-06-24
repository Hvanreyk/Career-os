'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu, X, Compass, Calculator } from 'lucide-react';

const tools = [
  {
    label: 'Career Compass',
    href: '/tools/career-compass',
    description: 'Map your path into investment banking.',
    icon: Compass,
    featured: true,
  },
  {
    label: 'Career Calculator',
    href: '/tools/career-calculator',
    description: 'Assess your readiness for finance roles.',
    icon: Calculator,
    featured: false,
  },
];

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Resources', href: '/resources' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? 'glass border-b border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-[0_0_16px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_24px_rgba(212,175,55,0.5)] transition-shadow">
              <span className="text-navy-950 font-bold text-sm font-serif">T</span>
            </div>
            <span className="font-serif font-semibold text-lg tracking-wide text-white">
              TrajectoryOS
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.slice(0, 2).map((link) => (
              <NavLink key={link.href} href={link.href} active={pathname === link.href}>
                {link.label}
              </NavLink>
            ))}

            {/* Tools dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setToolsOpen(true)}
              onMouseLeave={() => setToolsOpen(false)}
            >
              <button
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith('/tools')
                    ? 'text-gold-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Tools
                <motion.span animate={{ rotate: toolsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.span>
              </button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 glass rounded-xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden"
                  >
                    <div className="p-2">
                      {tools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                          <Link
                            key={tool.href}
                            href={tool.href}
                            className={`flex items-start gap-3 p-3 rounded-lg transition-all group ${
                              tool.featured
                                ? 'hover:bg-gold-400/8 border border-transparent hover:border-gold-400/20'
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                tool.featured
                                  ? 'bg-gold-400/10 text-gold-400'
                                  : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div
                                className={`text-sm font-semibold mb-0.5 ${
                                  tool.featured ? 'text-gold-300' : 'text-white'
                                }`}
                              >
                                {tool.label}
                                {tool.featured && (
                                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gold-400/15 text-gold-400 font-medium uppercase tracking-wider">
                                    Featured
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">{tool.description}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {navLinks.slice(2).map((link) => (
              <NavLink key={link.href} href={link.href} active={pathname === link.href}>
                {link.label}
              </NavLink>
            ))}

            <Link
              href="/tools/career-compass"
              className="ml-3 px-5 py-2 bg-gold-400 text-navy-950 font-semibold text-sm rounded-lg hover:bg-gold-300 transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-slate-300 hover:text-white transition-colors p-2"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 glass border-b border-white/10 lg:hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'text-gold-400 bg-gold-400/8'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">
                Tools
              </div>
              {tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {tool.label}
                </Link>
              ))}
              <Link
                href="/tools/career-compass"
                className="mt-3 mx-4 py-3 text-center bg-gold-400 text-navy-950 font-semibold text-sm rounded-lg"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'text-gold-400' : 'text-slate-300 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}
