"use client";

import { useCallback, useEffect, useState } from "react";

interface RepoOption {
  owner: string;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

interface GitHubRepoPickerProps {
  enabled: boolean;
  currentOwner?: string;
  currentRepo?: string;
  repoSelected?: boolean;
  onSaved?: () => void;
}

export function GitHubRepoPicker({
  enabled,
  currentOwner,
  currentRepo,
  repoSelected,
  onSaved,
}: GitHubRepoPickerProps) {
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState(
    currentOwner && currentRepo ? `${currentOwner}/${currentRepo}` : ""
  );
  const [manualOwner, setManualOwner] = useState(currentOwner ?? "");
  const [manualRepo, setManualRepo] = useState(currentRepo ?? "");
  const [useManual, setUseManual] = useState(false);

  const loadRepos = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    setMessage(null);
    fetch("/api/integrations/github/repos")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load repos");
        setRepos(d.repos ?? []);
        if (!selected && d.default_owner && d.default_repo) {
          const def = `${d.default_owner}/${d.default_repo}`;
          if (d.repos?.some((repo: RepoOption) => repo.full_name === def)) {
            setSelected(def);
          }
        }
      })
      .catch((e) => {
        setMessage(e instanceof Error ? e.message : "Failed to load repos");
        setUseManual(true);
      })
      .finally(() => setLoading(false));
  }, [enabled, selected]);

  useEffect(() => {
    if (enabled) {
      loadRepos();
    }
  }, [enabled, loadRepos]);

  useEffect(() => {
    if (currentOwner) setManualOwner(currentOwner);
    if (currentRepo) setManualRepo(currentRepo);
    if (currentOwner && currentRepo) {
      setSelected(`${currentOwner}/${currentRepo}`);
    }
  }, [currentOwner, currentRepo]);

  const handleSave = async () => {
    if (!enabled) return;
    setSaving(true);
    setMessage(null);

    let owner = manualOwner.trim();
    let repo = manualRepo.trim();

    if (!useManual && selected) {
      const [o, r] = selected.split("/");
      if (o && r) {
        owner = o;
        repo = r;
      }
    }

    if (!owner || !repo) {
      setMessage("Choose a repo or enter owner/name.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/integrations/github/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage(`Saved — Support crew will use ${owner}/${repo}`);
      onSaved?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-strawberry-dark/40 pt-3">
      <p className="card-label">
        {repoSelected ? "Your Support repo" : "Step 2 — Choose your Support repo"}
      </p>

      {!enabled && (
        <p className="text-sm text-strawberry-light">
          Click <strong>[ CONNECT GITHUB ]</strong> first — then your repos will
          load here.
        </p>
      )}

      {enabled && loading && (
        <p className="text-sm text-strawberry-light">Loading your repos…</p>
      )}

      {enabled && !loading && useManual && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className="input-retro flex-1"
            placeholder="owner"
            value={manualOwner}
            onChange={(e) => setManualOwner(e.target.value)}
          />
          <input
            type="text"
            className="input-retro flex-1"
            placeholder="repo"
            value={manualRepo}
            onChange={(e) => setManualRepo(e.target.value)}
          />
        </div>
      )}

      {enabled && !loading && !useManual && (
        <select
          className="input-retro w-full"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">— select a repository —</option>
          {repos.map((r) => (
            <option key={r.full_name} value={r.full_name}>
              {r.full_name}
              {r.private ? " (private)" : ""}
            </option>
          ))}
        </select>
      )}

      {enabled && !loading && !useManual && (
        <button
          type="button"
          className="btn-retro text-sm"
          onClick={() => setUseManual(true)}
        >
          Enter owner/repo manually
        </button>
      )}

      {enabled && useManual && repos.length > 0 && (
        <button
          type="button"
          className="btn-retro text-sm"
          onClick={() => setUseManual(false)}
        >
          Pick from list instead
        </button>
      )}

      {message && (
        <p className="text-sm text-strawberry-light" role="status">
          {message}
        </p>
      )}

      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={!enabled || saving || loading}
        onClick={handleSave}
      >
        [ SAVE REPO CHOICE ]
      </button>
    </div>
  );
}
