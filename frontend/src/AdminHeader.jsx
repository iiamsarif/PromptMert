import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "./logo.png";

const AdminHeader = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin-login");
  };

  return (
    <header className="admin-header">
      <div className="admin-header-inner">
        <NavLink to="/dashboard" className="admin-brand">
          <img
            className="admin-mark"
            src={logo}
            alt="PromptMert"
          />
          <span className="admin-brand-text">PromptMert</span>
        </NavLink>
        <div className="admin-header-actions">
          <button className="ghost-btn admin-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            Menu
          </button>
          <button className="ghost-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;



