'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { LOCATION_NEED_KEY } from '@/components/dating/LocationConfirm';
import {
  datingSsoCallbackUrl,
  getIntimgramOrigin,
} from '@/lib/auth/intimgram-sso-public';
import { datingHomePath, localePath } from '@/lib/i18n/paths';
import type { Locale } from '@/lib/i18n/types';

export type AuthLabels = {
  loginTitle: string;
  loginLead: string;
  registerTitle: string;
  registerLead: string;
  tabLogin: string;
  tabRegister: string;
  username: string;
  usernameHint: string;
  password: string;
  passwordHint: string;
  email: string;
  emailOptional: string;
  showPassword: string;
  hidePassword: string;
  submitLogin: string;
  submitRegister: string;
  working: string;
  switchToRegister: string;
  switchToRegisterCta: string;
  switchToLogin: string;
  switchToLoginCta: string;
  legal: string;
  orDivider: string;
  googleLogin: string;
  googleRegister: string;
  intimgramLogin: string;
  errors: Record<string, string>;
};

type Mode = 'login' | 'register';

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      {off ? (
        <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthClient({
  locale,
  labels,
}: {
  locale: Locale;
  labels: AuthLabels;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const urlError = searchParams.get('error');

  const initialMode: Mode =
    searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [reveal, setReveal] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(() => {
    if (!urlError) return null;
    if (urlError === 'no_account') return 'NO_ACCOUNT';
    if (urlError === 'oauth') return 'OAUTH_FAILED';
    return urlError;
  });
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const googleHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('mode', isRegister ? 'register' : 'login');
    params.set('locale', locale);
    if (nextParam) params.set('next', nextParam);
    // Trailing slash avoids Next's 308 redirect that can drop cookies mid-flow.
    return `/api/auth/google/?${params.toString()}`;
  }, [isRegister, locale, nextParam]);

  // Build on the client so the return host is always the browser origin
  // (flirty.ge), not a stale SSR / baked NEXT_PUBLIC_SITE_URL.
  const [intimgramHref, setIntimgramHref] = useState('#');
  useEffect(() => {
    const returnUrl = datingSsoCallbackUrl(locale, nextParam);
    const params = new URLSearchParams();
    params.set('return', returnUrl);
    params.set('locale', locale);
    setIntimgramHref(
      `${getIntimgramOrigin()}/api/dating-sso/start/?${params.toString()}`,
    );
  }, [locale, nextParam]);

  function switchMode(next: Mode) {
    setMode(next);
    setErrorCode(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorCode(null);

    const path = isRegister ? '/api/v1/auth/register/' : '/api/v1/auth/login/';
    const payload: Record<string, unknown> = {
      username: username.trim(),
      password,
      ageConfirmed: true,
    };
    if (isRegister && email.trim()) payload.email = email.trim();

    const res = await api<{ user: { username: string } }>(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setErrorCode(res.error.code);
      setBusy(false);
      return;
    }
    try {
      sessionStorage.setItem(LOCATION_NEED_KEY, '1');
    } catch {
      /* private mode */
    }
    const dest =
      nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
        ? nextParam === '/'
          ? datingHomePath(locale)
          : localePath(locale, nextParam)
        : datingHomePath(locale);
    router.push(dest);
    router.refresh();
  }

  const message = errorCode
    ? labels.errors[errorCode] || labels.errors.GENERIC
    : null;

  return (
    <div className="auth-card">
      <div className="auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!isRegister}
          className={`auth-tabs__btn${!isRegister ? ' is-active' : ''}`}
          onClick={() => switchMode('login')}
        >
          {labels.tabLogin}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isRegister}
          className={`auth-tabs__btn${isRegister ? ' is-active' : ''}`}
          onClick={() => switchMode('register')}
        >
          {labels.tabRegister}
        </button>
      </div>

      <h1 className="auth-card__title">
        {isRegister ? labels.registerTitle : labels.loginTitle}
      </h1>
      <p className="auth-card__lead">
        {isRegister ? labels.registerLead : labels.loginLead}
      </p>

      <div className="auth-social">
        <a className="auth-social__btn auth-social__btn--google" href={googleHref}>
          <span className="auth-social__icon">
            <GoogleIcon />
          </span>
          <span>
            {isRegister ? labels.googleRegister : labels.googleLogin}
          </span>
        </a>
        <a
          className="auth-social__btn auth-social__btn--intimgram"
          href={intimgramHref}
        >
          <span className="auth-social__icon" aria-hidden>
            ♥
          </span>
          <span>{labels.intimgramLogin}</span>
        </a>
      </div>

      <div className="auth-social__divider">
        <span className="auth-social__divider-line" />
        <span className="auth-social__divider-text">{labels.orDivider}</span>
        <span className="auth-social__divider-line" />
      </div>

      <form className="auth-form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="auth-field">
          <label className="auth-field__label" htmlFor="auth-username">
            {labels.username}
          </label>
          <input
            id="auth-username"
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
          {isRegister ? (
            <span className="auth-field__hint">{labels.usernameHint}</span>
          ) : null}
        </div>

        {isRegister ? (
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="auth-email">
              {labels.email}
              <span className="auth-field__optional">{labels.emailOptional}</span>
            </label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        ) : null}

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="auth-password">
            {labels.password}
          </label>
          <div className="auth-input-wrap">
            <input
              id="auth-password"
              className="auth-input"
              type={reveal ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
            <button
              type="button"
              className="auth-reveal"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? labels.hidePassword : labels.showPassword}
            >
              <EyeIcon off={reveal} />
            </button>
          </div>
          {isRegister ? (
            <span className="auth-field__hint">{labels.passwordHint}</span>
          ) : null}
        </div>

        {message ? (
          <p className="auth-error" role="alert">
            {message}
          </p>
        ) : null}

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? labels.working : isRegister ? labels.submitRegister : labels.submitLogin}
        </button>
      </form>

      <p className="auth-switch">
        {isRegister ? labels.switchToLogin : labels.switchToRegister}{' '}
        <button
          type="button"
          className="auth-switch__link"
          onClick={() => switchMode(isRegister ? 'login' : 'register')}
        >
          {isRegister ? labels.switchToLoginCta : labels.switchToRegisterCta}
        </button>
      </p>

      <p className="auth-legal">{labels.legal}</p>
    </div>
  );
}
