import {
  PRIVACY_NOTICE_SECTIONS,
  type PrivacyNoticeSection,
} from "@/lib/privacy/retention";

interface PrivacyDisclaimerProps {
  /** full = landing/connect with section label; compact = dashboard footer */
  variant?: "full" | "compact";
  className?: string;
}

const accentClass: Record<PrivacyNoticeSection["accent"], string> = {
  matcha: "privacy-section-matcha",
  strawberry: "privacy-section-strawberry",
  neutral: "privacy-section-neutral",
};

export function PrivacyDisclaimer({
  variant = "full",
  className = "",
}: PrivacyDisclaimerProps) {
  return (
    <aside
      className={`privacy-panel ${variant === "compact" ? "privacy-panel-compact" : ""} ${className}`.trim()}
      aria-label="Privacy notice"
    >
      {variant === "full" && (
        <div className="section-label privacy-panel-heading">
          {">>"} PRIVACY NOTICE
        </div>
      )}
      {variant === "compact" && (
        <p className="privacy-panel-title">[ ! ] PRIVACY NOTICE</p>
      )}
      <div className="privacy-panel-grid">
        {PRIVACY_NOTICE_SECTIONS.map((section) => (
          <div
            key={section.id}
            className={`privacy-section ${accentClass[section.accent]}`}
          >
            <p className="privacy-section-label">{section.label}</p>
            <ul className="privacy-section-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="privacy-panel-foot">
        Retention varies by connected source. Use <strong>Clear Data</strong> or{" "}
        <strong>Reset Demo</strong> to wipe stored drafts and audit entries.
      </p>
    </aside>
  );
}
