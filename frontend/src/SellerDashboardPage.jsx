import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "./logo.png";

const MAX_SELL_IMAGES = 3;
const SELLER_PAGE_SIZE = 10;
const SELLER_TOP_PRODUCTS_PAGE_SIZE = 10;

const SellerDashboardPage = ({ apiBase }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState({ totalProducts: 0, totalSalesCount: 0, totalOrders: 0, totalEarnings: 0, topProducts: [], recentOrders: [] });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    type: "",
    liveLink: "",
    price: "",
    imageUrl: "",
    videoUrl: "",
    posterUrl: "",
    zipFileUrl: ""
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editVideoFile, setEditVideoFile] = useState(null);
  const [editPosterFile, setEditPosterFile] = useState(null);
  const [addStatus, setAddStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [sellForm, setSellForm] = useState({
    title: "",
    description: "",
    category: "",
    type: "",
    liveLink: "",
    price: "",
    imageUrl: "",
    videoUrl: "",
    posterUrl: ""
  });
  const [sellImageFiles, setSellImageFiles] = useState([]);
  const [sellVideoFile, setSellVideoFile] = useState(null);
  const [sellPosterFile, setSellPosterFile] = useState(null);
  const [sellZipFile, setSellZipFile] = useState(null);
  const [settleMessage, setSettleMessage] = useState("");
  const [sellImagePreviewUrls, setSellImagePreviewUrls] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [productsPage, setProductsPage] = useState(1);
  const [productsPages, setProductsPages] = useState(1);
  const [orders, setOrders] = useState([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPages, setOrdersPages] = useState(1);
  const [topProducts, setTopProducts] = useState([]);
  const [topProductsPage, setTopProductsPage] = useState(1);
  const [topProductsPages, setTopProductsPages] = useState(1);

  const load = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [statsRes, productsRes, categoryRes, ordersRes, topProductsRes] = await Promise.all([
      fetch(`${apiBase}/api/seller/stats`, { headers }),
      fetch(`${apiBase}/api/seller/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&type=${encodeURIComponent(type)}&page=${productsPage}&limit=${SELLER_PAGE_SIZE}`, { headers }),
      fetch(`${apiBase}/api/categories`),
      fetch(`${apiBase}/api/seller/orders?search=${encodeURIComponent(orderSearch)}&page=${ordersPage}&limit=${SELLER_PAGE_SIZE}`, { headers }),
      fetch(`${apiBase}/api/seller/top-products?page=${topProductsPage}&limit=${SELLER_TOP_PRODUCTS_PAGE_SIZE}`, { headers })
    ]);
    const statsData = await statsRes.json();
    const productsData = await productsRes.json();
    const categoryData = await categoryRes.json();
    const ordersData = await ordersRes.json();
    const topProductsData = await topProductsRes.json();
    setStats(statsData || {});
    setProducts(Array.isArray(productsData.items) ? productsData.items : []);
    setProductsPages(Math.max(1, Number(productsData.pages || 1)));
    setCategories(Array.isArray(categoryData) ? categoryData : []);
    setOrders(Array.isArray(ordersData.items) ? ordersData.items : []);
    setOrdersPages(Math.max(1, Number(ordersData.pages || 1)));
    setTopProducts(Array.isArray(topProductsData.items) ? topProductsData.items : []);
    setTopProductsPages(Math.max(1, Number(topProductsData.pages || 1)));
    if (productsPage > Math.max(1, Number(productsData.pages || 1))) {
      setProductsPage(Math.max(1, Number(productsData.pages || 1)));
    }
    if (ordersPage > Math.max(1, Number(ordersData.pages || 1))) {
      setOrdersPage(Math.max(1, Number(ordersData.pages || 1)));
    }
    if (topProductsPage > Math.max(1, Number(topProductsData.pages || 1))) {
      setTopProductsPage(Math.max(1, Number(topProductsData.pages || 1)));
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [search, category, type, productsPage, orderSearch, ordersPage, topProductsPage]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.name && item.name.toLowerCase() === category.toLowerCase()),
    [categories, category]
  );
  const categoryTypes = useMemo(() => {
    if (!category) return [];
    return Array.isArray(selectedCategory?.types) ? selectedCategory.types : [];
  }, [category, selectedCategory]);
  const selectedSellCategory = useMemo(
    () => categories.find((item) => item.name && item.name.toLowerCase() === sellForm.category.toLowerCase()),
    [categories, sellForm.category]
  );
  const sellTypes = useMemo(
    () => (Array.isArray(selectedSellCategory?.types) ? selectedSellCategory.types : []),
    [selectedSellCategory]
  );
  const isVideoSell = useMemo(() => /video/i.test(String(sellForm.category || "")), [sellForm.category]);
  const isVideoEdit = useMemo(() => /video/i.test(String(editForm.category || "")), [editForm.category]);
  const getPageNumbers = (currentPage, totalPages) => {
    const visible = Math.min(4, totalPages);
    let start = Math.max(1, currentPage - Math.floor(visible / 2));
    let end = start + visible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - visible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  };
  const productsPageNumbers = useMemo(
    () => getPageNumbers(productsPage, productsPages),
    [productsPage, productsPages]
  );
  const ordersPageNumbers = useMemo(
    () => getPageNumbers(ordersPage, ordersPages),
    [ordersPage, ordersPages]
  );
  const topProductsPageNumbers = useMemo(
    () => getPageNumbers(topProductsPage, topProductsPages),
    [topProductsPage, topProductsPages]
  );

  useEffect(() => {
    const nextUrls = sellImageFiles.map((file) => URL.createObjectURL(file));
    setSellImagePreviewUrls(nextUrls);
    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [sellImageFiles]);

  const startEdit = (item) => {
    setEditing(item._id);
    setEditForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "",
      type: item.type || "",
      liveLink: item.liveLink || "",
      price: item.price || "",
      imageUrl: item.imageUrl || "",
      videoUrl: item.videoUrl || "",
      posterUrl: item.posterUrl || item.imageUrl || "",
      zipFileUrl: item.zipFileUrl || ""
    });
    setEditImageFile(null);
    setEditVideoFile(null);
    setEditPosterFile(null);
    setTab("products");
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData();
    Object.entries(editForm).forEach(([key, value]) => fd.append(key, value ?? ""));
    const isVideo = /video/i.test(String(editForm.category || ""));
    fd.append("existingImages", JSON.stringify([isVideo ? editForm.posterUrl : editForm.imageUrl].filter(Boolean)));
    if (editImageFile) fd.append("images", editImageFile);
    if (editVideoFile) fd.append("videos", editVideoFile);
    if (editPosterFile) fd.append("poster", editPosterFile);
    const res = await fetch(`${apiBase}/api/products/${editing}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    if (res.ok) {
      setEditing(null);
      await load();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("user-updated"));
    navigate("/login?role=seller");
  };

  const addProduct = async (e) => {
    e.preventDefault();
    setAddStatus("");
    setAdding(true);
    try {
      const fd = new FormData();
      fd.append("title", sellForm.title);
      fd.append("description", sellForm.description);
      fd.append("category", sellForm.category);
      fd.append("type", sellForm.type);
      fd.append("liveLink", sellForm.liveLink);
      fd.append("price", sellForm.price);
      fd.append("imageUrl", sellForm.imageUrl);
      fd.append("videoUrl", sellForm.videoUrl || "");
      fd.append("posterUrl", sellForm.posterUrl || "");
      sellImageFiles.forEach((file) => fd.append("images", file));
      if (sellVideoFile) fd.append("videos", sellVideoFile);
      if (sellPosterFile) fd.append("poster", sellPosterFile);
      if (sellZipFile) fd.append("zipFile", sellZipFile);
      const res = await fetch(`${apiBase}/api/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit product");
      setAddStatus("Product submitted successfully.");
      setSellForm({
        title: "",
        description: "",
        category: "",
        type: "",
        liveLink: "",
        price: "",
        imageUrl: "",
        videoUrl: "",
        posterUrl: ""
      });
      setSellImageFiles([]);
      setSellVideoFile(null);
      setSellPosterFile(null);
      setSellZipFile(null);
      await load();
    } catch (err) {
      setAddStatus(err.message || "Failed to submit product");
    } finally {
      setAdding(false);
    }
  };

  const addSellImages = (files = []) => {
    if (!files.length) return;
    setSellImageFiles((prev) => {
      const merged = [...prev];
      files.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        const exists = merged.some((item) => `${item.name}-${item.size}-${item.lastModified}` === key);
        if (!exists) merged.push(file);
      });
      return merged.slice(0, MAX_SELL_IMAGES);
    });
    if (files.length + sellImageFiles.length > MAX_SELL_IMAGES) {
      setAddStatus(`Only ${MAX_SELL_IMAGES} images are allowed.`);
    }
  };

  const removeSellImage = (index) => {
    setSellImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <main className="page myshop-page">
      <header className="myshop-brand-header">
        <Link to="/" className="logo myshop-brand-link">
          <img className="logo-mark" src={logo} alt="PromptMert" />
          <span className="logo-text">PromptMert</span>
        </Link>
        <div className="myshop-header-actions">
          <button
            type="button"
            className="myshop-menu-toggle"
            aria-label="Toggle seller menu"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            ☰
          </button>
        </div>
      </header>
      <button
        type="button"
        className={`myshop-backdrop ${sidebarOpen ? "show" : ""}`}
        aria-label="Close menu"
        onClick={() => setSidebarOpen(false)}
      />
      <section className="myshop-wrap">
        <aside className={`myshop-sidebar ${sidebarOpen ? "open" : ""}`}>
          <h2>Seller Panel</h2>
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => { setTab("dashboard"); setSidebarOpen(false); }}>Dashboard</button>
          <button className={tab === "products" ? "active" : ""} onClick={() => { setTab("products"); setSidebarOpen(false); }}>My Products</button>
          <button className={tab === "add-product" ? "active" : ""} onClick={() => { setTab("add-product"); setSidebarOpen(false); }}>Add Product</button>
          <button className={tab === "orders" ? "active" : ""} onClick={() => { setTab("orders"); setSidebarOpen(false); }}>Orders / Sales</button>
          <button className={tab === "earnings" ? "active" : ""} onClick={() => { setTab("earnings"); setSidebarOpen(false); }}>Earnings</button>
          <button className={tab === "settings" ? "active" : ""} onClick={() => { setTab("settings"); setSidebarOpen(false); }}>Settings</button>
        </aside>

        <section className="myshop-content">
          {tab === "dashboard" && (
            <>
              <h1>My Shop Dashboard</h1>
              <div className="myshop-cards">
                <article className="card"><h3>Total Products</h3><strong>{stats.totalProducts || 0}</strong></article>
                <article className="card"><h3>Total Sales Count</h3><strong>{stats.totalSalesCount || 0}</strong></article>
                <article className="card"><h3>Total Orders</h3><strong>{stats.totalOrders || 0}</strong></article>
                <article className="card"><h3>Total Earnings</h3><strong>₹{Number(stats.totalEarnings || 0).toFixed(2)}</strong></article>
              </div>
              <div className="myshop-graph card">
                <h3>Most Sold Products</h3>
                {topProducts.length > 0 ? (
                  <>
                    {topProducts.map((item) => (
                      <div key={item.title} className="graph-row">
                        <span>{item.title}</span>
                        <div className="graph-bar"><i style={{ width: `${Math.min(100, (item.salesCount || 0) * 10)}%` }} /></div>
                        <strong>{item.salesCount || 0}</strong>
                      </div>
                    ))}
                    {topProductsPages > 1 && (
                      <div className="pagination">
                        {topProductsPageNumbers.map((num) => (
                          <button
                            key={`seller-top-products-page-${num}`}
                            className={`page-btn ${topProductsPage === num ? "active" : ""}`}
                            onClick={() => setTopProductsPage(num)}
                          >
                            {num}
                          </button>
                        ))}
                        {topProductsPage < topProductsPages && (
                          <button className="page-btn" onClick={() => setTopProductsPage(topProductsPage + 1)}>Next</button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="muted">No sold products yet.</p>
                )}
              </div>
            </>
          )}

          {tab === "products" && (
            <>
              <h1>My Products</h1>
              <div className="seller-filters">
                <input value={search} onChange={(e) => { setSearch(e.target.value); setProductsPage(1); }} placeholder="Search products..." />
                <select value={category} onChange={(e) => { setCategory(e.target.value); setType(""); setProductsPage(1); }}>
                  <option value="">All Categories</option>
                  {categories.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
                </select>
                <select value={type} onChange={(e) => { setType(e.target.value); setProductsPage(1); }}>
                  <option value="">All Types</option>
                  {categoryTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="grid">
                {products.map((item) => (
                  <article key={item._id} className="card">
                    <h4>{item.title}</h4>
                    <p className="muted">{item.category} / {item.type}</p>
                    <p className="muted">Sales Count: {item.salesCount || 0}</p>
                    <button className="ghost-btn myshop-edit-btn" onClick={() => startEdit(item)}>Edit</button>
                  </article>
                ))}
              </div>
              {productsPages > 1 && (
                <div className="pagination">
                  {productsPageNumbers.map((num) => (
                    <button
                      key={`seller-products-page-${num}`}
                      className={`page-btn ${productsPage === num ? "active" : ""}`}
                      onClick={() => setProductsPage(num)}
                    >
                      {num}
                    </button>
                  ))}
                  {productsPage < productsPages && (
                    <button className="page-btn" onClick={() => setProductsPage(productsPage + 1)}>Next</button>
                  )}
                </div>
              )}

              {editing && (
                <form className="form-card seller-edit-form" onSubmit={saveEdit}>
                  <h3>Edit Product</h3>
                  <input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" required />
                  <textarea rows="3" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" required />
                  <input value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))} placeholder="Category" required />
                  <input value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))} placeholder="Type" required />
                  <input value={editForm.liveLink} onChange={(e) => setEditForm((p) => ({ ...p, liveLink: e.target.value }))} placeholder="Live Link" />
                  <input type="number" min="1" value={editForm.price} onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} placeholder="Price" required />
                  {!isVideoEdit && (
                    <>
                      <input value={editForm.imageUrl} onChange={(e) => setEditForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="Image URL" />
                      <div className="detail-actions">
                        <input type="file" accept="image/*" onChange={(e) => setEditImageFile(e.target.files?.[0] || null)} />
                        <button type="button" className="ghost-btn" onClick={() => setEditForm((p) => ({ ...p, imageUrl: "" }))}>Remove Image</button>
                      </div>
                    </>
                  )}
                  {isVideoEdit && (
                    <>
                      <input value={editForm.videoUrl} onChange={(e) => setEditForm((p) => ({ ...p, videoUrl: e.target.value }))} placeholder="Video URL" />
                      <div className="detail-actions">
                        <input type="file" accept="video/*" onChange={(e) => setEditVideoFile(e.target.files?.[0] || null)} />
                        <button type="button" className="ghost-btn" onClick={() => setEditForm((p) => ({ ...p, videoUrl: "" }))}>Remove Video</button>
                      </div>
                      <input value={editForm.posterUrl} onChange={(e) => setEditForm((p) => ({ ...p, posterUrl: e.target.value }))} placeholder="Poster URL" />
                      <div className="detail-actions">
                        <input type="file" accept="image/*" onChange={(e) => setEditPosterFile(e.target.files?.[0] || null)} />
                        <button type="button" className="ghost-btn" onClick={() => setEditForm((p) => ({ ...p, posterUrl: "" }))}>Remove Poster</button>
                      </div>
                    </>
                  )}
                  <input value={editForm.zipFileUrl} onChange={(e) => setEditForm((p) => ({ ...p, zipFileUrl: e.target.value }))} placeholder="ZIP URL" />
                  <button className="primary-btn" type="submit">Save Product</button>
                </form>
              )}
            </>
          )}

          {tab === "add-product" && (
            <>
              <h1>Start Selling</h1>
              <p>Upload your product for approval and marketplace listing.</p>
              <form className="form-card seller-edit-form" onSubmit={addProduct}>
                <input value={sellForm.title} onChange={(e) => setSellForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" required />
                <textarea rows="4" value={sellForm.description} onChange={(e) => setSellForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" required />
                <select value={sellForm.category} onChange={(e) => setSellForm((prev) => ({ ...prev, category: e.target.value, type: "" }))} required>
                  <option value="">Select Category</option>
                  {categories.map((item) => (
                    <option key={item._id} value={item.name}>{item.name}</option>
                  ))}
                </select>
                <select value={sellForm.type} onChange={(e) => setSellForm((prev) => ({ ...prev, type: e.target.value }))} required>
                  <option value="">Select Type</option>
                  {sellTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <input value={sellForm.liveLink} onChange={(e) => setSellForm((prev) => ({ ...prev, liveLink: e.target.value }))} placeholder="Live Link (optional)" />
                <input type="number" min="1" step="0.01" value={sellForm.price} onChange={(e) => setSellForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="Price" required />
                {!isVideoSell && (
                  <>
                    <input value={sellForm.imageUrl} onChange={(e) => setSellForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="Image URL (optional fallback)" />
                    <label className="field-label">Upload Product Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        addSellImages(Array.from(e.target.files || []));
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="seller-image-preview-grid">
                      {sellImagePreviewUrls.map((url, index) => (
                        <article key={`${url}-${index}`} className="seller-image-preview-card">
                          <img src={url} alt={`Selected ${index + 1}`} loading="lazy" />
                          <button type="button" className="ghost-btn" onClick={() => removeSellImage(index)}>Remove</button>
                        </article>
                      ))}
                      {!sellImagePreviewUrls.length && sellForm.imageUrl && (
                        <article className="seller-image-preview-card">
                          <img
                            src={sellForm.imageUrl}
                            alt="Image URL preview"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </article>
                      )}
                    </div>
                    <div className="seller-image-preview-actions">
                      <small className="muted">{sellImageFiles.length} image(s) selected</small>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => setSellImageFiles([])}
                        disabled={!sellImageFiles.length}
                      >
                        Clear Images
                      </button>
                    </div>
                  </>
                )}
                {isVideoSell && (
                  <>
                    <input value={sellForm.videoUrl} onChange={(e) => setSellForm((prev) => ({ ...prev, videoUrl: e.target.value }))} placeholder="Video URL (optional fallback)" />
                    <label className="field-label">Upload Product Video</label>
                    <input type="file" accept="video/*" onChange={(e) => setSellVideoFile(e.target.files?.[0] || null)} />
                    <input value={sellForm.posterUrl} onChange={(e) => setSellForm((prev) => ({ ...prev, posterUrl: e.target.value }))} placeholder="Poster URL (optional fallback)" />
                    <label className="field-label">Upload Poster Image</label>
                    <input type="file" accept="image/*" onChange={(e) => setSellPosterFile(e.target.files?.[0] || null)} />
                  </>
                )}
                <label className="field-label">Upload ZIP Product File</label>
                <input type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={(e) => setSellZipFile(e.target.files?.[0] || null)} required />
                <button className="primary-btn" type="submit" disabled={adding}>
                  {adding ? "Submitting..." : "Submit Product"}
                </button>
                {addStatus && <p className={addStatus.toLowerCase().includes("success") ? "success" : "error"}>{addStatus}</p>}
              </form>
            </>
          )}

          {tab === "orders" && (
            <div className="card myshop-mini-card myshop-orders-card">
              <h3>Orders and Sales</h3>
              <p>Total orders: <strong>{stats.totalOrders || 0}</strong></p>
              <input
                className="myshop-order-search"
                type="search"
                value={orderSearch}
                onChange={(e) => {
                  setOrderSearch(e.target.value);
                  setOrdersPage(1);
                }}
                placeholder="Search by buyer email or product ID"
                aria-label="Search orders by buyer email or product ID"
              />
              {orders.length > 0 ? (
                <div className="myshop-order-list">
                  {orders.map((order) => (
                    <article key={order.purchaseId || `${order.orderId}-${order.paymentId}`} className="myshop-order-item">
                      <p><strong>Product ID:</strong> {order.productId || "-"}</p>
                      <p><strong>Buyer Email:</strong> {order.buyerEmail || "-"}</p>
                      <p><strong>Payment ID:</strong> {order.paymentId || order.orderId || "-"}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">{orderSearch.trim() ? "No matching orders found." : "No orders yet."}</p>
              )}
              {ordersPages > 1 && (
                <div className="pagination">
                  {ordersPageNumbers.map((num) => (
                    <button
                      key={`seller-orders-page-${num}`}
                      className={`page-btn ${ordersPage === num ? "active" : ""}`}
                      onClick={() => setOrdersPage(num)}
                    >
                      {num}
                    </button>
                  ))}
                  {ordersPage < ordersPages && (
                    <button className="page-btn" onClick={() => setOrdersPage(ordersPage + 1)}>Next</button>
                  )}
                </div>
              )}
            </div>
          )}
          {tab === "earnings" && (
            <div className="card myshop-mini-card">
              <h3>Earnings</h3>
              <p>Total Revenue: <strong>₹{Number(stats.totalEarnings || 0).toFixed(2)}</strong></p>
              <p>Total Orders: <strong>{stats.totalOrders || 0}</strong></p>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSettleMessage("It will take 7 days, please kindly wait.")}
              >
                Settle Now
              </button>
              {settleMessage && <p className="success">{settleMessage}</p>}
            </div>
          )}
          {tab === "settings" && (
            <div className="card myshop-mini-card">
              <h3>Settings</h3>
              <p>Seller information</p>
              <div className="myshop-seller-info">
                <p><strong>Name:</strong> {storedUser.name || "Seller"}</p>
                <p><strong>Email:</strong> {storedUser.email || "-"}</p>
                <p><strong>Shop Name:</strong> {storedUser.shopName || "-"}</p>
                <p><strong>Role:</strong> {storedUser.role || "seller"}</p>
              </div>
              <button className="primary-btn settings-logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default SellerDashboardPage;
