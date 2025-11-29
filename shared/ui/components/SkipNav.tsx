/**
 * SkipNav - Accessible skip navigation links for keyboard users
 *
 * Provides links that allow keyboard users to skip past repetitive navigation
 * and jump directly to main content areas. Links are visually hidden by default
 * and become visible when focused via keyboard.
 */

import { useEffect, useRef } from 'react';

interface SkipLink {
  /** Unique identifier for the link */
  id: string;
  /** Text displayed in the skip link */
  label: string;
  /** ID of the target element to skip to */
  targetId: string;
}

interface SkipNavProps {
  /** Array of skip links to render */
  links: SkipLink[];
}

export default function SkipNav({ links }: SkipNavProps) {
  const skipLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure target elements have tabindex="-1" for programmatic focus
    links.forEach((link) => {
      const target = document.getElementById(link.targetId);
      if (target && !target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
    });
  }, [links]);

  const handleSkip = (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      ref={skipLinksRef}
      className="skip-nav"
      role="navigation"
      aria-label="Skip navigation"
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.targetId}`}
          className="skip-nav-link"
          onClick={(e) => handleSkip(e, link.targetId)}
        >
          {link.label}
        </a>
      ))}
      <style>{`
        .skip-nav {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
        }

        .skip-nav-link {
          position: absolute;
          left: -9999px;
          top: 0;
          padding: 0.75rem 1.5rem;
          background: var(--sentinel-primary);
          color: var(--sentinel-text-inverse);
          font-weight: 600;
          text-decoration: none;
          border-radius: 0 0 0.5rem 0;
          box-shadow: var(--sentinel-shadow-lg);
          transition: left var(--prefers-reduced-motion) ease-in-out;
          white-space: nowrap;
        }

        .skip-nav-link:focus {
          left: 0;
          outline: var(--sentinel-focus-ring-width) solid var(--sentinel-focus-ring-light);
          outline-offset: var(--sentinel-focus-ring-offset);
        }

        /* High contrast mode support */
        @media (prefers-contrast: more) {
          .skip-nav-link:focus {
            outline-width: var(--sentinel-focus-ring-width-high-contrast);
            outline-color: white;
            border: 2px solid white;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .skip-nav-link {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
