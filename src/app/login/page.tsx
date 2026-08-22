"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Trek App</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connecte-toi avec ton email pour accéder à l&apos;organisation du
          trek.
        </p>

        {status === "sent" ? (
          <p className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            Lien de connexion envoyé à {email}. Vérifie ta boîte mail.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="toi@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {status === "sending" ? "Envoi..." : "Recevoir le lien"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">
                Une erreur est survenue, réessaie.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
