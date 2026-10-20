import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  getPublicMenuUrl,
  isSupabaseMode,
  loadMenu,
  loadMenuHistory,
  Menu,
  MenuCategory,
  MenuConflictError,
  MenuHistoryEntry,
  MenuItem,
  MenuItemTranslation,
  MenuNote,
  PrintLang,
  REMOTE_CONFLICT_MESSAGE,
  resetLocalMenu,
  saveMenu,
  saveMenuLocalSync,
  seedInitialSupabaseMenu,
  setLastKnownUpdatedAt,
  signInAdmin,
  signOutAdmin,
  TranslationLang,
} from '../data/store';
import {
  ADMIN_AUTO_LOCK_MS,
  createInactivityLockTimer,
  getConfiguredAdminEmail,
  verifyLocalAdminPassword,
} from './auth';
import { isValidPrintLang, PRINT_PREFS_STORAGE_KEY } from '../i18n/ui';
import { LangFlag } from '../online/flags';
import { Logo, DiamondMotif } from '../components/Logo';
import defaultMenuData from '../../public/menu.json';

const initialMenu = defaultMenuData as unknown as Menu;

type PdfModalFormat = 'a3' | 'a4' | 'card';

interface PrintPrefs {
  format: PdfModalFormat;
  lang: PrintLang;
}

const DEFAULT_PRINT_PREFS: PrintPrefs = {
  format: 'a3',
  lang: 'ru-kk',
};

