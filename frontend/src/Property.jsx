import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

const fallbackImage = "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80";

const Property = ({ apiBase }) => {
  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${apiBase}/api/properties?status=approved`)
      .then((r) => r.json())
      .then(setProperties)
      .catch(console.error);
  }, [apiBase]);

  const filtered = useMemo(() => {
    if (!query.trim()) return properties;
    const q = query.toLowerCase();
    return properties.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [properties, query]);

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Property Listings</h1>
        <p>Premium properties curated by the community.</p>
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search sale/rent, price..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <NavLink to="/post-property" className="primary-btn">Post Property</NavLink>
        </div>
      </section>
      <section className="grid">
        {filtered.map((item) => (
          <div key={item._id} className="card media-card">
            <img src={item.photos || fallbackImage} alt={item.propertyTitle} loading="lazy" />
            <div>
              <span className="badge">{item.saleType}</span>
              <h4>{item.propertyTitle}</h4>
              <strong>{item.price}</strong>
              <div className="contact-row">
                <span>{item.contactNumber}</span>
                <a className="ghost-btn" href={`https://wa.me/${item.whatsapp}`}>WhatsApp</a>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};

export default Property;


