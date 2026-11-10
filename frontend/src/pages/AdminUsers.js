import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Copy, RefreshCw, Search, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Admin: find accounts, then disable (soft delete) or hard delete them.

const PAGE_SIZE = 25;

const errorText = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  return fallback;
};

const formatDate = (value) => {
  if (!value) return "–";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: PAGE_SIZE, total: 0, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchUsers = async (nextPage = pagination.page) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/users`, { params: { search: search.trim() || undefined, page: nextPage, page_size: PAGE_SIZE } });
      setUsers(response.data.users || []);
      setPagination(response.data.pagination || { page: nextPage, page_size: PAGE_SIZE, total: 0, total_pages: 1 });
      setError(null);
    } catch (err) {
      setError(err?.response?.status === 403 ? "This page is only for admin accounts." : errorText(err, "Couldn't load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const runAction = async () => {
    if (!confirmAction) return;
    setActing(true);
    try {
      if (confirmAction.type === "disable") await axios.post(`${API}/admin/users/${confirmAction.user.id}/disable`);
      else await axios.delete(`${API}/admin/users/${confirmAction.user.id}`);
      toast.success(confirmAction.type === "disable" ? `${confirmAction.user.username || "User"} disabled` : `${confirmAction.user.username || "User"} deleted`);
      setConfirmAction(null);
      await fetchUsers(pagination.page);
    } catch (err) {
      setError(errorText(err, "That didn't work."));
    } finally {
      setActing(false);
    }
  };

  const copyId = (id) => {
    navigator.clipboard?.writeText(id).then(() => toast.success("User id copied"), () => {});
  };

  const handleShellSelect = (tab) => {
    if (tab === "spotlight") navigate("/spotlight");
    else navigate(`/dashboard?tab=${tab}`);
  };

  const deleting = confirmAction?.type === "delete";

  return (
    <div className="min-h-screen dashboard-parallax-bg">
      <AppShell
        active="admin-users"
        onSelect={handleShellSelect}
        title="Users"
        crumb="Admin · Find, disable or delete accounts"
        isAdmin
        onAdmin={(path) => navigate(path)}
        actions={
          <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={() => fetchUsers(pagination.page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      >
        <div className="adm">
          {error ? (
            <div className="smb-card adm-error" role="alert">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{error}</span>
            </div>
          ) : null}

          <section className="smb-card">
            <form
              className="adm-search"
              onSubmit={(event) => {
                event.preventDefault();
                fetchUsers(1);
              }}
            >
              <Search className="h-4 w-4 smb-t3" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username, email or user id" aria-label="Search users" />
              <button type="submit" className="smb-btn smb-btn--pri smb-btn--sm">Search</button>
            </form>
            <p className="smb-t3 text-xs">Disabled accounts can't sign in and are hidden from Spotlight. Deleting removes the account and its Spotlight records for good.</p>

            <div className="adm-table-wrap">
              <table className="adm-table adm-users">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Sign-in</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="adm-user">
                          <span className="smb-avatar" aria-hidden="true">{String(user.username || "?").slice(0, 2).toUpperCase()}</span>
                          <span className="min-w-0">
                            <b className="block truncate">{user.username || "–"}</b>
                            <button type="button" className="adm-id" onClick={() => copyId(user.id)} title="Copy user id">
                              <span className="truncate">{user.id}</span>
                              <Copy className="h-3 w-3 flex-none" aria-hidden="true" />
                            </button>
                          </span>
                        </div>
                      </td>
                      <td className="smb-t2">{user.email || "–"}</td>
                      <td className="smb-mono smb-t2">{formatDate(user.created_at)}</td>
                      <td className="smb-t2 capitalize">{user.auth_provider || "unknown"}</td>
                      <td>
                        <span className={`smb-pill ${user.deleted ? "smb-pill--bad" : "smb-pill--ok"}`}>{user.status || (user.deleted ? "disabled" : "active")}</span>
                      </td>
                      <td>
                        <div className="adm-actions">
                          {!user.deleted ? (
                            <button type="button" className="smb-btn smb-btn--sec smb-btn--sm adm-icon-btn" onClick={() => setConfirmAction({ type: "disable", user })} aria-label={`Disable ${user.username || user.id}`} title="Disable">
                              <ShieldOff className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button type="button" className="smb-btn smb-btn--sm adm-btn-danger adm-icon-btn" onClick={() => setConfirmAction({ type: "delete", user })} aria-label={`Delete ${user.username || user.id}`} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && users.length === 0 ? <p className="smb-t3 text-sm adm-empty">No users found.</p> : null}
              {loading && users.length === 0 ? <p className="smb-t3 text-sm adm-empty">Loading…</p> : null}
            </div>

            <div className="adm-pager">
              <span className="smb-mono smb-t3 text-xs">
                Page {pagination.page} of {pagination.total_pages || 1} · {Number(pagination.total || 0).toLocaleString()} users
              </span>
              <div className="flex gap-2">
                <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" disabled={loading || pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>Previous</button>
                <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" disabled={loading || pagination.page >= pagination.total_pages} onClick={() => fetchUsers(pagination.page + 1)}>Next</button>
              </div>
            </div>
          </section>
        </div>
      </AppShell>

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="bg-[var(--card-bg)] border border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>{deleting ? "Delete this account for good?" : "Disable this account?"}</DialogTitle>
            <DialogDescription>
              {deleting
                ? "This permanently removes the account and clears its Spotlight records. It can't be undone."
                : "They won't be able to sign in, and they're hidden from Spotlight. Their data is kept."}
            </DialogDescription>
          </DialogHeader>
          <div className="adm-confirm-who">
            <b>{confirmAction?.user?.username || "Unknown user"}</b>
            <span className="smb-mono smb-t3 text-xs">{confirmAction?.user?.id}</span>
          </div>
          <DialogFooter>
            <Button className="smb-btn smb-btn--sec" onClick={() => setConfirmAction(null)} disabled={acting}>Cancel</Button>
            <Button className={`smb-btn ${deleting ? "adm-btn-danger" : "smb-btn--pri"}`} onClick={runAction} disabled={acting}>
              {acting ? "Working…" : deleting ? "Delete account" : "Disable account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
