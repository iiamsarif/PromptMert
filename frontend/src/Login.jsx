import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Login = ({ apiBase, defaultMode = "login" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const startOnSignup = useMemo(() => {
    if (defaultMode === "signup") return true;
    return location.pathname === "/signup";
  }, [defaultMode, location.pathname]);
  const [panelActive, setPanelActive] = useState(startOnSignup);
  const [authRole, setAuthRole] = useState(() => {
    const roleFromUrl = new URLSearchParams(location.search).get("role");
    return roleFromUrl === "seller" ? "seller" : "buyer";
  });

  useEffect(() => {
    const roleFromUrl = new URLSearchParams(location.search).get("role");
    setAuthRole(roleFromUrl === "seller" ? "seller" : "buyer");
  }, [location.search]);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    shopName: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loginEndpoint = authRole === "seller" ? "/api/seller/login" : "/api/auth/login";
  const signupEndpoint = authRole === "seller" ? "/api/seller/signup" : "/api/auth/signup";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${apiBase}${loginEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("user-updated"));
      navigate(data.user?.role === "seller" ? "/my-shop" : "/");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (authRole === "seller" && !signupForm.shopName.trim()) {
      setError("Shop name is required for seller signup");
      return;
    }
    try {
      const payload = {
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        confirmPassword: signupForm.confirmPassword
      };
      if (authRole === "seller") payload.shopName = signupForm.shopName;
      const res = await fetch(`${apiBase}${signupEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Signup failed");
      setSuccess(authRole === "seller" ? "Seller account created. Please login." : "Buyer account created. Please login.");
      setPanelActive(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page auth-page">
      <section className="auth-role-toggle">
        <button
          type="button"
          className={authRole === "buyer" ? "active" : ""}
          onClick={() => setAuthRole("buyer")}
        >
          Buyer
        </button>
        <button
          type="button"
          className={authRole === "seller" ? "active" : ""}
          onClick={() => setAuthRole("seller")}
        >
          Seller
        </button>
      </section>

      <section className={`container auth-container ${panelActive ? "right-panel-active" : ""}`}>
        <div className="form-container sign-up-container">
          <form onSubmit={handleSignup}>
            <h1>{authRole === "seller" ? "Seller Sign Up" : "Create Account"}</h1>
            <span>or use your email for registration</span>
            <input
              type="text"
              placeholder="Name"
              value={signupForm.name}
              onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={signupForm.email}
              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
              required
            />
            {authRole === "seller" && (
              <input
                type="text"
                placeholder="Shop Name"
                value={signupForm.shopName}
                onChange={(e) => setSignupForm({ ...signupForm, shopName: e.target.value })}
                required
              />
            )}
            <input
              type="password"
              placeholder="Password"
              value={signupForm.password}
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={signupForm.confirmPassword}
              onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
              required
            />
            <button type="submit">Sign Up</button>
            {success && <p className="success">{success}</p>}
            {error && <p className="error">{error}</p>}
          </form>
        </div>

        <div className="form-container sign-in-container">
          <form onSubmit={handleLogin}>
            <h1>{authRole === "seller" ? "Seller Login" : "Sign in"}</h1>
            <span>{authRole === "seller" ? "Only seller access here" : "or use your buyer account"}</span>
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
            />
            <button type="submit">Sign In</button>
            {error && <p className="error">{error}</p>}
          </form>
        </div>

        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Welcome Back!</h1>
              <p>Login with your existing account.</p>
              <button type="button" className="ghost" onClick={() => setPanelActive(false)}>
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Hello, Friend!</h1>
              <p>Create your account and start now.</p>
              <button type="button" className="ghost" onClick={() => setPanelActive(true)}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;
