import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

const fallbackImage = "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80";

const Pets = ({ apiBase }) => {
  const [pets, setPets] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${apiBase}/api/pets?status=approved`)
      .then((r) => r.json())
      .then(setPets)
      .catch(console.error);
  }, [apiBase]);

  const filtered = useMemo(() => {
    if (!query.trim()) return pets;
    const q = query.toLowerCase();
    return pets.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [pets, query]);

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Pet Adoption</h1>
        <p>Give pets a loving home through verified adoption listings.</p>
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search breed, age, or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <NavLink to="/post-pet" className="primary-btn">Post Pet</NavLink>
        </div>
      </section>
      <section className="grid">
        {filtered.map((item) => (
          <div key={item._id} className="card media-card">
            <img src={item.photos || fallbackImage} alt={item.petName} loading="lazy" />
            <div>
              <span className="badge">{item.breed}</span>
              <h4>{item.petName}</h4>
              <p>{item.age} · {item.gender}</p>
                            <div className="contact-row">
                <span>{item.contactPerson}</span>
                <a className="ghost-btn" href={`https://wa.me/${item.phone}`}>WhatsApp</a>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};

export default Pets;



