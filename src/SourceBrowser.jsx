import React, { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { api } from "./api";
export default function SourceBrowser({ inventory }) {
  const sources = inventory.filter((s) => s.path.includes("additional-b2b"));
  const [source, setSource] = useState(""),
    [page, setPage] = useState(0),
    [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!source) return;
    setData(null);
    setError("");
    let ignore = false;
    api("source?path=" + encodeURIComponent(source) + "&page=" + page)
      .then((d) => {
        if (!ignore) setData(d);
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [source, page]);
  const columns = inventory.find((s) => s.path === source)?.columns || [];
  return (
    <section className="panel" style={{ marginBottom: 22 }}>
      <div className="panel-header">
        <div>
          <h3>Starter data room</h3>
          <p>
            44 source tabs · preserved rows · separate from the active campaign
          </p>
        </div>
        <FolderOpen size={18} />
      </div>
      <div className="filters">
        <select
          aria-label="Starter source"
          style={{ width: "100%", maxWidth: 650 }}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Choose a source to inspect its records…</option>
          {sources.map((s) => (
            <option key={s.path} value={s.path}>
              {s.path.split("/").slice(-2).join("/")} · {s.rows} rows
            </option>
          ))}
        </select>
      </div>
      {error && <p className="notice">{error}</p>}
      {source && !data && !error && (
        <p className="empty">Loading source rows…</p>
      )}
      {data && (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  {columns.map((c, i) => (
                    <th key={i}>{c || "Column " + (i + 1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    {r.values.map((v, i) => (
                      <td
                        key={i}
                        style={{
                          whiteSpace: "normal",
                          minWidth: 130,
                          maxWidth: 300,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {data.total.toLocaleString()} nonempty source rows · read-only
              evidence
            </span>
            <div>
              <button
                className="icon"
                aria-label="Previous source page"
                disabled={!page}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>{page + 1}</span>
              <button
                className="icon"
                aria-label="Next source page"
                disabled={(page + 1) * 50 >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
