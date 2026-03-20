import React, { Suspense, lazy, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AdminHeader from "./AdminHeader.jsx";
import "./App.css";

const Home = lazy(() => import("./Home.jsx"));
const News = lazy(() => import("./News.jsx"));
const NewsDetail = lazy(() => import("./NewsDetail.jsx"));
const Services = lazy(() => import("./Services.jsx"));
const Posts = lazy(() => import("./Posts.jsx"));
const PostDetails = lazy(() => import("./PostDetails.jsx"));
const MyPosts = lazy(() => import("./MyPosts.jsx"));
const Account = lazy(() => import("./Account.jsx"));
const Notifications = lazy(() => import("./Notifications.jsx"));
const NotificationsDetail = lazy(() => import("./NotificationsDetail.jsx"));
const Contact = lazy(() => import("./Contact.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Signup = lazy(() => import("./Signup.jsx"));
const AdminAccess = lazy(() => import("./AdminAccess.jsx"));
const AdminPanel = lazy(() => import("./AdminPanel.jsx"));
const PostService = lazy(() => import("./PostService.jsx"));

const API_BASE = import.meta.env.VITE_API_BASE || "https://puneclassifieds.onrender.com";

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

const RequireAdmin = ({ children }) => {
  const token = localStorage.getItem("adminToken");
  return token ? children : <Navigate to="/admin-login" replace />;
};

const Loader = () => (
  <div className="page-loader">
    <div className="loader-dot"></div>
    <div className="loader-dot"></div>
    <div className="loader-dot"></div>
  </div>
);

const Layout = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/dashboard");
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/admin-login";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-shell ${isAdminRoute ? "admin-shell" : ""} ${isAuthRoute ? "auth-shell" : ""}`}>
      {!isAuthRoute && (isAdminRoute ? (
        <AdminHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      ) : (
        <Navbar apiBase={API_BASE} />
      ))}
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Home apiBase={API_BASE} />} />
          <Route path="/news" element={<News apiBase={API_BASE} />} />
          <Route path="/news/:id" element={<NewsDetail apiBase={API_BASE} />} />
          <Route path="/services" element={<Services apiBase={API_BASE} />} />
          <Route path="/posts" element={<Posts apiBase={API_BASE} />} />
          <Route path="/posts/:id" element={<PostDetails apiBase={API_BASE} />} />
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
          <Route path="/notifications" element={<Notifications apiBase={API_BASE} />} />
          <Route path="/notifications/:id" element={<NotificationsDetail apiBase={API_BASE} />} />
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
              <RequireAuth>
                <PostService apiBase={API_BASE} />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!isAdminRoute && !isAuthRoute && <Footer apiBase={API_BASE} />}
    </div>
  );
};

const App = () => (
  <Router>
    <Layout />
  </Router>
);

export default App;


