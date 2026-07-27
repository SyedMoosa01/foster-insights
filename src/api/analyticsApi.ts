import type { AppModel, ChildRecord, PlacementRecord, ProviderRecord } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type ApiModel = Omit<AppModel, "reportingDate" | "childById" | "providerById" | "children" | "placements" | "providers" | "fosterPlacements" | "currentChildren"> & {
  reportingDate: string;
  children: Array<Omit<ChildRecord, "removal_date" | "discharge_date"> & { removal_date: string | null; discharge_date: string | null }>;
  placements: Array<Omit<PlacementRecord, "start" | "end"> & { start: string | null; end: string }>;
  providers: Array<Omit<ProviderRecord, "licenseStart" | "licenseEnd" | "lastPlacementActivityDate"> & {
    licenseStart: string | null;
    licenseEnd: string | null;
    lastPlacementActivityDate: string | null;
  }>;
  fosterPlacements: Array<Omit<PlacementRecord, "start" | "end"> & { start: string | null; end: string }>;
  currentChildren: Array<Omit<ChildRecord, "removal_date" | "discharge_date"> & { removal_date: string | null; discharge_date: string | null }>;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hydrateChildren(rows: ApiModel["children"]): ChildRecord[] {
  return rows.map((row) => ({
    ...row,
    removal_date: parseDate(row.removal_date),
    discharge_date: parseDate(row.discharge_date),
  }));
}

function hydratePlacements(rows: ApiModel["placements"]): PlacementRecord[] {
  return rows.map((row) => ({
    ...row,
    start: parseDate(row.start),
    end: parseDate(row.end) ?? new Date("2026-07-01T00:00:00"),
  }));
}

function hydrateModel(raw: ApiModel): AppModel {
  const children = hydrateChildren(raw.children);
  const placements = hydratePlacements(raw.placements);
  const fosterPlacements = hydratePlacements(raw.fosterPlacements);
  const currentChildren = hydrateChildren(raw.currentChildren);
  const providers: ProviderRecord[] = raw.providers.map((row) => ({
    ...row,
    licenseStart: parseDate(row.licenseStart),
    licenseEnd: parseDate(row.licenseEnd),
    lastPlacementActivityDate: parseDate(row.lastPlacementActivityDate),
  }));

  return {
    ...raw,
    reportingDate: parseDate(raw.reportingDate) ?? new Date("2026-07-01T00:00:00"),
    children,
    placements,
    providers,
    fosterPlacements,
    currentChildren,
    childById: new Map(children.map((child) => [child.id_child, child])),
    providerById: new Map(providers.map((provider) => [provider.id_provider, provider])),
  };
}

async function parseResponse(response: Response): Promise<AppModel> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `Request failed with status ${response.status}`);
  }
  return hydrateModel((await response.json()) as ApiModel);
}

export async function loadSampleModel(): Promise<AppModel> {
  return parseResponse(await fetch(`${API_BASE}/api/sample`));
}

export async function processUploadedFiles(files: Required<{ child: File; placement: File; provider: File }>): Promise<AppModel> {
  const body = new FormData();
  body.append("child", files.child);
  body.append("placement", files.placement);
  body.append("provider", files.provider);
  return parseResponse(await fetch(`${API_BASE}/api/process`, { method: "POST", body }));
}
