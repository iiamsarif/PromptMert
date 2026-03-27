import React, { Suspense, lazy, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AdminHeader from "./AdminHeader.jsx";
import "./App.css";

const HomePage = lazy(() => import("./HomePage.jsx"));
const Services = lazy(() => import("./Services.jsx"));
const MarketplacePage = lazy(() => import("./MarketplacePage.jsx"));
const ProductDetailsPage = lazy(() => import("./ProductDetailsPage.jsx"));
const SellerPostsPage = lazy(() => import("./SellerPostsPage.jsx"));
const Account = lazy(() => import("./Account.jsx"));
const Contact = lazy(() => import("./Contact.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Signup = lazy(() => import("./Signup.jsx"));
const AdminLoginPage = lazy(() => import("./AdminLoginPage.jsx"));
const AdminDashboardPage = lazy(() => import("./AdminDashboardPage.jsx"));
const SellerProductUploadPage = lazy(() => import("./SellerProductUploadPage.jsx"));
const PurchaseHistoryPage = lazy(() => import("./PurchaseHistoryPage.jsx"));
const SellerDashboardPage = lazy(() => import("./SellerDashboardPage.jsx"));
const LivePreview = lazy(() => import("./LivePreview.jsx"));

const rawApiBase = (import.meta.env.VITE_API_BASE || "http://localhost:5000").trim();
const API_BASE = rawApiBase || (import.meta.env.DEV ? "http://localhost:5000" : "");

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
  return <HomePage apiBase={apiBase} />;
};

const Layout = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/dashboard");
  const isDashboardRoute = location.pathname.startsWith("/dashboard");
  const showLegacyAdminHeader = isAdminRoute && !location.pathname.startsWith("/dashboard");
  const isSellerDashboardRoute = location.pathname.startsWith("/my-shop");
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/admin-login";
  const isLivePreviewRoute = location.pathname.startsWith("/live-preview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-shell ${isAdminRoute ? "admin-shell" : ""} ${isAuthRoute ? "auth-shell" : ""}`}>
      {!isAuthRoute && !isSellerDashboardRoute && !isDashboardRoute && !isLivePreviewRoute && (showLegacyAdminHeader ? (
        <AdminHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      ) : (
        <Navbar apiBase={API_BASE} />
      ))}
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<RootEntry apiBase={API_BASE} />} />
          <Route path="/services" element={<Services apiBase={API_BASE} />} />
          <Route path="/posts" element={<MarketplacePage apiBase={API_BASE} />} />
          <Route path="/posts/:id" element={<ProductDetailsPage apiBase={API_BASE} />} />
          <Route path="/live-preview" element={<LivePreview />} />
          <Route
            path="/purchase"
            element={
              <RequireRole role="buyer">
                <PurchaseHistoryPage apiBase={API_BASE} />
              </RequireRole>
            }
          />
          <Route
            path="/my-posts"
            element={
              <RequireAuth>
                <SellerPostsPage apiBase={API_BASE} />
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
          <Route path="/admin-login" element={<AdminLoginPage apiBase={API_BASE} />} />
          <Route
            path="/dashboard"
            element={
              <RequireAdmin>
                <AdminDashboardPage apiBase={API_BASE} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              </RequireAdmin>
            }
          />
          <Route
            path="/post-service"
            element={
              <RequireRole role="seller">
                <SellerProductUploadPage apiBase={API_BASE} />
              </RequireRole>
            }
          />
          <Route
            path="/start-selling"
            element={
              <RequireRole role="seller">
                <SellerProductUploadPage apiBase={API_BASE} />
              </RequireRole>
            }
          />
          <Route
            path="/my-shop"
            element={
              <RequireRole role="seller">
                <SellerDashboardPage apiBase={API_BASE} />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!isAdminRoute && !isAuthRoute && !isSellerDashboardRoute && !isLivePreviewRoute && <Footer apiBase={API_BASE} />}
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
