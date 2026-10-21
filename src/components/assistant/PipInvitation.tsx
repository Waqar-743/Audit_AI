import Link from "next/link";
import Image from "next/image";
import styles from "./pip-invitation.module.css";

export default function PipInvitation() {
  return (
    <section id="pricing" className={styles.section}>
      <div className="section-label reveal">
        A free companion for your next step
      </div>
      <div className={styles.welcome}>
        <div>
          <h2 className="section-title reveal">
            Meet Pip.
            <br />
            Give your page <em>wings.</em>
          </h2>
          <p className="section-sub reveal">
            A careful little parrot with a practical job: help you understand
            your page&apos;s SEO, read the evidence, and make the next useful
            fix.
          </p>
          <div className={styles.actions}>
            <Link href="/assistant" className={styles.primary}>
              Open your free SEO assistant ↗
            </Link>
            <Link href="/assistant#extension" className={styles.secondary}>
              Get the Chrome extension
            </Link>
          </div>
          <p className={styles.note}>
            No sign-in. No paid tiers. No API keys. Every finding and tool is
            included.
          </p>
        </div>
        <div className={styles.illustration}>
          <Image
            src="/birds/parrot.svg"
            alt="Pip, a lime-green parrot perched on a branch"
            width={240}
            height={200}
          />
          <span>Small steps. Stronger wings.</span>
        </div>
      </div>
      <div className={styles.journey}>
        {[
          {
            bird: "egg",
            title: "Start with a page",
            text: "Inspect public HTML on the web or the rendered page in Chrome.",
          },
          {
            bird: "nest",
            title: "Care for the foundations",
            text: "Review titles, headings, indexing instructions, links, and schema evidence.",
          },
          {
            bird: "flight",
            title: "Keep the lesson",
            text: "Draft a fix, rescan, and save your own local field notes.",
          },
        ].map((step) => (
          <div key={step.bird}>
            <Image
              src={`/birds/${step.bird}.svg`}
              alt=""
              width={65}
              height={55}
            />
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
