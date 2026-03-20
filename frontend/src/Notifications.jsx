import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

const PAGE_SIZE = 10;

const Notifications = ({ apiBase }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [banner, setBanner] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/notifications`).then((r) => r.json()),
      fetch(`${apiBase}/api/settings/web`).then((r) => r.json())
    ])
      .then(([itemsData, settings]) => {
        setItems(Array.isArray(itemsData) ? itemsData : []);
        setBanner(settings?.banner4 || "");
      })
      .catch(console.error);
  }, [apiBase]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) =>
      [item.title, item.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [items, query]);

  useEffect(() => {
    setPage(1);
  }, [filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1);
  }, [totalPages]);

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Government Notifications</h1>
        <p>Verified notices and public updates from civic authorities.</p>
      </section>

      {banner && (
        <section className="section banner-section">
          <div className="container">
            <div className="mid-banner">
              <img className="banner-image" src={banner} alt="Notifications banner" loading="lazy" />
            </div>
          </div>
        </section>
      )}

      <section className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search notifications by title or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      <section className="grid">
        {pageItems.map((item) => (
          <NavLink key={item._id} to={`/notifications/${item._id}`} className="card">
            <span className="badge">{item.category}</span>
            <h4>{item.title}</h4>
            <p className="muted">{item.notificationDate}</p>
          </NavLink>
        ))}
      </section>

      {totalPages > 1 && (
        <div className="pagination">
          {pageNumbers.map((num) => (
            <button
              key={num}
              className={`page-btn ${page === num ? "active" : ""}`}
              onClick={() => setPage(num)}
            >
              {num}
            </button>
          ))}
          {totalPages > 4 && (
            <button className="page-btn" onClick={() => setPage(Math.min(page + 1, totalPages))}>
              Next
            </button>
          )}
        </div>
      )}
    </main>
  );
};

export default Notifications;


