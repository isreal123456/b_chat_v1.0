"use client";

import { useState } from "react";
import Field from "./Field";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";

export default function AccountPanel() {
  return (
    <div className="space-y-6">
      <SectionCard title="Email & password">
        <div className="space-y-4">
          <Field label="Email address">
            <input
              type="email"
              defaultValue="elviz@example.com"
              className="w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </Field>
          <Field label="New password" hint="Leave blank to keep your current password.">
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </Field>
        </div>
        <button className="mt-5 bg-yellow-400 hover:bg-yellow-300 text-neutral-900 text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors">
          Update account
        </button>
      </SectionCard>

      <SectionCard title="Two-factor authentication" description="Add an extra layer of security to your account.">
        <Toggle checked={false} onChange={() => {}} label="Enable two-factor authentication" />
      </SectionCard>

      <SectionCard title="Danger zone">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Delete account</p>
            <p className="text-xs text-neutral-500 mt-0.5">This can't be undone.</p>
          </div>
          <button className="text-sm border border-red-400/40 text-red-400 hover:bg-red-400/10 rounded-lg px-4 py-2 transition-colors">
            Delete account
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
