import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [friends, setFriends] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [searching, setSearching] = useState(false);

  function loadProfile() {
    api.getMyProfile().then(setProfile).catch(() => setProfile(null));
  }

  function loadFriends() {
    api
      .getFriends()
      .then((d) => setFriends(d.friends))
      .catch(() => setFriends([]));
  }

  useEffect(() => {
    loadProfile();
    loadFriends();
  }, []);

  function startEditing() {
    setNameInput(profile.display_name);
    setNameError(null);
    setEditing(true);
  }

  async function saveName(e) {
    e.preventDefault();
    setNameError(null);
    setSaving(true);
    try {
      const updated = await api.updateDisplayName(nameInput.trim());
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setNameError(err.message.includes("409") ? "That name is taken" : err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 1) return;
    setSearchError(null);
    setSearching(true);
    try {
      const data = await api.searchProfiles(q);
      setResults(data.results);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(friendId) {
    await api.addFriend(friendId);
    setResults((prev) =>
      prev.map((r) => (r.id === friendId ? { ...r, is_friend: true } : r))
    );
    loadFriends();
  }

  async function handleRemove(friendId) {
    await api.removeFriend(friendId);
    setFriends((prev) => prev.filter((f) => f.friend_id !== friendId));
    setResults((prev) =>
      prev?.map((r) => (r.id === friendId ? { ...r, is_friend: false } : r))
    );
  }

  return (
    <div className="profile-page">
      <h2>Your Profile</h2>

      {profile && (
        <div className="round-card">
          {editing ? (
            <form onSubmit={saveName} className="auth-form">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
              />
              {nameError && <p className="error">{nameError}</p>}
              <div className="target-toggle">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p>
              <strong>{profile.display_name}</strong>{" "}
              <button className="link-button" onClick={startEditing}>
                Edit
              </button>
            </p>
          )}
        </div>
      )}

      <h3>Find friends</h3>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>
      </form>
      {searchError && <p className="error">{searchError}</p>}
      {results && results.length === 0 && <p className="meta">No matches.</p>}
      {results && results.length > 0 && (
        <ul className="friend-list">
          {results.map((r) => (
            <li key={r.id} className="friend-row">
              <span>{r.display_name}</span>
              {r.is_friend ? (
                <button className="btn-ghost" disabled>
                  Added
                </button>
              ) : (
                <button className="btn-ghost" onClick={() => handleAdd(r.id)}>
                  Add
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3>Your friends</h3>
      {friends === null && <p className="meta">Loading...</p>}
      {friends && friends.length === 0 && (
        <p className="meta">No friends yet — search above to add some.</p>
      )}
      {friends && friends.length > 0 && (
        <ul className="friend-list">
          {friends.map((f) => (
            <li key={f.friend_id} className="friend-row">
              <span>{f.display_name}</span>
              <button className="link-button" onClick={() => handleRemove(f.friend_id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
