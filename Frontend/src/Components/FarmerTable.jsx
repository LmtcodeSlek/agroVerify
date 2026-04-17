import { useState } from "react";
import { colors, badge, font } from "../theme";

/**
 * FarmerTable
 * Props:
 *  farmers  – array of farmer objects
 *  onApprove  – (id) => void
 *  onReject   – (id) => void
 *  onView     – (id) => void
 *  loading    – boolean
 *  actionState – { [id]: { state: "approving" | "rejecting" | "error", message?: string } }
 */
const STATUS_VARIANT = {
  Approved: "green",
  Pending:  "yellow",
  Rejected: "red",
};

export default function FarmerTable({ farmers = [], onApprove, onReject, onView, loading, actionState = {}, canModerate = false, showModeration = true }) {
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("All");

  const PAGE_SIZE = 8;

  const filtered = farmers.filter(f => {
    const matchSearch = !search ||
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.nrc?.toLowerCase().includes(search.toLowerCase()) ||
      f.id?.toLowerCase().includes(search.toLowerCase()) ||
      f.farmerId?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || f.status === filter;
    return matchSearch && matchFilter;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows        = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={s.card}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.filterRow}>
          <input
            type="text"
            placeholder="🔍 Search by name, NRC, ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={s.searchInput}
          />
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1); }}
            style={s.select}
          >
            {["All", "Approved", "Pending", "Rejected"].map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <span style={s.count}>{filtered.length} farmer{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr style={s.theadRow}>
              {["Farmer ID", "Name", "NRC", "Village", "Officer", "Status", "Actions"].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={s.empty}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={s.empty}>No farmers found.</td></tr>
            ) : rows.map(f => (
              <tr key={f.id} style={s.tr}>
                <td style={s.td}><span style={s.mono}>{f.farmerId || f.id}</span></td>
                <td style={{ ...s.td, fontWeight: "600" }}>{f.name}</td>
                <td style={s.td}>{f.nrc || "—"}</td>
                <td style={s.td}>{f.village || "—"}</td>
                <td style={s.td}>{f.officer || "—"}</td>
                <td style={s.td}>
                  <span style={badge(STATUS_VARIANT[f.status] || "gray")}>
                    {f.status || "Unknown"}
                  </span>
                </td>
                <td style={s.td}>
                  <div style={s.actions}>
                    <button style={{ ...s.actionBtn, ...s.actionBtnGhost }} onClick={() => onView?.(f.id)}>View</button>
                    {f.status === "Pending" && showModeration && (
                      <>
                        <button
                          style={{ ...s.actionBtn, ...s.actionBtnApprove, ...(actionState[f.id]?.state === "approving" ? s.actionBtnBusy : {}) }}
                          disabled={!canModerate || actionState[f.id]?.state === "approving" || actionState[f.id]?.state === "rejecting"}
                          onClick={() => onApprove?.(f)}
                        >
                          {actionState[f.id]?.state === "approving" ? "Approving..." : "Approve"}
                        </button>
                        <button
                          style={{ ...s.actionBtn, ...s.actionBtnReject, ...(actionState[f.id]?.state === "rejecting" ? s.actionBtnBusy : {}) }}
                          disabled={!canModerate || actionState[f.id]?.state === "approving" || actionState[f.id]?.state === "rejecting"}
                          onClick={() => onReject?.(f)}
                        >
                          {actionState[f.id]?.state === "rejecting" ? "Rejecting..." : "Reject"}
                        </button>
                      </>
                    )}
                    {f.status === "Pending" && !canModerate && (
                      <span style={s.actionNote}>Owner only</span>
                    )}
                    {f.status === "Pending" && showModeration && !canModerate && (
                      <span style={s.actionNote}>Owner wallet required</span>
                    )}
                    {actionState[f.id]?.state === "approving" && (
                      <span style={s.actionNote}>Syncing approval...</span>
                    )}
                    {actionState[f.id]?.state === "rejecting" && (
                      <span style={s.actionNote}>Syncing rejection...</span>
                    )}
                    {actionState[f.id]?.state === "error" && (
                      <span style={s.actionError}>{actionState[f.id]?.message || "Failed. Try again."}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={s.pagination}>
        <span>Page {currentPage} of {totalPages}</span>
        <div style={s.pageBtns}>
          <button style={s.pageBtn} disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - currentPage) <= 2)
            .map(p => (
              <button
                key={p}
                style={{ ...s.pageBtn, ...(p === currentPage ? s.pageBtnActive : {}) }}
                onClick={() => setPage(p)}
              >{p}</button>
            ))
          }
          <button style={s.pageBtn} disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  card:      { background: "white", borderRadius: "10px", border: `1px solid ${colors.border}`, overflow: "hidden" },
  toolbar:   { padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid #f0f0f0` },
  filterRow: { display: "flex", gap: "8px", alignItems: "center" },
  searchInput: { padding: "6px 12px", border: `1px solid #e0e0e0`, borderRadius: "6px", fontSize: "12px", fontFamily: font, width: "220px", outline: "none" },
  select:    { padding: "6px 10px", border: `1px solid #e0e0e0`, borderRadius: "6px", fontSize: "12px", fontFamily: font, outline: "none" },
  count:     { fontSize: "12px", color: colors.muted },
  table:     { width: "100%", borderCollapse: "collapse" },
  theadRow:  { background: colors.bg },
  th:        { padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: colors.muted, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${colors.border}` },
  tr:        {},
  td:        { padding: "10px 14px", fontSize: "12px", color: colors.text, borderBottom: "1px solid #f5f5f5" },
  mono:      { fontFamily: "monospace", fontSize: "11px", color: "#555" },
  actions:   { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" },
  actionBtn: { cursor: "pointer", fontSize: "11px", padding: "6px 10px", borderRadius: "999px", border: "1px solid transparent", fontWeight: 600, letterSpacing: "0.2px", fontFamily: font, transition: "transform 0.08s ease, box-shadow 0.12s ease, background 0.12s ease" },
  actionBtnGhost: { background: "#f8fafc", borderColor: "#e5e7eb", color: "#334155" },
  actionBtnApprove: { background: colors.green, borderColor: colors.green, color: "white", boxShadow: "0 1px 0 rgba(0,0,0,0.05)" },
  actionBtnReject: { background: colors.danger, borderColor: colors.danger, color: "white", boxShadow: "0 1px 0 rgba(0,0,0,0.05)" },
  actionBtnBusy: { opacity: 0.7, cursor: "wait" },
  actionNote: { fontSize: "11px", color: colors.muted, fontWeight: 600 },
  actionError: { fontSize: "11px", color: colors.danger, fontWeight: 600 },
  empty:     { padding: "32px", textAlign: "center", color: colors.muted, fontSize: "13px" },
  pagination:{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", fontSize: "11px", color: "#666", background: "#fafafa", borderTop: `1px solid ${colors.border}` },
  pageBtns:  { display: "flex", gap: "4px" },
  pageBtn:   { padding: "4px 8px", border: `1px solid #e0e0e0`, borderRadius: "4px", fontSize: "11px", cursor: "pointer", background: "white", color: "#333", fontFamily: font },
  pageBtnActive: { background: colors.green, color: "white", borderColor: colors.green },
};
