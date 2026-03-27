import React from "react";
import { Navigate } from "react-router-dom";
import SellerDashboardPage from "./SellerDashboardPage.jsx";

const SellerPostsPage = ({ apiBase }) => {
  let role = "buyer";
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    role = user?.role || "buyer";
  } catch {
    role = "buyer";
  }
  if (role !== "seller") {
    return <Navigate to="/" replace />;
  }
  return <SellerDashboardPage apiBase={apiBase} />;
};

export default SellerPostsPage;
