import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminAccess = ({ apiBase }) => {
  const [form, setForm] = useState({ adminId: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [timestamp, setTimestamp] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const formatNow = () => {
      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const time = now.toTimeString().split(" ")[0];
      setTimestamp(`${date} ${time}`);
    };
    formatNow();
    const timer = setInterval(formatNow, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("adminToken", data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page auth-page admin-login-page">
      <section className="login-card">
        <div className="logo-section">
          <div className="logo-icon" aria-hidden="true">
            »
          </div>
          <div className="logo-text">
            <h1>DirectAdmin</h1>
            <p>web control panel</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="admin"
              value={form.adminId}
              onChange={(e) => setForm({ ...form, adminId: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="eye-icon"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <button className="sign-in-btn" type="submit">Sign in</button>
          {error && <p className="error">{error}</p>}
        </form>

        <div className="footer-info">
          <div className="language-selector">
            <span>Language: English</span>
            <span>⌃</span>
          </div>
          <div className="timestamp">{timestamp}</div>
        </div>
      </section>
    </main>
  );
};

export default AdminAccess;


