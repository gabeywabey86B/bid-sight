import { useEffect, useRef } from "react";

export default function MultiSelectFilter({ options, selected, onChange }) {
  const summary = selected.length === 0 ? "All" : `${selected.length} selected`;
  const detailsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (detailsRef.current && !detailsRef.current.contains(e.target)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(value) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  return (
    <details className="multiselect" ref={detailsRef}>
      <summary>{summary}</summary>
      <div className="multiselect-menu">
        <div className="multiselect-actions">
          <button type="button" className="link-button" onClick={() => onChange([])}>
            Clear
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => (detailsRef.current.open = false)}
          >
            Done
          </button>
        </div>
        {options.map((value) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => toggle(value)}
            />
            {value}
          </label>
        ))}
      </div>
    </details>
  );
}