function loadPrintPrefs(): PrintPrefs {
  if (typeof window === 'undefined') return DEFAULT_PRINT_PREFS;
  try {
    const raw = localStorage.getItem(PRINT_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PRINT_PREFS;
    const parsed = JSON.parse(raw);
    const fmt = parsed?.format;
    const validFmt: PdfModalFormat =
      fmt === 'a3' || fmt === 'a4' || fmt === 'card' ? fmt : 'a3';
    const validLang: PrintLang = isValidPrintLang(parsed?.lang)
      ? parsed.lang
      : 'ru-kk';
    return { format: validFmt, lang: validLang };
  } catch {
    return DEFAULT_PRINT_PREFS;
  }
}

function savePrintPrefs(prefs: PrintPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRINT_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

function formatTimeHHMM(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

interface AdminGateProps {
  restaurantName: string;
  supabaseActive: boolean;
  configuredEmail: string;
  isLockedByInactivity?: boolean;
  hasUnsavedChanges?: boolean;
  onAuthenticated: (user: { email: string }) => void;
}

const AdminGate: React.FC<AdminGateProps> = ({
  restaurantName,
  supabaseActive,
  configuredEmail,
  isLockedByInactivity = false,
  hasUnsavedChanges = false,
  onAuthenticated,
}) => {
  const [email, setEmail] = useState(configuredEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (supabaseActive) {
        const targetEmail = (configuredEmail || email).trim();
        const res = await signInAdmin(targetEmail, password);
        if (res.error) {
          setError('Неверный пароль');
        } else if (res.email) {
          setPassword('');
          onAuthenticated({ email: res.email });
        }
      } else {
        const ok = await verifyLocalAdminPassword(password);
        if (ok) {
          setPassword('');
          onAuthenticated({ email: 'local' });
        } else {
          setError('Неверный пароль');
        }
      }
    } catch {
      setError('Неверный пароль');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-gate-page">
      <div className="admin-gate-card">
        <div className="admin-gate-logo-wrap">
          <Logo className="admin-gate-logo" title={restaurantName} />
        </div>
        <div className="admin-gate-kicker">
          <DiamondMotif className="diamond-icon" />
          <span>{restaurantName}</span>
          <DiamondMotif className="diamond-icon" />
        </div>
        <h1 className="admin-gate-title">
          {isLockedByInactivity ? 'Сессия заблокирована' : 'Вход в панель управления'}
        </h1>
        <p className="admin-gate-subtitle">
          {isLockedByInactivity
            ? 'Прошло 15 минут без активности. Введите пароль, чтобы продолжить.'
            : supabaseActive
              ? configuredEmail
                ? `Облачный режим · ${configuredEmail}`
                : 'Введите данные администратора Supabase'
              : 'Введите пароль администратора для редактирования меню'}
        </p>

        {isLockedByInactivity && hasUnsavedChanges && (
          <div className="admin-gate-lock-notice" role="status">
            Несохранённые изменения сохранены в памяти и восстановятся после входа.
          </div>
        )}

        <form className="admin-gate-form" onSubmit={handleSubmit}>
          {supabaseActive && !configuredEmail && (
            <div className="admin-field">
              <label className="admin-field-label" htmlFor="admin-gate-email">
                Email
              </label>
              <input
                id="admin-gate-email"
                type="email"
                className="admin-input"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          )}

          <div className="admin-field">
            <label className="admin-field-label" htmlFor="admin-gate-password">
              Пароль
            </label>
            <input
              id="admin-gate-password"
              type="password"
              className="admin-input"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              required
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="admin-gate-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-save-btn admin-gate-submit"
            disabled={submitting}
          >
            {submitting ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <div className="admin-gate-footer">
          <a className="admin-gate-back" href="./index.html">
            ← Открыть гостевое меню
          </a>
        </div>
      </div>
    </div>
  );
};

interface ConflictState {
  message: string;
  remoteUpdatedAt: string;
  remoteMenu?: Menu;
}

export const AdminApp: React.FC = () => {
  const [menu, setMenu] = useState<Menu>(initialMenu);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(JSON.stringify(initialMenu));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => formatTimeHHMM());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);

  // PDF Download Modal state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [printPrefs, setPrintPrefs] = useState<PrintPrefs>(loadPrintPrefs);
  const pdfModalRef = useRef<HTMLDivElement | null>(null);
  const pdfTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Confirm states in UI (never window.confirm)
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const [confirmDeleteItemKey, setConfirmDeleteItemKey] = useState<string | null>(null);
  const [confirmDeleteNoteIdx, setConfirmDeleteNoteIdx] = useState<number | null>(null);

  // Auth state lives strictly in React memory (never persisted to storage)
  const supabaseActive = isSupabaseMode();
  const configuredEmail = getConfiguredAdminEmail();
  const [adminUser, setAdminUser] = useState<{ email: string } | null>(null);
  const [isLockedByInactivity, setIsLockedByInactivity] = useState(false);

  // Version history state (Supabase mode only)
  const [historyEntries, setHistoryEntries] = useState<MenuHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Guest QR code preview state
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentSnapshot = JSON.stringify(menu);
  const isDirty = currentSnapshot !== savedSnapshot;
  const publicMenuUrl = getPublicMenuUrl(menu);

  const menuRef = useRef(menu);
  menuRef.current = menu;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const adminUserRef = useRef(adminUser);
  adminUserRef.current = adminUser;
  const isSavingRef = useRef(isSaving);
  isSavingRef.current = isSaving;
  const autosaveTimerRef = useRef<number | null>(null);
  const initialLoadDoneRef = useRef(false);

  const refreshHistory = useCallback(async () => {
    if (!supabaseActive) return;
    setHistoryLoading(true);
    try {
      const items = await loadMenuHistory(20);
      setHistoryEntries(items);
    } finally {
      setHistoryLoading(false);
    }
  }, [supabaseActive]);

  // Initial menu load on mount
  useEffect(() => {
    let mounted = true;
    loadMenu()
      .then((loaded) => {
        if (mounted) {
          setMenu(loaded);
          setSavedSnapshot(JSON.stringify(loaded));
          setLastSavedTime(formatTimeHHMM());
          initialLoadDoneRef.current = true;
        }
      })
      .catch((err) => {
        console.error(err);
        if (mounted) {
          initialLoadDoneRef.current = true;
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Load version history when authenticated in Supabase mode
  useEffect(() => {
    if (supabaseActive && adminUser) {
      void refreshHistory();
    }
  }, [supabaseActive, adminUser, refreshHistory]);

  // Flush pending local autosave synchronously on unload; best-effort signOut in Supabase mode
  useEffect(() => {
    const handleUnload = (e: BeforeUnloadEvent | PageTransitionEvent) => {
      if (!supabaseActive) {
        if (adminUserRef.current && isDirtyRef.current) {
          saveMenuLocalSync(menuRef.current);
        }
        return;
      }
      if (e.type === 'beforeunload' && adminUserRef.current && isDirtyRef.current) {
        const beforeEvt = e as BeforeUnloadEvent;
        beforeEvt.preventDefault();
        beforeEvt.returnValue = '';
      }
      void signOutAdmin();
    };
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [supabaseActive]);

  // Auto-lock after 15 minutes of inactivity in admin (keeping unsaved edits in memory)
  useEffect(() => {
    if (!adminUser) return;

    const lockTimer = createInactivityLockTimer(() => {
      if (supabaseActive) {
        void signOutAdmin();
      }
      setIsLockedByInactivity(true);
      setAdminUser(null);
    }, ADMIN_AUTO_LOCK_MS);

    const handleActivity = () => {
      lockTimer.recordActivity();
    };

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'mousemove',
      'touchstart',
      'scroll',
      'focus',
      'input',
    ];

    for (const evt of events) {
      window.addEventListener(evt, handleActivity, { passive: true });
    }

    return () => {
      lockTimer.dispose();
      for (const evt of events) {
        window.removeEventListener(evt, handleActivity);
      }
    };
  }, [adminUser, supabaseActive]);

  // Generate QR SVG for Admin QR section whenever publicMenuUrl changes
  useEffect(() => {
    if (!publicMenuUrl) {
      setQrSvg('');
      return;
    }

    let active = true;
    QRCode.toString(publicMenuUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#1D1A17',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch((err) => {
        console.warn('Не удалось сгенерировать QR-код:', err);
        if (active) setQrSvg('');
      });

    return () => {
      active = false;
    };
  }, [publicMenuUrl]);

  const showNotice = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const performSave = useCallback(
    async (targetMenu: Menu, options?: { isAuto?: boolean; force?: boolean }) => {
      clearAutosaveTimer();
      const snapshotToSave = JSON.stringify(targetMenu);
      setIsSaving(true);
      setSaveError(null);
      if (!options?.isAuto) {
        setConflictState(null);
      }
      try {
        await saveMenu(targetMenu, options?.force ? { force: true } : undefined);
        setSavedSnapshot(snapshotToSave);
        setLastSavedTime(formatTimeHHMM());
        setSaveError(null);
        if (!options?.isAuto) {
          showNotice('success', 'Изменения успешно сохранены');
        }
        if (supabaseActive) {
          void refreshHistory();
        }
      } catch (err) {
        if (err instanceof MenuConflictError) {
          setConflictState({
            message: REMOTE_CONFLICT_MESSAGE,
            remoteUpdatedAt: err.remoteUpdatedAt,
            remoteMenu: err.remoteMenu,
          });
        } else {
          const msg =
            err instanceof Error ? err.message : 'Ошибка при сохранении меню';
          setSaveError(msg);
          if (!options?.isAuto) {
            showNotice('error', msg);
          }
        }
      } finally {
        setIsSaving(false);
      }
    },
    [clearAutosaveTimer, refreshHistory, showNotice, supabaseActive]
  );

  // Autosave: 800 ms debounce in local mode; 3000 ms idle debounce in Supabase mode
  useEffect(() => {
    if (!adminUser || !initialLoadDoneRef.current || !isDirty || conflictState) {
      clearAutosaveTimer();
      return;
    }

    const delayMs = supabaseActive ? 3000 : 800;

    const scheduleAutosave = () => {
      clearAutosaveTimer();
      autosaveTimerRef.current = window.setTimeout(() => {
        autosaveTimerRef.current = null;
        if (adminUserRef.current && isDirtyRef.current && !isSavingRef.current) {
          void performSave(menuRef.current, { isAuto: true });
        }
      }, delayMs);
    };

    scheduleAutosave();

    if (!supabaseActive) {
      return () => {
        clearAutosaveTimer();
      };
    }

    // In Supabase mode, reset the 3s timer on user activity so it only saves when idle
    const idleResetEvents: Array<keyof WindowEventMap> = [
      'keydown',
      'pointerdown',
      'input',
    ];
    const onUserActive = () => {
      if (isDirtyRef.current && !isSavingRef.current) {
        scheduleAutosave();
      }
    };
    for (const evt of idleResetEvents) {
      window.addEventListener(evt, onUserActive, { passive: true });
    }
    return () => {
      clearAutosaveTimer();
      for (const evt of idleResetEvents) {
        window.removeEventListener(evt, onUserActive);
      }
    };
  }, [
    adminUser,
    clearAutosaveTimer,
    conflictState,
    currentSnapshot,
    isDirty,
    performSave,
    supabaseActive,
  ]);

  const handleSave = async () => {
    await performSave(menu, { isAuto: false });
  };

  const openPdfModal = (preselectFormat?: PdfModalFormat) => {
    const current = loadPrintPrefs();
    const nextPrefs: PrintPrefs = preselectFormat
      ? { ...current, format: preselectFormat }
      : current;
    setPrintPrefs(nextPrefs);
    savePrintPrefs(nextPrefs);
    setPdfModalOpen(true);
  };

  const closePdfModal = useCallback(() => {
    setPdfModalOpen(false);
    window.setTimeout(() => {
      pdfTriggerRef.current?.focus();
    }, 0);
  }, []);

  const handleSelectPdfFormat = (format: PdfModalFormat) => {
    setPrintPrefs((prev) => {
      const next = { ...prev, format };
      savePrintPrefs(next);
      return next;
    });
  };

  const handleSelectPdfLang = (lang: PrintLang) => {
    setPrintPrefs((prev) => {
      const next = { ...prev, lang };
      savePrintPrefs(next);
      return next;
    });
  };

  const handleOpenForPrint = () => {
    if (!supabaseActive && isDirtyRef.current) {
      saveMenuLocalSync(menuRef.current);
      setSavedSnapshot(JSON.stringify(menuRef.current));
      setLastSavedTime(formatTimeHHMM());
    }
    savePrintPrefs(printPrefs);
    const targetUrl = `./print.html?format=${encodeURIComponent(
      printPrefs.format
    )}&lang=${encodeURIComponent(printPrefs.lang)}`;
    window.open(targetUrl, '_blank');
    setPdfModalOpen(false);
  };

  // Focus trap and Escape key handling for PDF modal
  useEffect(() => {
    if (!pdfModalOpen) return;

    const modalEl = pdfModalRef.current;
    const focusables = modalEl?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables && focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePdfModal();
        return;
      }
      if (e.key === 'Tab' && modalEl) {
        const nodes = Array.from(
          modalEl.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first || !modalEl.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !modalEl.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pdfModalOpen, closePdfModal]);

  const handleResolveConflictLoadRemote = async () => {
    clearAutosaveTimer();
    setIsSaving(true);
    try {
      if (conflictState?.remoteMenu) {
        setLastKnownUpdatedAt(conflictState.remoteUpdatedAt);
        setMenu(conflictState.remoteMenu);
        setSavedSnapshot(JSON.stringify(conflictState.remoteMenu));
      } else {
        const fresh = await loadMenu();
        setMenu(fresh);
        setSavedSnapshot(JSON.stringify(fresh));
      }
      setLastSavedTime(formatTimeHHMM());
      setSaveError(null);
      setConflictState(null);
      showNotice('success', 'Загружена свежая версия меню с другого устройства');
      if (supabaseActive) {
        void refreshHistory();
      }
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Не удалось загрузить свежую версию'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolveConflictOverwrite = async () => {
    await performSave(menu, { isAuto: false, force: true });
    setConflictState(null);
  };

  const handleRestoreHistoryEntry = (entry: MenuHistoryEntry) => {
    setMenu(entry.data);
    setConflictState(null);
    const formattedDate = entry.saved_at
      ? new Date(entry.saved_at).toLocaleString('ru-RU')
      : `#${entry.id}`;
    showNotice(
      'success',
      `Версия от ${formattedDate} загружена в редактор. Нажмите «Сохранить» для применения.`
    );
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(menu, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.categories)) {
          throw new Error('Некорректный формат файла menu.json');
        }
        setMenu(parsed);
        showNotice('success', 'JSON загружен в редактор.');
      } catch (err) {
        showNotice(
          'error',
          err instanceof Error ? err.message : 'Не удалось прочитать JSON'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetToStatic = async () => {
    clearAutosaveTimer();
    try {
      const fresh = await resetLocalMenu();
      setMenu(fresh);
      setSavedSnapshot(JSON.stringify(fresh));
      setLastSavedTime(formatTimeHHMM());
      setSaveError(null);
      setConfirmReset(false);
      showNotice('success', 'Меню сброшено к исходному файлу menu.json');
    } catch {
      showNotice('error', 'Не удалось сбросить меню');
    }
  };

  const handleSeedSupabase = async () => {
    clearAutosaveTimer();
    try {
      const seeded = await seedInitialSupabaseMenu();
      setMenu(seeded);
      setSavedSnapshot(JSON.stringify(seeded));
      setLastSavedTime(formatTimeHHMM());
      setSaveError(null);
      setConflictState(null);
      showNotice('success', 'Начальное меню загружено в базу Supabase');
      void refreshHistory();
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Ошибка загрузки начального меню'
      );
    }
  };

  const handleLogout = async () => {
    clearAutosaveTimer();
    if (!supabaseActive && isDirtyRef.current) {
      saveMenuLocalSync(menuRef.current);
      setSavedSnapshot(JSON.stringify(menuRef.current));
      setLastSavedTime(formatTimeHHMM());
    }
    if (supabaseActive) {
      await signOutAdmin();
    }
    setIsLockedByInactivity(false);
    setAdminUser(null);
  };

  // QR actions
  const handleDownloadQrPng = async () => {
    if (!publicMenuUrl) return;
    try {
      const dataUrl = await QRCode.toDataURL(publicMenuUrl, {
        width: 1024,
        margin: 2,
        color: {
          dark: '#1D1A17',
          light: '#FFFFFF',
        },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'halal-palau-qr.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      showNotice('error', 'Не удалось скачать PNG QR-кода');
    }
  };

  const handleDownloadQrSvg = async () => {
    if (!publicMenuUrl) return;
    try {
      const svgString =
        qrSvg ||
        (await QRCode.toString(publicMenuUrl, {
          type: 'svg',
          margin: 2,
          color: {
            dark: '#1D1A17',
            light: '#FFFFFF',
          },
        }));
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'halal-palau-qr.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showNotice('error', 'Не удалось скачать SVG QR-кода');
    }
  };

  const handleCopyQrLink = async () => {
    if (!publicMenuUrl) return;
    try {
      await navigator.clipboard.writeText(publicMenuUrl);
      setCopiedLink(true);
      showNotice('success', 'Ссылка на меню скопирована');
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showNotice('error', 'Не удалось скопировать ссылку');
    }
  };

  // Category operations
  const handleAddCategory = () => {
    const newId = `category-${Date.now()}`;
    const newCat: MenuCategory = {
      id: newId,
      title: 'Новый раздел',
      titleKz: '',
      items: [{ name: 'Новое блюдо', price: '1000' }],
    };
    setMenu((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));
    window.setTimeout(() => {
      document.getElementById(`admin-cat-${newId}`)?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleRenameCategory = (catIndex: number, title: string) => {
    setMenu((prev) => {
      const next = [...prev.categories];
      next[catIndex] = { ...next[catIndex], title };
      return { ...prev, categories: next };
    });
  };

  const handleRenameCategoryKz = (catIndex: number, titleKz: string) => {
    setMenu((prev) => {
      const next = [...prev.categories];
      const current = next[catIndex];
      const nextI18n = {
        ...(current.i18n ?? {}),
        kk: { ...(current.i18n?.kk ?? {}), title: titleKz },
      };
      next[catIndex] = { ...current, titleKz, i18n: nextI18n };
      return { ...prev, categories: next };
    });
  };

  const handleRenameCategoryI18n = (
    catIndex: number,
    lang: TranslationLang,
    title: string
  ) => {
    if (lang === 'kk') {
      handleRenameCategoryKz(catIndex, title);
      return;
    }
    setMenu((prev) => {
      const next = [...prev.categories];
      const current = next[catIndex];
      const nextI18n = {
        ...(current.i18n ?? {}),
        [lang]: { ...(current.i18n?.[lang] ?? {}), title },
      };
      next[catIndex] = { ...current, i18n: nextI18n };
      return { ...prev, categories: next };
    });
  };

  const handleMoveCategory = (catIndex: number, direction: -1 | 1) => {
    setMenu((prev) => {
      const targetIndex = catIndex + direction;
      if (targetIndex < 0 || targetIndex >= prev.categories.length) return prev;
      const next = [...prev.categories];
      const [moved] = next.splice(catIndex, 1);
      next.splice(targetIndex, 0, moved);
      return { ...prev, categories: next };
    });
  };

  const handleDeleteCategory = (catId: string) => {
    setMenu((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== catId),
    }));
    setConfirmDeleteCatId(null);
  };

  // Item operations
  const handleUpdateItem = (
    catIndex: number,
    itemIndex: number,
    patch: Partial<MenuItem>
  ) => {
    setMenu((prev) => {
      const nextCats = [...prev.categories];
      const cat = nextCats[catIndex];
      const nextItems = [...cat.items];
      const updated = { ...nextItems[itemIndex], ...patch };
      if (!updated.portion) delete updated.portion;
      if (!updated.description) delete updated.description;
      if (!updated.hidden) delete updated.hidden;
      nextItems[itemIndex] = updated;
      nextCats[catIndex] = { ...cat, items: nextItems };
      return { ...prev, categories: nextCats };
    });
  };

  const handleUpdateItemI18n = (
    catIndex: number,
    itemIndex: number,
    lang: TranslationLang,
    patch: Partial<MenuItemTranslation>
  ) => {
    setMenu((prev) => {
      const nextCats = [...prev.categories];
      const cat = nextCats[catIndex];
      const nextItems = [...cat.items];
      const item = nextItems[itemIndex];
      const currentLangObj = { ...(item.i18n?.[lang] ?? {}), ...patch };
      if (!currentLangObj.name) delete currentLangObj.name;
      if (!currentLangObj.portion) delete currentLangObj.portion;
      if (!currentLangObj.description) delete currentLangObj.description;
      const nextI18n = {
        ...(item.i18n ?? {}),
        [lang]: currentLangObj,
      };
      nextItems[itemIndex] = { ...item, i18n: nextI18n };
      nextCats[catIndex] = { ...cat, items: nextItems };
      return { ...prev, categories: nextCats };
    });
  };

  const handleAddItem = (catIndex: number) => {
    setMenu((prev) => {
      const nextCats = [...prev.categories];
      const cat = nextCats[catIndex];
      nextCats[catIndex] = {
        ...cat,
        items: [...cat.items, { name: 'Новое блюдо', price: '1000' }],
      };
      return { ...prev, categories: nextCats };
    });
  };

  const handleMoveItem = (catIndex: number, itemIndex: number, direction: -1 | 1) => {
    setMenu((prev) => {
      const nextCats = [...prev.categories];
      const cat = nextCats[catIndex];
      const target = itemIndex + direction;
      if (target < 0 || target >= cat.items.length) return prev;
      const nextItems = [...cat.items];
      const [moved] = nextItems.splice(itemIndex, 1);
      nextItems.splice(target, 0, moved);
      nextCats[catIndex] = { ...cat, items: nextItems };
      return { ...prev, categories: nextCats };
    });
  };

  const handleDeleteItem = (catIndex: number, itemIndex: number) => {
    setMenu((prev) => {
      const nextCats = [...prev.categories];
      const cat = nextCats[catIndex];
      nextCats[catIndex] = {
        ...cat,
        items: cat.items.filter((_, idx) => idx !== itemIndex),
      };
      return { ...prev, categories: nextCats };
    });
    setConfirmDeleteItemKey(null);
  };

  // Print notes operations (max 3)
  const handleAddNote = () => {
    setMenu((prev) => {
      const currentNotes = prev.restaurant.notes ?? [];
      if (currentNotes.length >= 3) return prev;
      return {
        ...prev,
        restaurant: {
          ...prev.restaurant,
          notes: [...currentNotes, { kicker: '', title: '', text: '' }],
        },
      };
    });
  };

  const handleUpdateNote = (noteIndex: number, patch: Partial<MenuNote>) => {
    setMenu((prev) => {
      const currentNotes = [...(prev.restaurant.notes ?? [])];
      if (!currentNotes[noteIndex]) return prev;
      currentNotes[noteIndex] = { ...currentNotes[noteIndex], ...patch };
      return {
        ...prev,
        restaurant: {
          ...prev.restaurant,
          notes: currentNotes,
        },
      };
    });
  };

  const handleDeleteNote = (noteIndex: number) => {
    setMenu((prev) => {
      const currentNotes = prev.restaurant.notes ?? [];
      return {
        ...prev,
        restaurant: {
          ...prev.restaurant,
          notes: currentNotes.filter((_, idx) => idx !== noteIndex),
        },
      };
    });
    setConfirmDeleteNoteIdx(null);
  };

  // Gate: do not render the editor until authenticated
  if (!adminUser) {
    return (
      <AdminGate
        restaurantName={menu.restaurant.name}
        supabaseActive={supabaseActive}
        configuredEmail={configuredEmail}
        isLockedByInactivity={isLockedByInactivity}
        hasUnsavedChanges={isDirty}
        onAuthenticated={(u) => {
          setIsLockedByInactivity(false);
          setAdminUser(u);
        }}
      />
    );
  }

  const totalItems = menu.categories.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-brand">
            <Logo className="admin-brand-logo" />
            <div>
              <h1 className="admin-brand-title">Панель управления · {menu.restaurant.name}</h1>
              <p className="admin-brand-subtitle">
                Разделов: {menu.categories.length} · Позиций: {totalItems}
              </p>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <button
              ref={pdfTriggerRef}
              type="button"
              className="admin-nav-btn admin-pdf-trigger-btn"
              onClick={() => openPdfModal()}
            >
              Скачать меню (PDF)
            </button>
            <a className="admin-nav-btn" href="./index.html" target="_blank" rel="noreferrer">
              Открыть онлайн-меню
            </a>

            {saveError ? (
              <button
                type="button"
                className="admin-save-status is-error"
                onClick={() => void handleSave()}
                title={saveError}
              >
                Ошибка сохранения — повторить
              </button>
            ) : isSaving || isDirty ? (
              <span className="admin-save-status is-saving" role="status" aria-live="polite">
                Сохранение…
              </span>
            ) : (
              <span className="admin-save-status is-clean" role="status" aria-live="polite">
                ✓ Сохранено {lastSavedTime}
              </span>
            )}

            <button
              type="button"
              className="admin-save-btn"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение…' : 'Сохранить'}
            </button>

            <button
              type="button"
              className="admin-nav-btn admin-logout-btn"
              onClick={() => void handleLogout()}
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="admin-container">
        {/* Inline Optimistic Conflict Resolution Banner (no window.confirm) */}
        {conflictState && (
          <div className="admin-conflict-banner" role="alert">
            <div className="admin-conflict-text">
              <strong>{conflictState.message}</strong>
            </div>
            <div className="admin-conflict-actions">
              <button
                type="button"
                className="admin-tool-btn"
                onClick={handleResolveConflictLoadRemote}
                disabled={isSaving}
              >
                Загрузить свежую версию
              </button>
              <button
                type="button"
                className="admin-confirm-yes"
                onClick={handleResolveConflictOverwrite}
                disabled={isSaving}
              >
                Перезаписать
              </button>
              <button
                type="button"
                className="admin-confirm-no"
                onClick={() => setConflictState(null)}
                disabled={isSaving}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {notice && (
          <div className={`admin-notice ${notice.type === 'error' ? 'is-error' : 'is-success'}`}>
            <span>{notice.text}</span>
            <button
              type="button"
              className="admin-confirm-no"
              onClick={() => setNotice(null)}
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Version History Section (Supabase mode only) */}
        {supabaseActive && (
          <section
            id="admin-history-section"
            className="admin-settings-card admin-history-section"
            aria-label="История версий"
          >
            <div className="admin-notes-header">
              <div>
                <h2 className="admin-section-title" style={{ marginBottom: 4 }}>
                  История версий
                </h2>
                <p className="admin-notes-hint">
                  Последние 20 сохранений в базе Supabase. Нажмите «Восстановить», чтобы загрузить выбранную версию в редактор, а затем нажмите «Сохранить».
                </p>
              </div>
              <button
                type="button"
                className="admin-tool-btn"
                onClick={() => void refreshHistory()}
                disabled={historyLoading}
              >
                {historyLoading ? 'Обновление…' : 'Обновить список'}
              </button>
            </div>

            {historyEntries.length === 0 ? (
              <p className="admin-notes-empty">
                {historyLoading
                  ? 'Загрузка истории версий…'
                  : 'История изменений пока пуста. Предыдущие версии появятся здесь после обновления меню.'}
              </p>
            ) : (
              <div className="admin-history-list">
                {historyEntries.map((entry) => {
                  const catCount = entry.data.categories.length;
                  const itemCount = entry.data.categories.reduce(
                    (sum, c) => sum + c.items.length,
                    0
                  );
                  const dateFormatted = entry.saved_at
                    ? new Date(entry.saved_at).toLocaleString('ru-RU', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })
                    : `Версия #${entry.id}`;
                  return (
                    <div key={entry.id} className="admin-history-row">
                      <div className="admin-history-meta">
                        <span className="admin-history-date">{dateFormatted}</span>
                        <span className="admin-history-stats">
                          Разделов: {catCount} · Позиций: {itemCount}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="admin-tool-btn"
                        onClick={() => handleRestoreHistoryEntry(entry)}
                      >
                        Восстановить
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Guest QR Code Section */}
        <section
          id="admin-qr-section"
          className="admin-settings-card admin-qr-section"
          aria-label="QR-код для гостей"
        >
          <div className="admin-qr-header">
            <div>
              <h2 className="admin-section-title" style={{ marginBottom: 4 }}>
                QR-код для гостей
              </h2>
              <p className="admin-notes-hint">
                Скачайте готовый код для типографии или распечатайте настольные карточки A6 (4 шт. на листе A4)
              </p>
            </div>
          </div>

          {!publicMenuUrl ? (
            <div className="admin-qr-empty">
              <p className="admin-qr-hint-text">
                QR появится после публикации сайта или укажите адрес в настройках
              </p>
              <button
                type="button"
                className="admin-nav-btn admin-qr-card-link"
                onClick={() => openPdfModal('card')}
              >
                Карточка на стол (печать)
              </button>
            </div>
          ) : (
            <div className="admin-qr-body">
              <div className="admin-qr-preview-box">
                {qrSvg ? (
                  <div
                    className="admin-qr-svg"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="admin-qr-svg-placeholder" />
                )}
              </div>

              <div className="admin-qr-details">
                <div className="admin-qr-url-box">
                  <span className="admin-qr-url-label">Адрес онлайн-меню:</span>
                  <a
                    className="admin-qr-url-value"
                    href={publicMenuUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {publicMenuUrl}
                  </a>
                </div>

                <div className="admin-qr-actions">
                  <button
                    type="button"
                    className="admin-save-btn"
                    onClick={handleDownloadQrPng}
                  >
                    Скачать PNG
                  </button>
                  <button
                    type="button"
                    className="admin-nav-btn"
                    onClick={handleDownloadQrSvg}
                  >
                    Скачать SVG
                  </button>
                  <button
                    type="button"
                    className="admin-nav-btn"
                    onClick={handleCopyQrLink}
                  >
                    {copiedLink ? '✓ Ссылка скопирована' : 'Копировать ссылку'}
                  </button>
                  <button
                    type="button"
                    className="admin-nav-btn admin-qr-card-link"
                    onClick={() => openPdfModal('card')}
                  >
                    Карточка на стол (печать)
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Restaurant & Print Settings */}
        <section className="admin-settings-card" aria-label="Настройки заведения и печати">
          <h2 className="admin-section-title">Тексты заведения и параметры печати</h2>
          <div className="admin-settings-grid">
            <div className="admin-field">
              <label className="admin-field-label">Название заведения</label>
              <input
                type="text"
                className="admin-input"
                value={menu.restaurant.name}
                onChange={(e) =>
                  setMenu((prev) => ({
                    ...prev,
                    restaurant: { ...prev.restaurant, name: e.target.value },
                  }))
                }
              />
            </div>

            <div className="admin-field">
              <label className="admin-field-label">Подзаголовок меню</label>
              <input
                type="text"
                className="admin-input"
                value={menu.restaurant.subtitle}
                onChange={(e) =>
                  setMenu((prev) => ({
                    ...prev,
                    restaurant: { ...prev.restaurant, subtitle: e.target.value },
                  }))
                }
              />
            </div>

            <div className="admin-field">
              <label className="admin-field-label">Слоган (под названием)</label>
              <input
                type="text"
                className="admin-input"
                placeholder="Необязательно"
                value={menu.restaurant.tagline ?? ''}
                onChange={(e) =>
                  setMenu((prev) => ({
                    ...prev,
                    restaurant: { ...prev.restaurant, tagline: e.target.value },
                  }))
                }
              />
            </div>

            <div className="admin-field">
              <label className="admin-field-label">Символ валюты</label>
              <input
                type="text"
                className="admin-input"
                value={menu.settings.currency}
                onChange={(e) =>
                  setMenu((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, currency: e.target.value },
                  }))
                }
              />
            </div>

            <div className="admin-field">
              <label className="admin-field-label">Предупреждение (подвал)</label>
              <input
                type="text"
                className="admin-input"
                value={menu.restaurant.footer.warning}
                onChange={(e) =>
                  setMenu((prev) => ({
                    ...prev,
                    restaurant: {
                      ...prev.restaurant,
                      footer: { ...prev.restaurant.footer, warning: e.target.value },
                    },
                  }))
                }
              />
            </div>

            <div className="admin-field">
              <label className="admin-field-label">Обслуживание (подвал)</label>
              <input
                type="text"
                className="admin-input"
                value={menu.restaurant.footer.service}
                onChange={(e) =>
                  setMenu((prev) => ({
                    ...prev,
                    restaurant: {
                      ...prev.restaurant,
                      footer: { ...prev.restaurant.footer, service: e.target.value },
                    },
                  }))
                }
              />
            </div>

            <div className="admin-field">
              <label className="admin-field-label">Время приготовления (подвал)</label>
              <input
                type="text"
                className="admin-input"
                value={menu.restaurant.footer.cooking}
                onChange={(e) =>
                  setMenu((prev) => ({
                    ...prev,
                    restaurant: {
                      ...prev.restaurant,
                      footer: { ...prev.restaurant.footer, cooking: e.target.value },
                    },
                  }))
                }
              />
            </div>

            <div className="admin-field">
              <label className="admin-field-label">
                URL онлайн-меню для QR-кода (settings.siteUrl)
              </label>
              <input
                type="url"
                className="admin-input"
                placeholder="Оставьте пустым для автоопределения адреса сайта"
                value={menu.settings.siteUrl}
                onChange={(e) =>
                  setMenu((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, siteUrl: e.target.value },
                  }))
                }
              />
            </div>

            <div className="admin-field">
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={menu.settings.showQr}
                  onChange={(e) =>
                    setMenu((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, showQr: e.target.checked },
                    }))
                  }
                />
                <span>Показывать QR-код на печатном меню (showQr)</span>
              </label>
            </div>
          </div>

          <details className="admin-backup-details">
            <summary className="admin-backup-summary">⋯ Резервная копия</summary>
            <div className="admin-backup-tools">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={handleImportJson}
              />
              {supabaseActive && (
                <button
                  type="button"
                  className="admin-tool-btn"
                  onClick={() => void handleSeedSupabase()}
                >
                  Загрузить начальное меню
                </button>
              )}
              <button
                type="button"
                className="admin-tool-btn"
                onClick={handleExportJson}
              >
                Экспорт JSON
              </button>
              <button
                type="button"
                className="admin-tool-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Импорт JSON
              </button>
              {!supabaseActive && (
                <>
                  {!confirmReset ? (
                    <button
                      type="button"
                      className="admin-tool-btn is-danger"
                      onClick={() => setConfirmReset(true)}
                    >
                      Сбросить к menu.json
                    </button>
                  ) : (
                    <span className="admin-inline-confirm">
                      <span>Сбросить все правки к menu.json?</span>
                      <button
                        type="button"
                        className="admin-confirm-yes"
                        onClick={() => void handleResetToStatic()}
                      >
                        Подтвердить
                      </button>
                      <button
                        type="button"
                        className="admin-confirm-no"
                        onClick={() => setConfirmReset(false)}
                      >
                        Отмена
                      </button>
                    </span>
                  )}
                </>
              )}
            </div>
          </details>
        </section>

        {/* Print Notes Section (up to 3) */}
        <section className="admin-settings-card" aria-label="Заметки на печатном меню (до 3)">
          <div className="admin-notes-header">
            <div>
              <h2 className="admin-section-title" style={{ marginBottom: 4 }}>
                Заметки на печатном меню (до 3)
              </h2>
              <p className="admin-notes-hint">
                Дополнительные текстовые блоки для свободного места на печатном меню
              </p>
            </div>
            {(menu.restaurant.notes ?? []).length < 3 && (
              <button
                type="button"
                className="admin-tool-btn"
                onClick={handleAddNote}
              >
                + Добавить заметку
              </button>
            )}
          </div>

          {(menu.restaurant.notes ?? []).length === 0 ? (
            <p className="admin-notes-empty">
              Заметок нет. Нажмите «+ Добавить заметку», если нужно разместить пояснение на печатном листе.
            </p>
          ) : (
            <div className="admin-notes-list">
              {(menu.restaurant.notes ?? []).map((note, noteIdx) => (
                <div key={noteIdx} className="admin-note-item">
                  <div className="admin-note-fields">
                    <div className="admin-note-top-fields">
                      <div className="admin-field">
                        <label className="admin-field-label">Надзаголовок (kicker)</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="Рубрика или подпись"
                          value={note.kicker}
                          onChange={(e) =>
                            handleUpdateNote(noteIdx, { kicker: e.target.value })
                          }
                        />
                      </div>
                      <div className="admin-field">
                        <label className="admin-field-label">Заголовок (title)</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="Заголовок заметки"
                          value={note.title}
                          onChange={(e) =>
                            handleUpdateNote(noteIdx, { title: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="admin-field">
                      <label className="admin-field-label">Текст заметки (text)</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="Текст заметки"
                        value={note.text}
                        onChange={(e) =>
                          handleUpdateNote(noteIdx, { text: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="admin-note-actions">
                    {confirmDeleteNoteIdx !== noteIdx ? (
                      <button
                        type="button"
                        className="admin-tool-btn is-danger"
                        onClick={() => setConfirmDeleteNoteIdx(noteIdx)}
                      >
                        Удалить
                      </button>
                    ) : (
                      <span className="admin-inline-confirm">
                        <span>Удалить заметку?</span>
                        <button
                          type="button"
                          className="admin-confirm-yes"
                          onClick={() => handleDeleteNote(noteIdx)}
                        >
                          Да
                        </button>
                        <button
                          type="button"
                          className="admin-confirm-no"
                          onClick={() => setConfirmDeleteNoteIdx(null)}
                        >
                          Нет
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Categories and Items Workspace */}
        <div className="admin-workspace">
          <aside className="admin-sidebar" aria-label="Навигация по разделам">
            <div className="admin-sidebar-header">
              <h3 className="admin-sidebar-title">Разделы меню</h3>
            </div>
            <ul className="admin-cat-nav-list">
              {menu.categories.map((cat, idx) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    className="admin-cat-nav-item"
                    onClick={() =>
                      document
                        .getElementById(`admin-cat-${cat.id}`)
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    <span>
                      {String(idx + 1).padStart(2, '0')} · {cat.title}
                    </span>
                    <span className="admin-cat-nav-badge">{cat.items.length}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="admin-add-cat-btn"
              onClick={handleAddCategory}
            >
              + Добавить категорию
            </button>
          </aside>

          <div className="admin-categories-column">
            {menu.categories.map((cat, catIndex) => (
              <section
                key={cat.id}
                id={`admin-cat-${cat.id}`}
                className="admin-category-card"
              >
                <div className="admin-category-card-header">
                  <div className="admin-category-title-wrap">
                    <span className="admin-category-num">
                      {String(catIndex + 1).padStart(2, '0')}
                    </span>
                    <input
                      type="text"
                      className="admin-category-title-input"
                      value={cat.title}
                      onChange={(e) => handleRenameCategory(catIndex, e.target.value)}
                      placeholder="Название (RU)"
                      aria-label={`Название категории ${cat.title}`}
                    />
                    <div className="admin-category-i18n-row">
                      <label className="admin-lang-inline">
                        <span className="admin-lang-tag">KZ</span>
                        <input
                          type="text"
                          className="admin-input admin-input-compact"
                          value={cat.i18n?.kk?.title ?? cat.titleKz ?? ''}
                          onChange={(e) =>
                            handleRenameCategoryI18n(catIndex, 'kk', e.target.value)
                          }
                          placeholder="Қазақша"
                          title="Название на казахском"
                          aria-label={`Название на казахском для категории ${cat.title}`}
                        />
                      </label>
                      <label className="admin-lang-inline">
                        <span className="admin-lang-tag">TR</span>
                        <input
                          type="text"
                          className="admin-input admin-input-compact"
                          value={cat.i18n?.tr?.title ?? ''}
                          onChange={(e) =>
                            handleRenameCategoryI18n(catIndex, 'tr', e.target.value)
                          }
                          placeholder="Türkçe"
                          title="Название на турецком"
                          aria-label={`Название на турецком для категории ${cat.title}`}
                        />
                      </label>
                      <label className="admin-lang-inline">
                        <span className="admin-lang-tag">EN</span>
                        <input
                          type="text"
                          className="admin-input admin-input-compact"
                          value={cat.i18n?.en?.title ?? ''}
                          onChange={(e) =>
                            handleRenameCategoryI18n(catIndex, 'en', e.target.value)
                          }
                          placeholder="English"
                          title="Название на английском"
                          aria-label={`Название на английском для категории ${cat.title}`}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="admin-category-controls">
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => handleMoveCategory(catIndex, -1)}
                      disabled={catIndex === 0}
                      title="Переместить категорию вверх"
                    >
                      ↑ Вверх
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => handleMoveCategory(catIndex, 1)}
                      disabled={catIndex === menu.categories.length - 1}
                      title="Переместить категорию вниз"
                    >
                      ↓ Вниз
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => handleAddItem(catIndex)}
                    >
                      + Блюдо
                    </button>

                    {confirmDeleteCatId !== cat.id ? (
                      <button
                        type="button"
                        className="admin-tool-btn is-danger"
                        onClick={() => setConfirmDeleteCatId(cat.id)}
                      >
                        Удалить раздел
                      </button>
                    ) : (
                      <span className="admin-inline-confirm">
                        <span>Удалить «{cat.title}»?</span>
                        <button
                          type="button"
                          className="admin-confirm-yes"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          Да, удалить
                        </button>
                        <button
                          type="button"
                          className="admin-confirm-no"
                          onClick={() => setConfirmDeleteCatId(null)}
                        >
                          Отмена
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-items-table">
                  {cat.items.map((item, itemIndex) => {
                    const itemKey = `${cat.id}-${itemIndex}`;
                    const isHidden = item.hidden === true;
                    return (
                      <div
                        key={itemKey}
                        className={`admin-item-row ${isHidden ? 'is-hidden' : ''}`}
                      >
                        <div className="admin-item-fields">
                          <div className="admin-item-top-fields">
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="Название блюда"
                              value={item.name}
                              onChange={(e) =>
                                handleUpdateItem(catIndex, itemIndex, {
                                  name: e.target.value,
                                })
                              }
                            />
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="Порция (напр. 250 г)"
                              value={item.portion ?? ''}
                              onChange={(e) =>
                                handleUpdateItem(catIndex, itemIndex, {
                                  portion: e.target.value,
                                })
                              }
                            />
                            <input
                              type="text"
                              className="admin-input admin-item-price-input"
                              placeholder="Цена (напр. 1690)"
                              value={item.price}
                              onChange={(e) =>
                                handleUpdateItem(catIndex, itemIndex, {
                                  price: e.target.value,
                                })
                              }
                            />
                          </div>
                          <input
                            type="text"
                            className="admin-input"
                            placeholder="Описание или состав блюда (необязательно)"
                            value={item.description ?? ''}
                            onChange={(e) =>
                              handleUpdateItem(catIndex, itemIndex, {
                                description: e.target.value,
                              })
                            }
                          />

                          <details className="admin-item-i18n">
                            <summary className="admin-item-i18n-summary">
                              Переводы (KZ / TR / EN)
                            </summary>
                            <div className="admin-item-i18n-grid">
                              {(
                                [
                                  { lang: 'kk' as const, label: 'KZ' },
                                  { lang: 'tr' as const, label: 'TR' },
                                  { lang: 'en' as const, label: 'EN' },
                                ] as const
                              ).map(({ lang, label }) => {
                                const trObj = item.i18n?.[lang] ?? {};
                                return (
                                  <div key={lang} className="admin-item-i18n-row">
                                    <span className="admin-lang-tag">{label}</span>
                                    <input
                                      type="text"
                                      className="admin-input admin-input-compact"
                                      placeholder={`Название (${label})`}
                                      value={trObj.name ?? ''}
                                      onChange={(e) =>
                                        handleUpdateItemI18n(catIndex, itemIndex, lang, {
                                          name: e.target.value,
                                        })
                                      }
                                    />
                                    <input
                                      type="text"
                                      className="admin-input admin-input-compact"
                                      placeholder={`Порция (${label})`}
                                      value={trObj.portion ?? ''}
                                      onChange={(e) =>
                                        handleUpdateItemI18n(catIndex, itemIndex, lang, {
                                          portion: e.target.value,
                                        })
                                      }
                                    />
                                    <input
                                      type="text"
                                      className="admin-input admin-input-compact"
                                      placeholder={`Описание (${label})`}
                                      value={trObj.description ?? ''}
                                      onChange={(e) =>
                                        handleUpdateItemI18n(catIndex, itemIndex, lang, {
                                          description: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        </div>

                        <div className="admin-item-actions">
                          <button
                            type="button"
                            className={`admin-hide-toggle ${isHidden ? 'is-active' : ''}`}
                            onClick={() =>
                              handleUpdateItem(catIndex, itemIndex, {
                                hidden: !isHidden,
                              })
                            }
                          >
                            {isHidden ? 'Скрыто' : 'Скрыть'}
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => handleMoveItem(catIndex, itemIndex, -1)}
                            disabled={itemIndex === 0}
                            title="Выше"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => handleMoveItem(catIndex, itemIndex, 1)}
                            disabled={itemIndex === cat.items.length - 1}
                            title="Ниже"
                          >
                            ↓
                          </button>

                          {confirmDeleteItemKey !== itemKey ? (
                            <button
                              type="button"
                              className="admin-tool-btn is-danger"
                              onClick={() => setConfirmDeleteItemKey(itemKey)}
                            >
                              Удалить
                            </button>
                          ) : (
                            <span className="admin-inline-confirm">
                              <span>Удалить?</span>
                              <button
                                type="button"
                                className="admin-confirm-yes"
                                onClick={() => handleDeleteItem(catIndex, itemIndex)}
                              >
                                Да
                              </button>
                              <button
                                type="button"
                                className="admin-confirm-no"
                                onClick={() => setConfirmDeleteItemKey(null)}
                              >
                                Нет
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="admin-category-footer">
                  <button
                    type="button"
                    className="admin-tool-btn"
                    onClick={() => handleAddItem(catIndex)}
                  >
                    + Добавить блюдо в «{cat.title}»
                  </button>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {pdfModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closePdfModal();
            }
          }}
        >
          <div
            ref={pdfModalRef}
            className="admin-pdf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-pdf-modal-title"
          >
            <div className="admin-pdf-modal-header">
              <div>
                <h2 id="admin-pdf-modal-title" className="admin-pdf-modal-title">
                  Скачать меню (PDF)
                </h2>
                <p className="admin-pdf-modal-subtitle">
                  Выберите формат листа и язык для печатного меню
                </p>
              </div>
              <button
                type="button"
                className="admin-pdf-modal-close"
                aria-label="Закрыть окно"
                onClick={closePdfModal}
              >
                ✕
              </button>
            </div>

            <div className="admin-pdf-modal-body">
              <div className="admin-pdf-group" role="radiogroup" aria-label="Формат печати">
                <span className="admin-pdf-group-label">Формат</span>
                <div className="admin-pdf-options-grid">
                  {(
                    [
                      { value: 'a3' as const, label: 'A3 (1 страница)' },
                      { value: 'a4' as const, label: 'A4 (2 страницы)' },
                      { value: 'card' as const, label: 'Карточки QR (A4, 4 шт.)' },
                    ] as const
                  ).map((opt) => {
                    const active = printPrefs.format === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        data-format-option={opt.value}
                        className={`admin-pdf-option-btn ${active ? 'is-active' : ''}`}
                        onClick={() => handleSelectPdfFormat(opt.value)}
                      >
                        <span className="admin-pdf-radio-dot" aria-hidden="true" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="admin-pdf-group" role="radiogroup" aria-label="Язык меню">
                <span className="admin-pdf-group-label">Язык</span>
                <div className="admin-pdf-lang-list">
                  {(
                    [
                      { value: 'kk' as const, label: 'Қазақша' },
                      { value: 'ru' as const, label: 'Русский' },
                      { value: 'tr' as const, label: 'Türkçe' },
                      { value: 'en' as const, label: 'English' },
                      { value: 'ru-kk' as const, label: 'Русский + Қазақша' },
                    ] as const
                  ).map((opt) => {
                    const active = printPrefs.lang === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        data-lang-option={opt.value}
                        className={`admin-pdf-lang-btn ${active ? 'is-active' : ''}`}
                        onClick={() => handleSelectPdfLang(opt.value)}
                      >
                        <span className="admin-pdf-radio-dot" aria-hidden="true" />
                        {opt.value === 'ru-kk' ? (
                          <span className="admin-pdf-flag-pair" aria-hidden="true">
                            <LangFlag lang="ru" className="admin-pdf-flag" />
                            <LangFlag lang="kk" className="admin-pdf-flag" />
                          </span>
                        ) : (
                          <LangFlag lang={opt.value} className="admin-pdf-flag" />
                        )}
                        <span className="admin-pdf-lang-label">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="admin-pdf-modal-footer">
              <button
                type="button"
                className="admin-nav-btn"
                onClick={closePdfModal}
              >
                Отмена
              </button>
              <button
                type="button"
                className="admin-save-btn admin-pdf-open-btn"
                onClick={handleOpenForPrint}
              >
                Открыть для печати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
