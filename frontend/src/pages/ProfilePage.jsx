import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

// Suggestions start once the query is this long — shorter prefixes match too
// much of the roster to be useful.
const MIN_QUERY = 3;
const DEBOUNCE_MS = 250;

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);

  const [friends, setFriends] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);

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

  // Debounced live search. The cleanup cancels the pending timer, so only the
  // query the user settles on reaches the network.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setResults(null);
      setSearchError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchProfiles(q);
        // Discard a response the user has already typed past.
        if (cancelled) return;
        setResults(data.results);
        setSearchError(null);
        setOpen(true);
      } catch (err) {
        if (!cancelled) setSearchError(err.message);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Same outside-click pattern as the training table's column filters.
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAdd(friendId) {
    await api.addFriend(friendId);
    setResults((prev) =>
      prev?.map((r) => (r.id === friendId ? { ...r, is_friend: true } : r))
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
          <p>
            <strong>{profile.display_name}</strong>
          </p>
        </div>
      )}

      <h3>Find friends</h3>
      <div className="search-form friend-search" ref={searchRef}>
        <input
          type="text"
          placeholder={`Search by name (${MIN_QUERY}+ letters)`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        />
        {open && query.trim().length >= MIN_QUERY && (
          <div className="multiselect-menu friend-suggestions">
            {searching && <p className="meta">Searching...</p>}
            {!searching && results?.length === 0 && <p className="meta">No matches.</p>}
            {results?.map((r) => (
              <div key={r.id} className="friend-row">
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
              </div>
            ))}
          </div>
        )}
      </div>
      {searchError && <p className="error">{searchError}</p>}

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
