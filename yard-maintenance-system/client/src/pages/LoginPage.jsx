import React from "react";
import { AlertTriangle, BadgeCheck, Loader2, Wrench } from "lucide-react";

function ShieldDot() {
  return <span className="shield-dot"><BadgeCheck size={15} /></span>;
}

export default function LoginPage({
  login,
  setLogin,
  loginError,
  loginLoading,
  onSubmit
}) {
  return (
    <>
      <div className="login-art">
        <div className="brand brand-light">
          <div className="brand-icon"><Wrench size={22} /></div>
          <div><b>YardCare</b><span>Equipment Maintenance MIS</span></div>
        </div>
        <div className="login-hero">
          <span className="eyebrow">YARD OPERATIONS · MAINTENANCE · REPORTING</span>
          <h1>Every machine.<br />Every job.<br /><em>Under control.</em></h1>
          <p>One place to manage inward gatepasses, maintenance job cards, SAP orders and daily yard reports.</p>
        </div>
        <div className="login-bottom">
          <span><ShieldDot /> Secure admin access</span>
          <span>Local-first workspace</span>
        </div>
      </div>
      <div className="login-panel">
        <form className="login-form" onSubmit={onSubmit}>
          <div className="mobile-brand"><Wrench /> YardCare</div>
          <span className="eyebrow">ADMINISTRATOR ACCESS</span>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to manage your yard operations.</p>
          <label>Username</label>
          <input
            autoComplete="username"
            value={login.username}
            onChange={(event) => setLogin({ ...login, username: event.target.value })}
            required
          />
          <label>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={login.password}
            onChange={(event) => setLogin({ ...login, password: event.target.value })}
            required
          />
          {loginError && <div className="error-box">{loginError}</div>}
          <button type="submit" disabled={loginLoading} className="login-button">
            {loginLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verifying credentials...
              </>
            ) : (
              "Login"
            )}
          </button>
          <div className="login-hint">
            <AlertTriangle size={15} /> Use the admin credentials configured in <code>server/.env</code>.
          </div>
        </form>
      </div>
    </>
  );
}
