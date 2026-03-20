import React, { Suspense, lazy, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AdminHeader from "./AdminHeader.jsx";
import "./App.css";

const Home = lazy(() => import("./Home.jsx"));
const Services = lazy(() => import("./Services.jsx"));
const Posts = lazy(() => import("./Posts.jsx"));
const PostDetails = lazy(() => import("./PostDetails.jsx"));
const MyPosts = lazy(() => import("./MyPosts.jsx"));
const Account = lazy(() => import("./Account.jsx"));
const Contact = lazy(() => import("./Contact.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Signup = lazy(() => import("./Signup.jsx"));
const AdminAccess = lazy(() => import("./AdminAccess.jsx"));
const AdminPanel = lazy(() => import("./AdminPanel.jsx"));
const PostService = lazy(() => import("./PostService.jsx"));
const Purchase = lazy(() => import("./Purchase.jsx"));
const MyShop = lazy(() => import("./MyShop.jsx"));

const rawApiBase = (import.meta.env.VITE_API_BASE || "https://promptmert.onrender.com").trim();
const API_BASE = rawApiBase || (import.meta.env.DEV ? "https://promptmert.onrender.com" : "");

const MissingApiBaseGuard = () => (
  <div className="page-loader" style={{ minHeight: "100vh", padding: "24px", textAlign: "center", flexDirection: "column", gap: "12px" }}>
    <h2 style={{ margin: 0 }}>Missing API Configuration</h2>
    <p style={{ margin: 0, maxWidth: 560 }}>
      `VITE_API_BASE` is required in production. Add it in your Vercel project settings and redeploy.
    </p>
    <code style={{ background: "#111", color: "#fff", padding: "8px 10px", borderRadius: 8 }}>
      VITE_API_BASE=https://your-backend.onrender.com
    </code>
  </div>
);

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

const RequireAdmin = ({ children }) => {
  const token = localStorage.getItem("adminToken");
  return token ? children : <Navigate to="/admin-login" replace />;
};

const RequireRole = ({ role, children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    if (role === "seller") return <Navigate to="/login?role=seller" replace />;
    return <Navigate to="/login" replace />;
  }
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if ((user?.role || "buyer") !== role) {
      if (role === "seller") return <Navigate to="/login?role=seller" replace />;
      return <Navigate to="/" replace />;
    }
  } catch {
    if (role === "seller") return <Navigate to="/login?role=seller" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};

const Loader = () => (
  <div className="page-loader">
    <div className="loader-dot"></div>
    <div className="loader-dot"></div>
    <div className="loader-dot"></div>
  </div>
);

const RootEntry = ({ apiBase }) => {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (token && (user?.role || "buyer") === "seller") {
      return <Navigate to="/my-shop" replace />;
    }
  } catch {}
  return <Home apiBase={apiBase} />;
};

const Layout = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/dashboard");
  const isDashboardRoute = location.pathname.startsWith("/dashboard");
  const showLegacyAdminHeader = isAdminRoute && !location.pathname.startsWith("/dashboard");
  const isSellerDashboardRoute = location.pathname.startsWith("/my-shop");
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/admin-login";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-shell ${isAdminRoute ? "admin-shell" : ""} ${isAuthRoute ? "auth-shell" : ""}`}>
      {!isAuthRoute && !isSellerDashboardRoute && !isDashboardRoute && (showLegacyAdminHeader ? (
        <AdminHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      ) : (
        <Navbar apiBase={API_BASE} />
      ))}
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<RootEntry apiBase={API_BASE} />} />
          <Route path="/services" element={<Services apiBase={API_BASE} />} />
          <Route path="/posts" element={<Posts apiBase={API_BASE} />} />
          <Route path="/posts/:id" element={<PostDetails apiBase={API_BASE} />} />
          <Route
            path="/purchase"
            element={
              <RequireRole role="buyer">
                <Purchase apiBase={API_BASE} />
              </RequireRole>
            }
          />
          <Route
            path="/my-posts"
            element={
              <RequireAuth>
                <MyPosts apiBase={API_BASE} />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account apiBase={API_BASE} />
              </RequireAuth>
            }
          />
          <Route path="/contact" element={<Contact apiBase={API_BASE} />} />
          <Route path="/login" element={<Login apiBase={API_BASE} />} />
          <Route path="/signup" element={<Signup apiBase={API_BASE} />} />
          <Route path="/admin-login" element={<AdminAccess apiBase={API_BASE} />} />
          <Route
            path="/dashboard"
            element={
              <RequireAdmin>
                <AdminPanel apiBase={API_BASE} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              </RequireAdmin>
            }
          />
          <Route
            path="/post-service"
            element={
              <RequireRole role="seller">
                <PostService apiBase={API_BASE} />
              </RequireRole>
            }
          />
          <Route
            path="/start-selling"
            element={
              <RequireRole role="seller">
                <PostService apiBase={API_BASE} />
              </RequireRole>
            }
          />
          <Route
            path="/my-shop"
            element={
              <RequireRole role="seller">
                <MyShop apiBase={API_BASE} />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!isAdminRoute && !isAuthRoute && !isSellerDashboardRoute && <Footer apiBase={API_BASE} />}
    </div>
  );
};

const App = () => {
  if (import.meta.env.PROD && !rawApiBase) {
    console.error("Missing VITE_API_BASE in production build.");
    return <MissingApiBaseGuard />;
  }

  return (
    <Router>
      <Layout />
    </Router>
  );
};

export default App;

