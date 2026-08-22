"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "trekapp:nom";
const CHANGE_EVENT = "trekapp:nom-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

type CurrentUserContextValue = {
  nom: string | null;
  setNom: (nom: string) => void;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(
  null
);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const nom = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setNom(value: string) {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <CurrentUserContext.Provider value={{ nom, setNom }}>
      {nom ? children : <NamePrompt onSubmit={setNom} />}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return ctx;
}

function NamePrompt({ onSubmit }: { onSubmit: (nom: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (trimmed) onSubmit(trimmed);
        }}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Trek App</h1>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ton prénom"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          C&apos;est parti
        </button>
      </form>
    </main>
  );
}
