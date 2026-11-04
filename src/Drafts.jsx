import React, { useEffect, useState } from "react";
import { api } from "./api";
export default function Drafts({ id }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("documents?companyId=" + encodeURIComponent(id))
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <>
      <div className="notice">
        Retained campaign drafts. Review current roles, candidate fit and Feny’s
        updated portfolio before use. These drafts have not been sent.
      </div>
      {error && <p>{error}</p>}
      {!data && !error && <p>Loading retained drafts…</p>}
      {data && !data.documents.length && (
        <p className="muted">No prepared campaign drafts for this company.</p>
      )}
      {data?.documents.map((d) => (
        <details className="evidence-row" key={d.kind}>
          <summary>
            {d.kind === "proposal"
              ? "Company partnership proposal"
              : "Historical resource introduction"}{" "}
            · retained draft
          </summary>
          <small>{d.path}</small>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {d.text}
          </pre>
        </details>
      ))}
    </>
  );
}
