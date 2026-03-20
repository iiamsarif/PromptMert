import React from "react";
import { Navigate } from "react-router-dom";
import MyShop from "./MyShop.jsx";

const MyPosts = ({ apiBase }) => {
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
  return <MyShop apiBase={apiBase} />;
};

export default MyPosts;
