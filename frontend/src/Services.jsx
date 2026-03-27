import React, { useEffect, useState } from "react";

const Services = ({ apiBase }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/api/categories`);
        const data = await res.json();
        if (mounted) setCategories(data);
      } catch (err) {
        console.error(err);
      }
    };
    const handleFocus = () => load();
    load();
    const interval = setInterval(load, 20000);
    window.addEventListener("focus", handleFocus);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [apiBase]);

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Explore Categories</h1>
        <p>Browse digital product categories curated for creators and project teams.</p>
      </section>
      <section className="grid">
        {categories.map((cat) => (
          <div key={cat._id} className="card category-card">
            {cat.iconUrl && (
              <img
                className="category-icon"
                src={cat.iconUrl}
                alt={cat.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <h4>{cat.name}</h4>
            <p>{cat.description || "Explore premium creator products in this category."}</p>
            <a className="ghost-btn" href={`/posts?category=${encodeURIComponent(cat.name)}`}>View Products</a>
          </div>
        ))}
      </section>
    </main>
  );
};

export default Services;
