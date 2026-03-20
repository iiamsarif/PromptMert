import React, { useEffect, useState } from "react";

const Account = ({ apiBase }) => {
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [userRes, purchasesRes] = await Promise.all([
          fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBase}/api/purchases/my?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const userData = await userRes.json();
        const purchasesData = await purchasesRes.json();
        if (!mounted) return;
        setUser(userData);
        setPurchases(Array.isArray(purchasesData.items) ? purchasesData.items : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [apiBase, token]);

  const totalPages = Math.max(1, Math.ceil(purchases.length / perPage));
  const startIndex = (page - 1) * perPage;
  const visibleItems = purchases.slice(startIndex, startIndex + perPage);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return (
      <main className="page">
        <div className="page-loader">
          <div className="loader-dot"></div>
          <div className="loader-dot"></div>
          <div className="loader-dot"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Account</h1>
        <p>Manage your profile and purchased products.</p>
      </section>

      <section className="account-grid">
        <div className="card account-card">
          <h3>Profile</h3>
          <p className="muted">Name</p>
          <p>{user?.name || "—"}</p>
          <p className="muted">Email</p>
          <p>{user?.email || "—"}</p>
          <p className="muted">Role</p>
          <p>{user?.role || "buyer"}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="section-label">TRANSACTIONS</div>
            <h2>Purchase Transactions</h2>
          </div>
        </div>
        <div className="grid">
          {visibleItems.length === 0 && (
            <div className="card">
              <p>No purchase transactions yet.</p>
            </div>
          )}
          {visibleItems.map((item) => (
            <div key={item._id} className="card">
              <h4>{item.productTitle || "Product"}</h4>
              <p className="muted">Amount: ₹{item.amount}</p>
              <p className="muted">Payment ID: {item.paymentId || "—"}</p>
              <p className="muted">Order ID: {item.orderId || "—"}</p>
              <p className="muted">Status: {item.paymentStatus || "paid"}</p>
              <p className="muted">Date: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</p>
            </div>
          ))}
        </div>

        {purchases.length > perPage && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, idx) => (
              <button
                key={`purchase-page-${idx + 1}`}
                className={`page-btn ${page === idx + 1 ? "active" : ""}`}
                onClick={() => setPage(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}
            {page < totalPages && (
              <button className="page-btn" onClick={() => setPage(page + 1)}>
                Next
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default Account;
