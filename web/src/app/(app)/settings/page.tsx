"use client";

import { useState } from "react";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, inputClass } from "@/components/ui";

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [dayStart, setDayStart] = useState(user?.dayStart ?? "09:00");
  const [dayEnd, setDayEnd] = useState(user?.dayEnd ?? "18:00");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.updateMe({ name, dayStart, dayEnd });
      setUser(res.user);
      setMessage({ ok: true, text: "Saved." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.updateMe({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ ok: true, text: "Password updated." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Could not update the password" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {message && (
        <p className={message.ok ? "text-sm text-emerald-600" : "text-sm text-red-600"} role="status">
          {message.text}
        </p>
      )}

      <Card>
        <form onSubmit={saveProfile} className="space-y-4">
          <h2 className="font-semibold">Profile and working hours</h2>
          <Field label="Name">
            <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day starts" hint="Auto time-blocking starts here">
              <input type="time" required className={inputClass} value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
            </Field>
            <Field label="Day ends">
              <input type="time" required className={inputClass} value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={changePassword} className="space-y-4">
          <h2 className="font-semibold">Change password</h2>
          <Field label="Current password">
            <input
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="New password" hint="At least 8 characters">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="secondary" loading={saving}>
            Update password
          </Button>
        </form>
      </Card>

      <Card className="space-y-2 text-sm text-slate-500">
        <p>
          Signed in as <strong className="text-slate-700 dark:text-slate-200">{user?.email}</strong>
        </p>
        <p>API: {API_URL}</p>
        <Button variant="secondary" onClick={logout}>
          Sign out
        </Button>
      </Card>
    </div>
  );
}
