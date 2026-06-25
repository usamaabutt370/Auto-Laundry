"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import type { AdminUser } from "@/features/admin/types/admin-user";
import {
  AdminDesktopTable,
  AdminListPagination,
  adminPaginationView,
  useAdminListUrl,
  useDebouncedListSearch,
} from "@/features/admin/components/admin-list-ui";
import type { PaginatedResult } from "@/features/admin/server/admin-list-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const statusPillMap: Record<AdminUser["status"], { bg: string; fg: string; border: string }> = {
  Active: { bg: "rgba(110, 231, 168, 0.2)", fg: "#6EE7A8", border: "rgba(110, 231, 168, 0.45)" },
  Pending: { bg: "rgba(246, 211, 107, 0.2)", fg: "#F6D36B", border: "rgba(246, 211, 107, 0.45)" },
  Blocked: { bg: "rgba(241, 140, 140, 0.22)", fg: "#F18C8C", border: "rgba(241, 140, 140, 0.45)" },
  "N/A": { bg: "rgba(160, 174, 192, 0.22)", fg: "#C6D0DF", border: "rgba(160, 174, 192, 0.45)" },
};

const statusPillClass = "admin-status-pill border text-[11px] font-semibold sm:text-xs";

const tableGridClass =
  "grid grid-cols-[minmax(128px,1.1fr)_minmax(200px,1.55fr)_minmax(136px,1fr)_minmax(132px,1fr)_80px_minmax(96px,0.9fr)] items-center gap-x-4 gap-y-1";

type UsersListProps = {
  data: PaginatedResult<AdminUser>;
};

type EditForm = {
  name: string;
  email: string;
  phone: string;
};

function toFormValue(value: string): string {
  return value === "N/A" ? "" : value;
}

function formFromUser(user: AdminUser): EditForm {
  return {
    name: toFormValue(user.name),
    email: toFormValue(user.email),
    phone: toFormValue(user.phone),
  };
}

