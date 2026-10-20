import React, { useEffect, useId, useRef, useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import type { Lang } from '../types/menu';
import { LANGUAGES } from '../i18n/ui';
import { LangFlag } from './flags';

interface LangDropdownProps {
  lang: Lang;
  ariaLabel: string;
  onSelect: (lang: Lang) => void;
}

/** Language picker: one button (flag + name) that opens a listbox of the 4 languages. */
export const LangDropdown: React.FC<LangDropdownProps> = ({ lang, ariaLabel, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listId = useId();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  const openList = () => {
    setFocusIndex(Math.max(0, LANGUAGES.findIndex((l) => l.code === lang)));
    setOpen(true);
  };

  const choose = (code: Lang) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (code !== lang) onSelect(code);
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((i) => (i + 1) % LANGUAGES.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(LANGUAGES[focusIndex].code);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className="online-lang-dropdown" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`online-lang-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${ariaLabel}: ${current.fullName}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList();
          }
        }}
      >
        <LangFlag lang={current.code} className="online-lang-flag" />
        <span className="online-lang-name">{current.fullName}</span>
        <span className="online-lang-code">{current.shortLabel}</span>
        <CaretDown className="online-lang-caret" weight="bold" aria-hidden="true" />
      </button>

      {open && (
        <ul
          id={listId}
          className="online-lang-menu"
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={`${listId}-${LANGUAGES[focusIndex].code}`}
          onKeyDown={onListKeyDown}
        >
          {LANGUAGES.map((l, i) => {
            const selected = l.code === lang;
            return (
              <li
                key={l.code}
                id={`${listId}-${l.code}`}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="option"
                aria-selected={selected}
                tabIndex={i === focusIndex ? 0 : -1}
                lang={l.code}
                data-lang={l.code}
                className={`online-lang-option ${selected ? 'is-selected' : ''}`}
                onClick={() => choose(l.code)}
                onMouseEnter={() => setFocusIndex(i)}
              >
                <LangFlag lang={l.code} className="online-lang-flag" />
                <span>{l.fullName}</span>
                {selected && <Check className="online-lang-check" weight="bold" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
