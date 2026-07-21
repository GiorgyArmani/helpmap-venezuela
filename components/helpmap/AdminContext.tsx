"use client";

// Shared state + handlers for the staff/admin panel, passed once via React Context so
// AdminPanel (and future per-tab sub-components) can consume them without prop-drilling
// dozens of values through the tree (CLAUDE.md §14 — "extract the admin panel via a
// staff Context"). HelpMap owns all the state; this is purely the transport.

import { createContext, useContext } from "react";
import type {
  Donation,
  Estatus,
  Lang,
  Location,
  PatientPublic,
  Rescatado,
  Strings,
  VolunteerRequest,
} from "./data";
import type { AdminTab, AuditEntry, AuthUser, Draft, EditType, MissingReport, View } from "./types";

// A geocoder hit from the center form's address search (Nominatim).
export type GeoResult = { lat: number; lng: number; label: string; address?: Record<string, string> };

// A pending public photo/info contribution to an existing patient record.
export type ContribRow = {
  id: string;
  patient_id: string;
  patient_name: string;
  foto_url: string | null;
  descripcion: string | null;
  contacto: string | null;
};

// A provisioned volunteer account row (admin_users).
export type VolunteerRow = { user_id: string; email: string };

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export interface AdminCtx {
  // shell / auth
  pickingOnMap: boolean;
  setPickingOnMap: Setter<boolean>;
  user: AuthUser | null;
  signOut: () => void;
  openStaffTour: () => void;
  setView: Setter<View>;
  clearEdit: () => void;
  t: Strings;
  lang: Lang;

  // login
  recoverMode: boolean;
  setRecoverMode: Setter<boolean>;
  sendRecovery: (e: React.FormEvent) => void;
  recoverSent: boolean;
  setRecoverSent: Setter<boolean>;
  loginEmail: string;
  setLoginEmail: Setter<string>;
  loginBusy: boolean;
  loginErr: string;
  setLoginErr: Setter<string>;
  signIn: (e: React.FormEvent) => void;
  loginPass: string;
  setLoginPass: Setter<string>;

  // tabs
  editType: EditType;
  adminTab: AdminTab;
  switchTab: (tab: AdminTab) => void;
  isAdmin: boolean;
  isVolunteer: boolean;
  loadAudit: () => void;
  loadContributions: () => void;
  loadVolRequests: () => void;
  loadVolunteers: () => void;
  loadReports: () => void;
  loadRescAdmin: () => void;

  // maintenance
  maintenance: boolean;
  toggleMaintenance: () => void;
  maintBusy: boolean;

  // feed / novedades
  contribs: ContribRow[];
  reports: MissingReport[];
  volReqs: VolunteerRequest[];
  audit: AuditEntry[];

  // shared list helpers
  admSearchBar: React.ReactNode;
  admHit: (s: string) => boolean;
  admQ: string;

  // centros
  newCenter: () => void;
  locations: Location[];
  patients: PatientPublic[];
  editCenter: (l: Location) => void;
  deleteCenter: (id: string) => void;

  // donaciones
  newDonation: () => void;
  donations: Donation[];
  editDonation: (d: Donation) => void;
  deleteDonation: (id: string) => void;

  // personas
  newPerson: () => void;
  editPerson: (p: PatientPublic) => void;
  deletePerson: (id: string) => void;

  // rescatados
  newRescatado: () => void;
  rescAdmin: Rescatado[];
  startPromote: (r: Rescatado) => void;
  editRescatado: (r: Rescatado) => void;
  deleteRescatado: (id: string) => void;

  // reportes
  reviewReport: (id: string, action: "reviewed" | "closed") => void;

  // listas
  listLoc: string;
  setListLoc: Setter<string>;
  listDate: string;
  setListDate: Setter<string>;
  todayISO: string;
  listNote: string;
  setListNote: Setter<string>;
  onPickList: (e: React.ChangeEvent<HTMLInputElement>) => void;
  listBusy: boolean;
  listProgress: { done: number; total: number } | null;
  listResult: { kind: "ok" | "partial" | "error"; msg: string } | null;

  // voluntarios
  reviewVolRequest: (id: string, action: "approve" | "reject") => void;
  volEmail: string;
  setVolEmail: Setter<string>;
  volPass: string;
  setVolPass: Setter<string>;
  genPass: () => void;
  createVolunteer: () => void;
  volBusy: boolean;
  volunteers: VolunteerRow[];
  revokeVolunteer: (id: string) => void;

  // edit forms
  draft: Draft | null;
  setD: (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setDV: (k: keyof Draft, v: Draft[keyof Draft]) => () => void;
  setDraft: Setter<Draft | null>;
  geoQuery: string;
  setGeoQuery: Setter<string>;
  geoBusy: boolean;
  geocodeAddress: () => void;
  geoResults: GeoResult[];
  pickGeoResult: (r: GeoResult) => void;
  saveCenter: () => void;
  saveDonation: () => void;
  savePerson: () => void;
  saveRescatado: () => void;
  savePromotion: () => void;
  reviewContribution: (id: string, action: "approve" | "reject") => void;
  statusOpts: { v: Estatus; label: string }[];
  canDelete: boolean;
  editId: string | null;
}

const Ctx = createContext<AdminCtx | null>(null);

export const AdminProvider = Ctx.Provider;

export function useAdmin(): AdminCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used within <AdminProvider>");
  return v;
}
