import type { Faculty, FacultyListResponse } from "./types";
import { FACULTY_LIST_URL, FACULTY_PROFILE_URL, REQUEST_TIMEOUT_MS } from "./config";

export class NotFoundError extends Error {}

function isFaculty(x: unknown): x is Faculty {
  const o = x as Partial<Faculty> | null;
  return !!o && typeof o === "object" && typeof o.id === "number" && typeof o.name === "string";
}

/** Accepts `{count, data:[...]}` or a bare array, and fills in missing optional fields. */
function parse(json: unknown): Faculty[] {
  const list = Array.isArray(json) ? json : (json as Partial<FacultyListResponse> | null)?.data;
  if (!Array.isArray(list)) throw new Error("Unexpected response shape");
  return list.filter(isFaculty).map((f) => ({
    ...f,
    designation: f.designation ?? "",
    school: f.school ?? "",
    department: f.department ?? "",
    photo_url: f.photo_url || null,
    biography: f.biography ?? "",
    education: f.education ?? [],
    research_interests: f.research_interests ?? [],
    publications: f.publications ?? [],
    courses_taught: f.courses_taught ?? [],
  }));
}

/**
 * Rejects if the promise has not settled after `ms`.
 * (No AbortSignal on purpose: some preview/sandbox environments proxy fetch()
 * through postMessage, and an AbortSignal cannot be cloned across that boundary.)
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`Request timed out after ${ms} ms`)), ms);
    p.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function getJson(url: string): Promise<{ status: number; json: unknown }> {
  const res = await withTimeout(fetch(url, { headers: { Accept: "application/json" } }), REQUEST_TIMEOUT_MS);
  if (res.status === 404) throw new NotFoundError(`Not found: ${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { status: res.status, json: await withTimeout(res.json(), REQUEST_TIMEOUT_MS) };
}

/** Every faculty member, from the Faculty Directory API. */
export async function loadFaculty(): Promise<Faculty[]> {
  return parse((await getJson(FACULTY_LIST_URL)).json);
}

/** One faculty member, from the Individual Faculty Profile API. Accepts `{...}`, `{data:{...}}` or `{data:[{...}]}`. */
export async function loadFacultyById(id: number): Promise<Faculty> {
  const { json } = await getJson(FACULTY_PROFILE_URL(id));
  const inner = (json as { data?: unknown } | null)?.data ?? json;
  const [f] = parse(Array.isArray(inner) ? inner : [inner]);
  if (!f) throw new Error("Unexpected response shape");
  return f;
}
