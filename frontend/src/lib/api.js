// Thin wrapper around the FastAPI backend. Automatically attaches the logged-in
// user's Supabase access token so the backend can verify who is calling.
import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  getTrainingRound: (target = "median", school = null) =>
    request(
      `/training/round?target=${target}${school ? `&school=${encodeURIComponent(school)}` : ""}`
    ),
  getSchools: () => request("/training/schools"),
  getCourseHistory: (courseCode, excludeCourseId, beforeTerm) =>
    request(
      `/training/history?course_code=${encodeURIComponent(courseCode)}&exclude_course_id=${encodeURIComponent(excludeCourseId)}&before_term=${encodeURIComponent(beforeTerm)}`
    ),
  submitPrediction: (prediction) =>
    request("/predictions", { method: "POST", body: prediction }),
  myPredictions: () => request("/predictions/me"),
  leaderboard: (limit = 20, school = null) =>
    request(`/leaderboard?limit=${limit}${school ? `&school=${encodeURIComponent(school)}` : ""}`),
};
