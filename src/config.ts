/**
 * Faculty Directory API (confirmed by AIU).
 * The Individual Faculty Profile API is the same URL with the id on the end, e.g. .../faculty/1
 */
export const FACULTY_LIST_URL = "https://kmahfuz.com/faculty-api/faculty";

/** Give up on a slow request after this long and show the error state. */
export const REQUEST_TIMEOUT_MS = 10_000;

/** Where "View Profile" goes (second page of the test). */
export const profileUrl = (id: number): string => `profile.html?id=${encodeURIComponent(String(id))}`;

/** One faculty member: the list endpoint with the id on the end (AIU: replace the final ID with 1-5). */
export const FACULTY_PROFILE_URL = (id: number): string => `${FACULTY_LIST_URL}/${id}`;
