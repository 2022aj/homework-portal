"use client";

export function AdminLogoutButton() {
  async function handleLogout() {
    await fetch("/api/admin-logout", {
      method: "POST",
    });

    window.location.href = "/admin-login";
  }

  return (
    <button className="button-secondary" onClick={() => void handleLogout()} type="button">
      Log out
    </button>
  );
}
