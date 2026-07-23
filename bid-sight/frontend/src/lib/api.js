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
  const url = `${BASE}${path}`;

  // Layer 4: Debug Instrumentation — log all API calls for diagnosis
  console.debug("API request", {
    method,
    url,
    hasAuth: !!(await supabase.auth.getSession()).data?.session,
  });

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Layer 2: Business Logic Validation — check response status
    if (!res.ok) {
      const errorText = await res.text();
      const errorMsg = `${res.status} ${errorText}`;
      console.error("API error response", { status: res.status, url, error: errorMsg });
      throw new Error(errorMsg);
    }

    const data = await res.json();
    console.debug("API success", { url, statusCode: res.status });
    return data;
  } catch (err) {
    // Layer 4: Debug Instrumentation — log network errors
    console.error("API request failed", {
      url,
      method,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
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
  getCourseCodes: () => request("/courses/codes"),
  searchCourses: (q, limit = 200) =>
    request(`/courses/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  checkName: (name) => request(`/profiles/check-name?name=${encodeURIComponent(name)}`),
  getMyProfile: () => request("/profiles/me"),
  updateDisplayName: (display_name) =>
    request("/profiles/me", { method: "PATCH", body: { display_name } }),
  searchProfiles: (q) => request(`/profiles/search?q=${encodeURIComponent(q)}`),
  getFriends: () => request("/friends"),
  addFriend: (friend_id) => request("/friends", { method: "POST", body: { friend_id } }),
  removeFriend: (friend_id) => request(`/friends/${encodeURIComponent(friend_id)}`, { method: "DELETE" }),
  friendsLeaderboard: () => request("/leaderboard/friends"),
  getLiveCurrent: () => request("/live/current"),
  getLiveRound: (id) => request(`/live/rounds/${encodeURIComponent(id)}`),
  submitLiveBid: (roundId, amount) =>
    request(`/live/rounds/${encodeURIComponent(roundId)}/bids`, {
      method: "POST",
      body: { amount },
    }),
  adminListSessions: () => request("/live/admin/sessions"),
  adminCreateSession: (name) =>
    request("/live/admin/sessions", { method: "POST", body: { name } }),
  adminListRounds: (sessionId) =>
    request(`/live/admin/sessions/${encodeURIComponent(sessionId)}/rounds`),
  adminCreateRound: (sessionId, round) =>
    request(`/live/admin/sessions/${encodeURIComponent(sessionId)}/rounds`, {
      method: "POST",
      body: round,
    }),
  adminOpenRound: (id) => request(`/live/admin/rounds/${encodeURIComponent(id)}/open`, { method: "POST" }),
  adminCloseRound: (id) =>
    request(`/live/admin/rounds/${encodeURIComponent(id)}/close`, { method: "POST" }),
  adminRoundBids: (id) => request(`/live/admin/rounds/${encodeURIComponent(id)}/bids`),
  adminCreateLadder: (sessionId, course_code, section, capacity_override) =>
    request(`/live/admin/sessions/${encodeURIComponent(sessionId)}/ladder`, {
      method: "POST",
      body: { course_code, section, capacity_override },
    }),
  adminDeleteRound: (id) =>
    request(`/live/admin/rounds/${encodeURIComponent(id)}`, { method: "DELETE" }),
  adminDeleteLadder: (sessionId, courseCode, section) =>
    request(
      `/live/admin/sessions/${encodeURIComponent(sessionId)}/ladder?course_code=${encodeURIComponent(courseCode)}&section=${encodeURIComponent(section)}`,
      { method: "DELETE" }
    ),
  adminDeleteSession: (id, force = false) =>
    request(`/live/admin/sessions/${encodeURIComponent(id)}?force=${force}`, {
      method: "DELETE",
    }),
};
