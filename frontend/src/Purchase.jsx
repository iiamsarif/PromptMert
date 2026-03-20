import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Purchase = ({ apiBase }) => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = async (nextPage = page) => {
    const res = await fetch(`${apiBase}/api/purchases/my?page=${nextPage}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setItems(Array.isArray(data.items) ? data.items : []);
    setPage(data.page || 1);
    setPages(data.pages || 1);
  };

  useEffect(() => {
    load(page).catch(() => {});
  }, [page]);

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Purchase History</h1>
        <p>All your bought products are available here forever.</p>
      </section>
      <section className="grid">
        {items.length === 0 && <article className="card"><p>No purchases yet.</p></article>}
        {items.map((item) => (
          <article key={item._id} className="card">
            <h3>{item.productTitle}</h3>
            <p className="muted">Amount: ₹{item.amount}</p>
            <p className="muted">Order ID: {item.orderId}</p>
            <p className="muted">Payment ID: {item.paymentId}</p>
            <p className="muted">Date: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</p>
            <button className="primary-btn" onClick={() => navigate(`/posts/${item.productId}`)}>View Product</button>
          </article>
        ))}
      </section>
      {pages > 1 && (
        <div className="pagination">
          {Array.from({ length: Math.min(4, pages) }, (_, i) => i + 1).map((num) => (
            <button key={num} className={`page-btn ${page === num ? "active" : ""}`} onClick={() => setPage(num)}>{num}</button>
          ))}
          {page < pages && <button className="page-btn" onClick={() => setPage(page + 1)}>Next</button>}
        </div>
      )}
    </main>
  );
};

export default Purchase;
