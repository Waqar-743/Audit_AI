"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isSeoReport, normalizePreferences } from "@/shared/seo/coach";
import type { Preferences } from "@/shared/seo/types";
import styles from "./home.module.css";

const storageKey = "auditai-pip-v1";
const goals = [
  {
    value: "my site",
    label: "My website",
    title: "Make your next page a little clearer.",
    tip: "Start with one important page: your homepage, a service, or a useful article.",
  },
  {
    value: "client work",
    label: "Client work",
    title: "Bring a little clarity to your next review.",
    tip: "Start with a client page. Keep the evidence, draft a fix, and export your field notes.",
  },
  {
    value: "learning SEO",
    label: "Learning SEO",
    title: "Learn one useful thing from a real page.",
    tip: "Open a finding, read what Pip observed, and follow its reference before changing anything.",
  },
] as const;

export default function HomeJourney() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [prefs, setPrefs] = useState<Preferences>(normalizePreferences(null));
  const [savedCount, setSavedCount] = useState(0);
  const [storageNote, setStorageNote] = useState("");
  const [opening, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    async function restore() {
      try {
        const raw = await Promise.resolve(localStorage.getItem(storageKey));
        const saved = raw ? JSON.parse(raw) : null;
        if (!alive) return;
        setPrefs(normalizePreferences(saved?.preferences));
        setSavedCount(
          Array.isArray(saved?.reports)
            ? saved.reports.filter(isSeoReport).length
            : 0,
        );
      } catch {
        if (alive)
          setStorageNote(
            "Personalization is unavailable in this browser. You can still use every audit tool.",
          );
      }
    }
    void restore();
    return () => {
      alive = false;
    };
  }, []);

  function personalize(next: Preferences) {
    setPrefs(next);
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...saved, preferences: next }),
      );
    } catch {
      setStorageNote(
        "Pip can use your choices here, but this browser could not save them.",
      );
    }
  }

  function startAudit(event: FormEvent) {
    event.preventDefault();
    const input = url.trim();
    if (!input) {
      setError("Enter the page you would like Pip to check.");
      return;
    }
    try {
      const target = new URL(
        /^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`,
      );
      if (
        !/^(https?:)$/.test(target.protocol) ||
        !target.hostname ||
        target.username ||
        target.password
      )
        throw new Error("Invalid address");
      setError("");
      startTransition(() => {
        router.push(
          `/assistant?url=${encodeURIComponent(target.href)}&start=1`,
        );
      });
    } catch {
      setError(
        "Use a webpage address such as https://your-website.com/a-page, without login credentials.",
      );
    }
  }

  const goal = goals.find((item) => item.value === prefs.goal) || goals[0];
  return (
    <section className={styles.hero} aria-labelledby="home-heading">
      <div className={styles.heroCopy}>
        <span className={styles.kicker}>
          {prefs.nickname
            ? `Welcome back, ${prefs.nickname}.`
            : "A small companion. A stronger website."}
        </span>
        <h1 id="home-heading" className={`hero-headline ${styles.title}`}>
          Your free SEO assistant.
          <br />
          <em>One page at a time.</em>
        </h1>
        <p className={styles.intro}>
          Meet Pip, your parrot guide to a clearer website. Check a page,
          understand the evidence, and make one useful change. No signup,
          payment, or API keys.
        </p>
        <form
          className={styles.urlForm}
          onSubmit={startAudit}
          aria-label="Start a free SEO audit"
        >
          <label htmlFor="url-input">Which page are we helping today?</label>
          <div className={styles.urlRow}>
            <input
              id="url-input"
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              maxLength={2048}
              placeholder="https://your-website.com/a-page"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (error) setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "home-url-error" : "home-url-help"}
              disabled={opening}
            />
            <button type="submit" disabled={opening}>
              {opening ? "Opening Pip…" : "Start free audit ↗"}
            </button>
          </div>
          {error ? (
            <p id="home-url-error" className={styles.error} role="alert">
              {error}
            </p>
          ) : (
            <p id="home-url-help" className={styles.help}>
              One public page. Every finding included. Your report stays in this
              browser.
            </p>
          )}
        </form>
        <div className={styles.heroLinks}>
          <Link href="/assistant#extension">
            Prefer to inspect the page in Chrome? ↗
          </Link>
          {savedCount > 0 && (
            <Link href="/assistant#notebook">
              Open your {savedCount} saved{" "}
              {savedCount === 1 ? "field note" : "field notes"} ↗
            </Link>
          )}
        </div>
        <details className={styles.personalize}>
          <summary>
            Make Pip your companion <span>optional</span>
          </summary>
          <div className={styles.personalFields}>
            <label htmlFor="home-nickname">What should Pip call you?</label>
            <input
              id="home-nickname"
              value={prefs.nickname}
              onChange={(event) =>
                personalize({
                  ...prefs,
                  nickname: event.target.value.slice(0, 40),
                })
              }
              autoComplete="off"
              maxLength={40}
              placeholder="Your name, if you like"
            />
            <span id="home-goal-label">What are you working on?</span>
            <div
              className={styles.goals}
              role="group"
              aria-labelledby="home-goal-label"
            >
              {goals.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={prefs.goal === item.value}
                  onClick={() => personalize({ ...prefs, goal: item.value })}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p>No account is created. These choices stay on this device.</p>
          </div>
        </details>
        {storageNote && (
          <p className={styles.help} role="status">
            {storageNote}
          </p>
        )}
      </div>
      <aside
        className={styles.companion}
        aria-label="Pip's page improvement journey"
      >
        <div className={styles.companionTop}>
          <span>YOUR SEO FIELD COMPANION</span>
          <span className={styles.localDot}>Always free</span>
        </div>
        <div className={styles.birdScene}>
          <Image
            src={`/birds/${prefs.bird}.svg`}
            alt="Pip's chosen illustration, your SEO field companion"
            width={280}
            height={234}
            priority
          />
          <Image
            className={styles.looseFeather}
            src="/birds/feather.svg"
            alt=""
            width={58}
            height={48}
          />
        </div>
        <div className={styles.fieldNote}>
          <span className={styles.kicker}>A note from Pip</span>
          <h2>{goal.title}</h2>
          <p>{goal.tip}</p>
        </div>
        <ol className={styles.smallJourney}>
          <li>
            <Image src="/birds/egg.svg" alt="" width={40} height={34} />
            <span>Bring a page</span>
          </li>
          <li>
            <Image src="/birds/nest.svg" alt="" width={40} height={34} />
            <span>Care for the details</span>
          </li>
          <li>
            <Image src="/birds/flight.svg" alt="" width={40} height={34} />
            <span>Come back stronger</span>
          </li>
        </ol>
      </aside>
    </section>
  );
}
