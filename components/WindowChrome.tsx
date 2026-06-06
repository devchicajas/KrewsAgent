"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountModeBadge } from "./AccountModeBadge";
import { AuthNav } from "./AuthNav";
import { useTheme } from "./ThemeProvider";

interface WindowChromeProps {
  title: string;
  children: React.ReactNode;
}

export function WindowChrome({ title, children }: WindowChromeProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/activity", label: "Activity" },
    { href: "/connect", label: "Connect" },
  ];

  return (
    <div className="window-frame">
      <div className="window-titlebar">
        <Link href="/" className="titlebar-left no-underline">
          <span className="title-icon" aria-hidden="true">
            K
          </span>
          <span className="truncate">{title}</span>
        </Link>
        <div className="window-controls" aria-hidden="true">
          <span className="window-btn">_</span>
          <span className="window-btn">□</span>
          <span className="window-btn">×</span>
        </div>
      </div>

      <nav className="menu-bar" aria-label="Main navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`menu-item ${pathname === item.href ? "active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
        <AccountModeBadge variant="compact" />
        <AuthNav />
        <button
          type="button"
          className="menu-item theme-toggle"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          [{theme === "dark" ? "Light" : "Dark"} Mode]
        </button>
      </nav>

      <div className="window-content">{children}</div>

      <footer className="window-footer">
        <span>© 2026 KREWSAGENT.EXE · Tetrate AI Buildathon</span>
        <span className="footer-tars">[ POWERED BY TARS ]</span>
      </footer>
    </div>
  );
}
