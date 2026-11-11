'use client';

import { Menu, Phone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { clinic, navLinks } from '@/lib/clinic-content';
import BookButton from './BookButton';
import ToothLogo from './ToothLogo';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Esc closes the mobile menu and returns focus to the button that opened it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <a className="site-logo" href="#main">
          <ToothLogo className="site-logo-icon" />
          <span>{clinic.name}</span>
        </a>

        <nav id="site-menu" className={`site-menu${menuOpen ? ' is-open' : ''}`} aria-label="Main">
          <ul>
            {navLinks.map((l) => (
              <li key={l.href + l.label}>
                <a href={l.href} onClick={() => setMenuOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header-actions">
          <a className="btn btn-secondary site-phone-btn" href={clinic.phoneHref} aria-label={`Call us on ${clinic.phone}`}>
            <Phone className="icon" aria-hidden="true" />
            <span className="site-phone-text" aria-hidden="true">
              {clinic.phone}
            </span>
          </a>
          <BookButton className="btn btn-primary site-header-book">Book appointment</BookButton>
          <button
            ref={menuButton}
            type="button"
            className="site-menu-btn"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="icon" aria-hidden="true" /> : <Menu className="icon" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
