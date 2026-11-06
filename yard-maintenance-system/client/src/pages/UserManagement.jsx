import React, { useEffect, useState } from "react";
import api from "../api";

const EMPTY = { username: "", password: "", permissions: {} };

export default function UserManagement() {
  const [menus, setMenus] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api.get("/api/auth/users");
    setUsers(response.data.users || []);
    setMenus(response.data.menus || []);
  }
  useEffect(() => { load().catch(e => setMessage(e.response?.data?.message || "Could not load users.")); }, []);

  function setPermission(menu, value) {
    setForm(current => ({ ...current, permissions: { ...current.permissions, [menu]: value } }));
  }

  async function createUser(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      await api.post("/api/auth/users", form);
      setForm(EMPTY); await load(); setMessage("User created successfully.");
    } catch (error) { setMessage(error.response?.data?.message || "Could not create user."); }
    finally { setBusy(false); }
  }

  async function saveUser(user) {
    setBusy(true); setMessage("");
    try {
      await api.patch(`/api/auth/users/${user._id}`, { permissions: editing.permissions, ...(newPassword ? { password: newPassword } : {}) });
      setEditing(null); setNewPassword(""); await load(); setMessage("User permissions updated.");
    } catch (error) { setMessage(error.response?.data?.message || "Could not update user."); }
    finally { setBusy(false); }
  }

  async function toggleActive(user) {
    try { await api.patch(`/api/auth/users/${user._id}`, { active: !user.active }); await load(); }
    catch (error) { setMessage(error.response?.data?.message || "Could not update user."); }
  }
  async function removeUser(user) {
    if (!window.confirm(`Delete user ${user.username}?`)) return;
    try { await api.delete(`/api/auth/users/${user._id}`); await load(); }
    catch (error) { setMessage(error.response?.data?.message || "Could not delete user."); }
  }

  return <div className="user-management-grid">
    <section className="panel user-admin-panel">
      <div className="panel-heading"><div><h2>Create User</h2><p>Assign each menu as hidden, view-only, or full edit access.</p></div></div>
      <form onSubmit={createUser} className="user-create-form">
        <label>Username<input required minLength={3} maxLength={40} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="e.g. manager01" /></label>
        <label>Password<input required minLength={12} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 12 characters" /></label>
        <h3>Menu permissions</h3>
        <div className="permission-list">{menus.map(menu => <label className="permission-row" key={menu}><span>{menu}</span><select value={form.permissions[menu] || "none"} onChange={e => setPermission(menu, e.target.value === "none" ? undefined : e.target.value)}><option value="none">No access</option><option value="view">View only</option><option value="edit">View + Add/Edit/Delete</option></select></label>)}</div>
        <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Create User"}</button>
      </form>
    </section>
    <section className="panel user-admin-panel">
      <div className="panel-heading"><div><h2>Existing Users</h2><p>{users.length} user account(s)</p></div></div>
      {message && <div className="notice-box">{message}</div>}
      <div className="user-list">{users.map(user => <div className="user-card" key={user._id}>
        <div className="user-card-top"><div><b>{user.username}</b><small>{Object.entries(user.permissions || {}).filter(([,v]) => v === "edit").length} editable · {Object.keys(user.permissions || {}).length} permitted menus</small></div><span className={user.active ? "status-active" : "status-inactive"}>{user.active ? "Active" : "Inactive"}</span></div>
        {editing?._id === user._id ? <><div className="permission-list">{menus.map(menu => <label className="permission-row" key={menu}><span>{menu}</span><select value={editing.permissions?.[menu] || "none"} onChange={e => setEditing(old => ({ ...old, permissions: { ...old.permissions, [menu]: e.target.value === "none" ? undefined : e.target.value } }))}><option value="none">No access</option><option value="view">View only</option><option value="edit">View + Add/Edit/Delete</option></select></label>)}</div><label>Reset password (optional)<input type="password" minLength={12} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current password" /></label><div className="user-actions"><button className="btn primary" onClick={() => saveUser(user)} disabled={busy}>Save changes</button><button className="btn secondary" onClick={() => { setEditing(null); setNewPassword(""); }}>Cancel</button></div></> : <div className="user-actions"><button className="btn secondary" onClick={() => setEditing({ ...user, permissions: { ...(user.permissions || {}) } })}>Edit permissions</button><button className="btn secondary" onClick={() => toggleActive(user)}>{user.active ? "Deactivate" : "Activate"}</button><button className="btn danger" onClick={() => removeUser(user)}>Delete</button></div>}
      </div>)}</div>
    </section>
  </div>;
}
