import Link from "next/link";
import { WindowChrome } from "@/components/WindowChrome";
import { PrivacyDisclaimer } from "@/components/PrivacyDisclaimer";
import { minRetentionSummary } from "@/lib/privacy/retention";

const MARQUEE_ITEMS = [
  "★ APPROVAL GATE ON EVERY ACTION ★",
  "★ NO TRAINING PIPELINE · INFERENCE VIA TARS ★",
  "★ RAW FEEDS NOT ARCHIVED IN OUR DB ★",
  "★ REDACTED AUDIT TRAIL ★",
  "★ EXTERNAL CONTENT TREATED AS UNTRUSTED ★",
];

const HOW_IT_WORKS = [
  {
    step: "[ 01 ]",
    title: "CONNECT STACK",
    body: "Gmail and GitHub. One tap each.",
  },
  {
    step: "[ 02 ]",
    title: "PICK YOUR CREW",
    body: "Ops, Growth, Support, Finance.",
  },
  {
    step: "[ 03 ]",
    title: "CREW GETS TO WORK",
    body: "Reviews, drafts — you approve.",
  },
];

const CREWS = [
  {
    name: "OPS",
    status: "ACTIVE",
    desc: "Reviews inbox + GitHub. Drafts investor updates. Proposes follow-ups.",
    border: "",
  },
  {
    name: "GROWTH",
    status: "READY",
    desc: "Your shipped update → LinkedIn + outreach drafts. Copy/paste yourself.",
    border: "card-crew-matcha",
  },
  {
    name: "SUPPORT",
    status: "READY",
    desc: "Reads customer tickets. Drafts responses in your tone.",
    border: "card-crew-strawberry",
  },
  {
    name: "FINANCE",
    status: "READ-ONLY",
    desc: "Tracks runway, burn, MRR. Plain-English summary.",
    border: "card-crew-matcha",
  },
];

const SECURITY_CARDS = [
  {
    title: "[ ♦ ] APPROVAL GATE",
    body: "Runs only create pending drafts. Nothing sends, posts, or modifies until you approve.",
  },
  {
    title: "[ █ ] NO TRAINING PIPELINE",
    body: "KrewsAgent does not train models on your workspace. Live runs infer once via TARS under provider API terms.",
  },
  {
    title: "[ ○ ] MIN RETENTION",
    body: minRetentionSummary(),
  },
  {
    title: "[ ≡ ] AUDIT TRAIL",
    body: "Decisions logged with redacted summaries and a hash chain you can verify on Activity.",
  },
];

export default function LandingPage() {
  const marqueeText = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS].join("   ·   ");

  return (
    <WindowChrome title="KREWSAGENT.EXE — Work done. Control kept.">
      <section className="hero">
        <p className="hero-blink">★ TETRATE AI BUILDATHON v2.0 · BUILT SOLO ★</p>
        <h1 className="headline-3d">
          Work done.
          <br />
          <span className="text-matcha-bright">Control kept.</span>
        </h1>
        <p className="hero-sub">
          {">>> A secure AI operations crew for founders who can't afford a team yet. It reads, drafts, and proposes — but waits for you to say yes. <<<"}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login?tab=signup" className="btn-primary text-center">
            [ SIGN UP FREE ]
          </Link>
          <Link href="/api/auth/demo?next=/connect" className="btn-secondary text-center">
            [ TRY THE DEMO ]
          </Link>
        </div>
      </section>

      <div className="marquee-wrap" aria-hidden="true">
        <span className="marquee-inner">{marqueeText}</span>
      </div>

      <div className="section-label">{">>"} HOW IT WORKS</div>
      <div className="grid md:grid-cols-3 gap-2.5 mb-3.5">
        {HOW_IT_WORKS.map((item) => (
          <div key={item.title} className="card">
            <div className="card-label">{item.step}</div>
            <div className="card-title">{item.title}</div>
            <div className="card-desc">{item.body}</div>
          </div>
        ))}
      </div>

      <div className="section-label">{">>"} YOUR CREW</div>
      <div className="grid sm:grid-cols-2 gap-2.5 mb-3.5">
        {CREWS.map((crew) => (
          <div key={crew.name} className={`card ${crew.border}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="card-title mb-0">[ {crew.name} ]</div>
              <span
                className={
                  crew.status === "READ-ONLY" ? "badge-strawberry" : "badge-matcha"
                }
              >
                {crew.status}
              </span>
            </div>
            <div className="card-desc">{crew.desc}</div>
          </div>
        ))}
      </div>

      <div className="section-label">{">>"} BUILT FOR</div>
      <div className="story">
        <div>
          <div className="avatar" aria-hidden="true">
            J
          </div>
          <p className="text-base font-bold text-center mt-2.5">JORDAN</p>
          <p className="text-base text-text-muted text-center">Caregiver · Side-stacker</p>
        </div>
        <blockquote className="quote">
          &ldquo;It&apos;s 11pm. I just put my mom to bed. 47 unread emails, a customer
          needing help, an investor follow-up due tomorrow. I open KrewsAgent — by
          morning, my crew has read everything and drafted what I need. They&apos;re
          waiting for me to say yes.&rdquo;
        </blockquote>
      </div>

      <div className="section-label">{">>"} SECURITY &amp; PRIVACY</div>
      <div className="grid sm:grid-cols-2 gap-2.5 mb-3.5">
        {SECURITY_CARDS.map((card) => (
          <div key={card.title} className="card card-crew-matcha">
            <div className="card-title">{card.title}</div>
            <div className="card-desc">{card.body}</div>
          </div>
        ))}
      </div>
      <PrivacyDisclaimer className="mb-3.5" />

      <div className="cta-box">
        <p className="cta-h">{">>> STOP DROWNING IN ADMIN <<<"}</p>
        <p className="cta-s">Sign up to connect Gmail · or try the demo. Powered by TARS.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login?tab=signup" className="btn-primary inline-block text-center">
            [ GET STARTED ]
          </Link>
          <Link href="/api/auth/demo?next=/dashboard" className="btn-secondary inline-block text-center">
            [ OPEN DEMO ]
          </Link>
        </div>
      </div>
    </WindowChrome>
  );
}