export function UsersList({ data }: UsersListProps) {
  const router = useRouter();
  const { setPage } = useAdminListUrl();
  const { query, setQuery } = useDebouncedListSearch();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", email: "", phone: "" });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const users = data.items;
  const { pageCount, rangeStart, rangeEnd, pageNumbers } = adminPaginationView(data);

  useEffect(() => {
    if (!selectedUser) {
      setEditing(false);
      setEditForm({ name: "", email: "", phone: "" });
      setStatusNote(null);
      return;
    }
    setEditForm(formFromUser(selectedUser));
    setEditing(false);
    setStatusNote(null);
  }, [selectedUser]);

  function closeModal() {
    setSelectedUser(null);
    setEditing(false);
    setDeleteConfirmOpen(false);
    setStatusNote(null);
    setBusy(null);
  }

  function startEditing() {
    if (!selectedUser) return;
    setEditForm(formFromUser(selectedUser));
    setEditing(true);
    setStatusNote(null);
  }

  async function saveEdits() {
    if (!selectedUser) return;

    const name = editForm.name.trim();
    const email = editForm.email.trim();
    const phone = editForm.phone.trim();

    if (!name || !email || !phone) {
      setStatusNote("Name, email, and phone are required.");
      return;
    }

    setBusy("save");
    setStatusNote(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || `Request failed with status ${response.status}`);

      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              name,
              email,
              phone,
            }
          : prev,
      );
      setEditing(false);
      setStatusNote("User updated successfully.");
      router.refresh();
    } catch (error) {
      setStatusNote(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!selectedUser) return;

    setBusy("delete");
    setStatusNote(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || `Request failed with status ${response.status}`);

      closeModal();
      router.refresh();
    } catch (error) {
      setStatusNote(error instanceof Error ? error.message : "Failed to delete user.");
      setDeleteConfirmOpen(false);
    } finally {
      setBusy(null);
    }
  }

  const inputClassName =
    "mt-1 w-full rounded-lg border px-3 py-2 text-[14px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  return (
    <section className="w-full min-w-0 space-y-3 sm:space-y-4">
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete user?"
        description={
          selectedUser
            ? `This permanently deletes ${selectedUser.name} and their auth account. This cannot be undone.`
            : "This permanently deletes the user and their auth account. This cannot be undone."
        }
        confirmLabel={busy === "delete" ? "Deleting…" : "Delete user"}
        cancelLabel="Cancel"
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (busy === "delete") return;
          setDeleteConfirmOpen(false);
        }}
      />

      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">
          Users
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          Customers on {PRODUCT_NAME}: view, edit, or delete customer accounts.
        </p>
      </div>

      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by user ID, name, email, phone..."
          className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
        />
      </div>

      <AdminDesktopTable minWidthClassName="w-full min-w-[1080px]">
          <div
            className={`sticky top-0 z-[1] ${tableGridClass} border-b px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white/70 sm:text-xs`}
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <span className="text-left">Name</span>
            <span className="text-left">Email</span>
            <span className="text-left">Phone</span>
            <span className="text-left">Status</span>
            <span className="text-center">Orders</span>
            <span className="text-right">Joined</span>
          </div>
          {users.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/60">
              No users match the selected filter.
            </div>
          ) : null}
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setSelectedUser(user)}
              className={`${tableGridClass} w-full border-b px-4 py-2.5 text-left text-[13px] text-white/85 transition hover:bg-white/[0.04] last:border-b-0 sm:py-3`}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <span className="font-semibold leading-snug">{user.name}</span>
              <span className="min-w-0 truncate text-left" title={user.email}>
                {user.email}
              </span>
              <span className="whitespace-nowrap text-left tabular-nums">{user.phone}</span>
              <div className="flex w-full min-w-[120px] max-w-[160px] items-center justify-start">
                <span
                  className={`${statusPillClass} inline-flex rounded-full py-1 pl-2.5 pr-3`}
                  style={{
                    backgroundColor: statusPillMap[user.status].bg,
                    color: statusPillMap[user.status].fg,
                    borderColor: statusPillMap[user.status].border,
                  }}
                >
                  {user.status}
                </span>
              </div>
              <span className="block text-center tabular-nums leading-none">{user.orders}</span>
              <span className="whitespace-nowrap text-right tabular-nums leading-none">
                {user.joinedAt}
              </span>
            </button>
          ))}
      </AdminDesktopTable>

      <div className="grid gap-3 md:hidden">
        {users.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-white/60" style={{ borderColor: theme.colors.outline }}>
            No users match the selected filter.
          </p>
        ) : null}
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => setSelectedUser(user)}
            className="rounded-xl border p-3.5 text-left transition hover:bg-white/[0.04] sm:p-4"
            style={{
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.sidebarBackground,
            }}
          >
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-snug text-white sm:text-[16px]">{user.name}</p>
              <p className="mt-1 break-words text-[12px] leading-relaxed text-white/75 sm:text-[13px]">
                {user.email}
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/55 sm:w-20 sm:text-[12px]">
                Status
              </span>
              <span
                className={`${statusPillClass} inline-flex w-fit rounded-full py-1.5 pl-3 pr-3.5`}
                style={{
                  backgroundColor: statusPillMap[user.status].bg,
                  color: statusPillMap[user.status].fg,
                  borderColor: statusPillMap[user.status].border,
                }}
              >
                {user.status}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 text-[12px] text-white/85 sm:grid-cols-2 sm:text-[13px]">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-[11px] font-medium text-white/55">Phone</dt>
                <dd className="break-all leading-snug">{user.phone}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[11px] font-medium text-white/55">Orders</dt>
                <dd className="tabular-nums leading-none">{user.orders}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:text-right">
                <dt className="text-[11px] font-medium text-white/55 sm:text-right">Joined</dt>
                <dd className="tabular-nums leading-none sm:text-right">{user.joinedAt}</dd>
              </div>
            </dl>
          </button>
        ))}
      </div>

      <AdminListPagination
        page={data.page}
        pageCount={pageCount}
        total={data.total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        pageNumbers={pageNumbers}
        noun="users"
      />

      {selectedUser ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center p-3 sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            aria-label="Close user details"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={closeModal}
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-[221] w-full max-w-[640px] rounded-2xl border px-4 py-5 shadow-xl sm:px-6 sm:py-6"
            style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.sidebarBackground }}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border text-[20px] font-semibold leading-none text-white transition hover:brightness-110"
              style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
              aria-label="Close modal"
            >
              ×
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">User detail</p>
            <h2 className="mt-1 pr-10 text-[18px] font-bold text-white sm:text-[22px]">
              {editing ? "Edit user" : selectedUser.name}
            </h2>
            <p className="mt-1 font-mono text-[12px] text-white/60">{selectedUser.id}</p>

            {statusNote ? (
              <p
                className={`mt-3 rounded-lg border px-3 py-2 text-[13px] ${
                  statusNote.includes("successfully")
                    ? "border-emerald-400/40 text-emerald-200"
                    : "border-red-400/40 text-red-200"
                }`}
              >
                {statusNote}
              </p>
            ) : null}

            {editing ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Name</span>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={inputClassName}
                    style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.04)" }}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Email</span>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className={inputClassName}
                    style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.04)" }}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Phone</span>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className={inputClassName}
                    style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.04)" }}
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Email</p>
                  <p className="mt-1 break-all text-[14px] text-white">{selectedUser.email}</p>
                </article>
                <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Phone</p>
                  <p className="mt-1 text-[14px] text-white">{selectedUser.phone}</p>
                </article>
                <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Status</p>
                  <span
                    className={`${statusPillClass} mt-2 inline-flex rounded-full py-1 pl-2.5 pr-3`}
                    style={{
                      backgroundColor: statusPillMap[selectedUser.status].bg,
                      color: statusPillMap[selectedUser.status].fg,
                      borderColor: statusPillMap[selectedUser.status].border,
                    }}
                  >
                    {selectedUser.status}
                  </span>
                </article>
                <article className="rounded-xl border px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Orders</p>
                  <p className="mt-1 text-[14px] text-white">{selectedUser.orders}</p>
                </article>
                <article className="rounded-xl border px-3.5 py-3 sm:col-span-2" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Joined</p>
                  <p className="mt-1 text-[14px] text-white">{selectedUser.joinedAt}</p>
                </article>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {editing ? (
                <>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void saveEdits()}
                    className="h-10 rounded-full border px-5 text-[14px] font-semibold text-white disabled:opacity-60 sm:h-11"
                    style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
                  >
                    {busy === "save" ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      setEditing(false);
                      setEditForm(formFromUser(selectedUser));
                      setStatusNote(null);
                    }}
                    className="h-10 rounded-full border px-5 text-[14px] font-semibold text-white disabled:opacity-60 sm:h-11"
                    style={{ borderColor: "rgba(255,255,255,0.35)", backgroundColor: "transparent" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={startEditing}
                    className="h-10 rounded-full border px-5 text-[14px] font-semibold text-white disabled:opacity-60 sm:h-11"
                    style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
                  >
                    Edit user
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="h-10 rounded-full border px-5 text-[14px] font-semibold text-red-200 disabled:opacity-60 sm:h-11"
                    style={{ borderColor: "rgba(241, 140, 140, 0.45)", backgroundColor: "rgba(241, 140, 140, 0.12)" }}
                  >
                    Delete user
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
