import { create } from "zustand";
import { PROVIDERS } from "./catalog";

export type Appointment = {
  id: string;
  providerId: string;
  when: string;
  reason: string;
  createdAt: number;
};

export type CaseFile = {
  id: string;
  kind: "immigration" | "housing";
  summary: string;
  status: "intake" | "review";
  createdAt: number;
};

type Snapshot = {
  name: string;
  appointments: Appointment[];
  cases: CaseFile[];
  applications: string[];
};

type CareState = Snapshot & {
  hydrated: boolean;
  hydrate: () => void;
  setName: (name: string) => void;
  book: (providerId: string, when: string, reason: string) => Appointment;
  cancel: (id: string) => void;
  fileCase: (kind: CaseFile["kind"], summary: string) => void;
  applyJob: (id: string) => void;
};

const KEY = "eduverse-care-v1";

const empty: Snapshot = {
  name: "Guest patient",
  appointments: [],
  cases: [],
  applications: [],
};

function readSnapshot(): Snapshot {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as Partial<Snapshot>) };
  } catch {
    return empty;
  }
}

function persist(state: CareState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      name: state.name,
      appointments: state.appointments,
      cases: state.cases,
      applications: state.applications,
    }),
  );
}

export const useCareStore = create<CareState>((set, get) => ({
  ...empty,
  hydrated: false,
  hydrate: () => {
    set({ ...readSnapshot(), hydrated: true });
  },
  setName: (name) => {
    set({ name });
    persist(get());
  },
  book: (providerId, when, reason) => {
    const appt: Appointment = {
      id: crypto.randomUUID(),
      providerId,
      when,
      reason,
      createdAt: Date.now(),
    };
    set({ appointments: [appt, ...get().appointments] });
    persist(get());
    return appt;
  },
  cancel: (id) => {
    set({ appointments: get().appointments.filter((a) => a.id !== id) });
    persist(get());
  },
  fileCase: (kind, summary) => {
    const item: CaseFile = {
      id: crypto.randomUUID(),
      kind,
      summary,
      status: "intake",
      createdAt: Date.now(),
    };
    set({ cases: [item, ...get().cases] });
    persist(get());
  },
  applyJob: (id) => {
    if (get().applications.includes(id)) return;
    set({ applications: [...get().applications, id] });
    persist(get());
  },
}));

export function providerById(id: string) {
  return PROVIDERS.find((p) => p.id === id);
}
