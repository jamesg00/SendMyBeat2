import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Search, ShieldOff, Trash2, Users } from "lucide-react";

const PAGE_SIZE = 25;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: PAGE_SIZE, total: 0, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const extractErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail?.message) return detail.message;
    return fallback;
  };

  const fetchUsers = async (nextPage = pagination.page) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/users`, {
        params: {
          search: search.trim() || undefined,
          page: nextPage,
          page_size: PAGE_SIZE,
        },
      });
      setUsers(response.data.users || []);
      setPagination(response.data.pagination || { page: nextPage, page_size: PAGE_SIZE, total: 0, total_pages: 1 });
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString();
  };

  const submitSearch = (event) => {
    event.preventDefault();
    fetchUsers(1);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setActing(true);
    try {
      if (confirmAction.type === "disable") {
        await axios.post(`${API}/admin/users/${confirmAction.user.id}/disable`);
      } else {
        await axios.delete(`${API}/admin/users/${confirmAction.user.id}`);
      }
      setConfirmAction(null);
      await fetchUsers(pagination.page);
    } catch (err) {
      setError(extractErrorMessage(err, "User action failed."));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin User Management</h1>
            <p className="text-slate-500 mt-1">Disable or hard-delete test accounts from Producer Spotlight.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => window.location.href = "/admin/costs"} className="gap-2">
              <Users className="h-4 w-4" />
              Ops
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/dashboard"} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            <Button onClick={() => fetchUsers(pagination.page)} disabled={loading} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card className="shadow-md">
          <CardHeader className="bg-white border-b border-slate-100">
            <CardTitle>Users</CardTitle>
            <CardDescription>Search by username, email, or user id. Disabled users cannot log in or appear publicly.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={submitSearch} className="flex flex-col sm:flex-row gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <Button type="submit" className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Auth</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        <div>{user.username || "-"}</div>
                        <div className="text-xs font-normal text-slate-400">{user.id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{user.email || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{user.auth_provider || "unknown"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.deleted ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {!user.deleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setConfirmAction({ type: "disable", user })}
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                              Disable
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => setConfirmAction({ type: "delete", user })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
              <span>
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} users
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => fetchUsers(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={loading || pagination.page >= pagination.total_pages}
                  onClick={() => fetchUsers(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "delete" ? "Hard delete user?" : "Disable user?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "delete"
                ? "This permanently removes the user document and clears their Producer Spotlight records."
                : "This soft-deletes the user, blocks login, and removes them from Producer Spotlight."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {confirmAction?.user?.username || "Unknown user"} · {confirmAction?.user?.id}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={acting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeConfirmedAction} disabled={acting}>
              {acting ? "Working..." : confirmAction?.type === "delete" ? "Delete User" : "Disable User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
