import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "./logo.png";

const Navbar = ({ apiBase }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const role = user?.role || "buyer";
  const isSeller = role === "seller";
  const isBuyer = role === "buyer";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncUser = () => {
      try {
        const next = localStorage.getItem("user");
        setUser(next ? JSON.parse(next) : {});
      } catch {
        setUser({});
      }
    };
    window.addEventListener("storage", syncUser);
    window.addEventListener("user-updated", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, []);

  useEffect(() => {
    if (!token || !apiBase) return;
    fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.email) {
          localStorage.setItem("user", JSON.stringify(data));
          setUser(data);
          window.dispatchEvent(new Event("user-updated"));
        }
      })
      .catch(() => {});
  }, [apiBase, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("user-updated"));
    navigate("/login");
  };

  const categoryActive = useMemo(
    () => location.pathname.startsWith("/posts") || location.pathname.startsWith("/services"),
    [location.pathname]
  );
  const purchaseActive = useMemo(() => location.pathname.startsWith("/purchase"), [location.pathname]);

  const goStartSelling = () => {
    setOpen(false);
    if (!token) {
      navigate("/login?role=seller");
      return;
    }
    if (isSeller) {
      navigate("/my-shop");
      return;
    }
    navigate("/login?role=seller");
  };

  const accountPath = isBuyer ? "/account" : "/my-shop";
  const cartPath = isBuyer ? "/purchase" : "/my-shop";

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-inner">
        <NavLink to="/" className="logo" onClick={() => setOpen(false)}>
          <img className="logo-mark" src={logo} alt="PromptMert" />
          <span className="logo-text">PromptMert</span>
        </NavLink>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          <NavLink to="/" onClick={() => setOpen(false)}>Home</NavLink>
          {isBuyer && (
            <NavLink to="/purchase" className={purchaseActive ? "active" : undefined} onClick={() => setOpen(false)}>
              Purchase
            </NavLink>
          )}
          <NavLink to="/posts" className={categoryActive ? "active" : undefined} onClick={() => setOpen(false)}>
            Categories
          </NavLink>
          {isSeller && (
            <NavLink to="/my-shop" onClick={() => setOpen(false)}>
              My Shop
            </NavLink>
          )}
          <NavLink to="/contact" onClick={() => setOpen(false)}>Contact</NavLink>
          {token && (
            <button className="nav-link-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          )}
        </nav>

        <div className="nav-actions">
          <button type="button" className="nav-cta" onClick={goStartSelling}>
            Start Selling
          </button>
          {!token && (
            <NavLink to="/login" className="nav-cta" onClick={() => setOpen(false)}>
              Login
            </NavLink>
          )}
          {token && (
            <>
              <NavLink to={cartPath} className="nav-icon-btn" aria-label="Cart" onClick={() => setOpen(false)}>
                <span className="nav-icon">🛒</span>
              </NavLink>
              <NavLink to={accountPath} className="nav-icon-btn" aria-label="Settings" onClick={() => setOpen(false)}>
                <span className="nav-icon">⚙</span>
              </NavLink>
              <NavLink to={accountPath} className="profile-btn" aria-label="Profile" onClick={() => setOpen(false)}>
                <span className="profile-avatar">
                  {(user?.name || "U").slice(0, 1).toUpperCase()}
                </span>
              </NavLink>
            </>
          )}
          <button
            className={`hamburger ${open ? "active" : ""}`}
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
