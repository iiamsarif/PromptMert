import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

const fallbackImage = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80";
const PAGE_SIZE = 10;

const News = ({ apiBase }) => {
  const [news, setNews] = useState([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [banner, setBanner] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/news`).then((r) => r.json()),
      fetch(`${apiBase}/api/settings/web`).then((r) => r.json())
    ])
      .then(([newsData, settings]) => {
        setNews(Array.isArray(newsData) ? newsData : []);
        setBanner(settings?.banner2 || "");
      })
      .catch(console.error);
  }, [apiBase]);

  const filtered = useMemo(() => {
    if (!query.trim()) return news;
    const q = query.toLowerCase();
    return news.filter((item) =>
      [item.title, item.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [news, query]);

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
        <h1>News & Updates</h1>
        <p>Curated local updates and important announcements.</p>
      </section>

      {banner && (
        <section className="section banner-section">
          <div className="container">
            <div className="mid-banner">
              <img className="banner-image" src={banner} alt="News banner" loading="lazy" />
            </div>
          </div>
        </section>
      )}

      <section className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search news by title or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      <section className="grid">
        {pageItems.map((item) => (
          <NavLink key={item._id} to={`/news/${item._id}`} className="card media-card">
            <img src={item.imageData || item.image || fallbackImage} alt={item.title} loading="lazy" />
            <div>
              <span className="badge">{item.category}</span>
              <h4>{item.title}</h4>
              <p className="muted">{item.date}</p>
            </div>
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

export default News;


