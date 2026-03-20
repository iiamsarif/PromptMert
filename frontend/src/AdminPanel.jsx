import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { useNavigate } from "react-router-dom";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PAGE_SIZE = 10;

const AdminPanel = ({ apiBase, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const [pending, setPending] = useState({ jobs: [], properties: [], pets: [], posts: [] });
  const [approved, setApproved] = useState({ jobs: [], properties: [], pets: [], posts: [] });
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePages, setPurchasePages] = useState(1);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [trending, setTrending] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", types: [] });
  const [typeInput, setTypeInput] = useState("");
  const [settings, setSettings] = useState({
    heroImage: "",
    heroBg: "",
    contactEmail: "",
  });
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroVideoFile, setHeroVideoFile] = useState(null);
  const [status, setStatus] = useState("");
  const [active, setActive] = useState("dashboard");
  const [editPost, setEditPost] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    type: "",
    description: "",
    liveLink: "",
    price: "",
    imageUrl: "",
    videoUrl: "",
    posterUrl: "",
    zipFileUrl: "",
    status: "approved",
    userEmail: ""
  });
  const [editUploader, setEditUploader] = useState({ name: "", email: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editVideoFile, setEditVideoFile] = useState(null);
  const [editPosterFile, setEditPosterFile] = useState(null);
  const [editZipFile, setEditZipFile] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryForm, setEditCategoryForm] = useState({ name: "", description: "", types: [] });
  const [editTypeInput, setEditTypeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const token = localStorage.getItem("adminToken");
  const logoutAdmin = () => {
    localStorage.removeItem("adminToken");
    setAdminMenuOpen(false);
    navigate("/admin-login");
  };

  const pushToast = (message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  };

  const withLoading = async (fn, successMessage) => {
    try {
      setLoading(true);
      const result = await fn();
      if (successMessage) pushToast(successMessage);
      return result;
    } catch (err) {
      pushToast(err.message || "Action failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async (search = purchaseSearch, pageValue = purchasePage) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/purchases?search=${encodeURIComponent(search)}&page=${pageValue}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPurchases(Array.isArray(data.items) ? data.items : []);
      setPurchasePage(data.page || 1);
      setPurchasePages(data.pages || 1);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      const [p, a, u, s, c, tr] = await Promise.all([
        fetch(`${apiBase}/api/admin/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json()),
        fetch(`${apiBase}/api/admin/approved`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json()),
        fetch(`${apiBase}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json()),
        fetch(`${apiBase}/api/settings/web`).then((r) => r.json()),
        fetch(`${apiBase}/api/categories`).then((r) => r.json()),
        fetch(`${apiBase}/api/admin/trending`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json())
      ]);
      setPending(p);
      setApproved(a);
      setUsers(u);
      setCategories(c);
      setTrending(tr || []);
      setSettings({
        heroImage: s?.heroImage || "",
        heroBg: s?.heroBg || "",
        contactEmail: s?.contactEmail || "",
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    loadPurchases();
  }, [apiBase]);

  const approve = async (type, id) => {
    await withLoading(async () => {
      await fetch(`${apiBase}/api/${type}/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadData();
    }, "Approved successfully");
  };

  const remove = async (type, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    await withLoading(async () => {
      await fetch(`${apiBase}/api/${type}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadData();
    }, "Deleted successfully");
  };

  const removeUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    await withLoading(async () => {
      await fetch(`${apiBase}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadData();
    }, "User removed");
  };

  const addCategory = async (e) => {
    e.preventDefault();
    setStatus("");
    await withLoading(async () => {
      const res = await fetch(`${apiBase}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...categoryForm,
          types: categoryForm.types
        })
      });
      if (!res.ok) throw new Error("Failed to add category.");
      setCategoryForm({ name: "", description: "", types: [] });
      setTypeInput("");
      await loadData();
    }, "Category added");
  };

  const startEditCategory = (cat) => {
    setEditingCategory(cat._id);
    setEditCategoryForm({
      name: cat.name || "",
      description: cat.description || "",
      types: Array.isArray(cat.types) ? cat.types : []
    });
    setEditTypeInput("");
    setCategoryEditOpen(true);
  };

  const saveEditCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    await withLoading(async () => {
      const res = await fetch(`${apiBase}/api/categories/${editingCategory}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editCategoryForm,
          types: editCategoryForm.types
        })
      });
      if (!res.ok) throw new Error("Failed to update category.");
      setCategoryEditOpen(false);
      setEditingCategory(null);
      await loadData();
    }, "Category updated");
  };

  const addType = () => {
    const value = typeInput.trim();
    if (!value) return;
    setCategoryForm((prev) => ({
      ...prev,
      types: Array.from(new Set([...(prev.types || []), value]))
    }));
    setTypeInput("");
  };

  const removeType = (value) => {
    setCategoryForm((prev) => ({
      ...prev,
      types: (prev.types || []).filter((t) => t !== value)
    }));
  };

  const addEditType = () => {
    const value = editTypeInput.trim();
    if (!value) return;
    setEditCategoryForm((prev) => ({
      ...prev,
      types: Array.from(new Set([...(prev.types || []), value]))
    }));
    setEditTypeInput("");
  };

  const removeEditType = (value) => {
    setEditCategoryForm((prev) => ({
      ...prev,
      types: (prev.types || []).filter((t) => t !== value)
    }));
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    await withLoading(async () => {
      await fetch(`${apiBase}/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadData();
    }, "Category deleted");
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    await withLoading(async () => {
      const formData = new FormData();
      formData.append("contactEmail", settings.contactEmail || "");
      if (heroImageFile) formData.append("heroImage", heroImageFile);
      if (heroVideoFile) formData.append("heroVideo", heroVideoFile);
      const res = await fetch(`${apiBase}/api/settings/web`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update settings.");
      setHeroImageFile(null);
      setHeroVideoFile(null);
      await loadData();
    }, "Settings updated");
  };

  const handleHeroVideo = (file) => {
    setHeroVideoFile(file || null);
  };

  const handleHeroImage = (file) => {
    setHeroImageFile(file || null);
  };

  const handleEditImage = (file) => {
    setEditImageFile(file || null);
  };
  const isEditVideoCategory = useMemo(
    () => /video/i.test(String(editForm.category || "")),
    [editForm.category]
  );

  const startEdit = async (post) => {
    setEditPost(post._id);
    try {
      const res = await fetch(`${apiBase}/api/admin/posts/${post._id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEditForm({
        title: data.post.title,
        category: data.post.category,
        type: data.post.type || "",
        description: data.post.description,
        liveLink: data.post.liveLink || "",
        price: data.post.price || "",
        imageUrl: data.post.imageUrl || "",
        videoUrl: data.post.videoUrl || "",
        posterUrl: data.post.posterUrl || data.post.imageUrl || "",
        zipFileUrl: data.post.zipFileUrl || "",
        status: data.post.status || "approved",
        userEmail: data.post.userEmail || data.post.sellerEmail || data.user?.email || ""
      });
      setEditUploader({
        name: data.user?.name || data.post.sellerShopName || "Unknown",
        email: data.user?.email || data.post.userEmail || data.post.sellerEmail || ""
      });
      setEditImageFile(null);
      setEditVideoFile(null);
      setEditPosterFile(null);
      setEditZipFile(null);
      setEditOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await withLoading(async () => {
      const formData = new FormData();
      formData.append("title", editForm.title || "");
      formData.append("category", editForm.category || "");
      formData.append("type", editForm.type || "");
      formData.append("description", editForm.description || "");
      formData.append("liveLink", editForm.liveLink || "");
      formData.append("price", editForm.price || "");
      formData.append("imageUrl", editForm.imageUrl || "");
      formData.append("videoUrl", editForm.videoUrl || "");
      formData.append("posterUrl", editForm.posterUrl || "");
      formData.append("zipFileUrl", editForm.zipFileUrl || "");
      formData.append("status", editForm.status || "approved");
      formData.append("userEmail", editForm.userEmail || "");
      formData.append("existingImages", JSON.stringify([isEditVideoCategory ? editForm.posterUrl : editForm.imageUrl].filter(Boolean)));
      if (editImageFile) formData.append("images", editImageFile);
      if (editVideoFile) formData.append("videos", editVideoFile);
      if (editPosterFile) formData.append("poster", editPosterFile);
      if (editZipFile) formData.append("zipFile", editZipFile);
      const res = await fetch(`${apiBase}/api/admin/posts/${editPost}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) throw new Error("Failed to save changes.");
      setEditPost(null);
      setEditOpen(false);
      setEditImageFile(null);
      setEditVideoFile(null);
      setEditPosterFile(null);
      setEditZipFile(null);
      await loadData();
    }, "Product updated");
  };

  const renderItems = (items, type, pendingView) => (
    <div className="grid">
      {items.map((item) => (
        <div key={item._id} className="card">
          <h4>{item.jobTitle || item.propertyTitle || item.petName || item.title}</h4>
                  <p>{item.description || item.breed || item.category}</p>
          <div className="action-row">
            {pendingView && (
              <button className="primary-btn" onClick={() => approve(type, item._id)}>
                Approve
              </button>
            )}
            {!pendingView && type === "posts" && (
              <button className="ghost-btn" onClick={() => startEdit(item)}>
                Edit
              </button>
            )}
            <button className="ghost-btn" onClick={() => remove(type, item._id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const paginate = (items, page) => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  const renderPager = (items, page, setPage) => {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1);
    return (
      <div className="pagination">
        {pages.map((num) => (
          <button
            key={num}
            className={`page-btn ${page === num ? "active" : ""}`}
            onClick={() => setPage(num)}
          >
            {num}
          </button>
        ))}
        {totalPages > 4 && (
          <button className="page-btn" onClick={() => setPage(page + 1)}>Next</button>
        )}
      </div>
    );
  };

  const allPostsCount = approved.posts.length + pending.posts.length;
  const allUsersCount = users.length;
  const categoryCounts = categories.map((cat) => ({
    ...cat,
    count: approved.posts.filter((p) => p.category === cat.name).length
  }));
  const chartSource = trending.length ? trending : categoryCounts;

  const pendingPageItems = useMemo(() => paginate(pending.posts, pendingPage), [pending.posts, pendingPage]);
  const approvedPageItems = useMemo(() => paginate(approved.posts, approvedPage), [approved.posts, approvedPage]);
  const usersPageItems = useMemo(() => paginate(users, usersPage), [users, usersPage]);
  const categoriesPageItems = useMemo(() => paginate(categories, categoriesPage), [categories, categoriesPage]);

  useEffect(() => {
    if (!chartRef.current || active !== "dashboard") return;
    const labels = chartSource.map((c) => c.name || c.category);
    const data = chartSource.map((c) => c.count || 0);
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    chartInstance.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Searches",
            data,
            backgroundColor: "rgba(27, 43, 58, 0.7)",
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }, [active, chartSource]);

  return (
    <main className="admin-page material-admin">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loader-dot"></div>
            <div className="loader-dot"></div>
            <div className="loader-dot"></div>
          </div>
        </div>
      )}
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((toast) => (
            <div key={toast.id} className="toast">{toast.message}</div>
          ))}
        </div>
      )}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <h2>CREATIVE TIM</h2>
        <button className={`nav-item ${active === "dashboard" ? "active" : ""}`} onClick={() => { setActive("dashboard"); setSidebarOpen(false); }}>
          <span className="nav-icon">🏠</span> Dashboard
        </button>
        <button className={`nav-item ${active === "pending" ? "active" : ""}`} onClick={() => { setActive("pending"); setSidebarOpen(false); }}>
          <span className="nav-icon">🧾</span> Pending Products
        </button>
        <button className={`nav-item ${active === "approved" ? "active" : ""}`} onClick={() => { setActive("approved"); setSidebarOpen(false); }}>
          <span className="nav-icon">✅</span> Approved Products
        </button>
        <button className={`nav-item ${active === "users" ? "active" : ""}`} onClick={() => { setActive("users"); setSidebarOpen(false); }}>
          <span className="nav-icon">🧑‍💼</span> Control Users
        </button>
        <button className={`nav-item ${active === "categories" ? "active" : ""}`} onClick={() => { setActive("categories"); setSidebarOpen(false); }}>
          <span className="nav-icon">🗂️</span> Categories
        </button>
        <button className={`nav-item ${active === "settings" ? "active" : ""}`} onClick={() => { setActive("settings"); setSidebarOpen(false); }}>
          <span className="nav-icon">🛠️</span> Settings
        </button>
        <button className={`nav-item ${active === "purchases" ? "active" : ""}`} onClick={() => { setActive("purchases"); setSidebarOpen(false); loadPurchases(); }}>
          <span className="nav-icon">💳</span> Purchases
        </button>
      </aside>

      <section className="admin-content">
        <div className="admin-material-topbar">
          <div className="nav-title">Material Dashboard</div>
          <div className="nav-actions">
            <button type="button" className="mobile-side-toggle" onClick={() => setSidebarOpen((v) => !v)}>
              ☰
            </button>
            <div className="admin-user-wrap">
              <button type="button" className="admin-user-btn" onClick={() => setAdminMenuOpen((v) => !v)}>
                👤
              </button>
              {adminMenuOpen && (
                <div className="admin-user-menu">
                  <p><strong>Administrator</strong></p>
                  <p>Role: admin</p>
                  <button type="button" className="primary-btn" onClick={logoutAdmin}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {active === "dashboard" && (
          <div className="admin-topbar dashboard-hero">
            <div>
              <h1>Admin Dashboard</h1>
              <p>System insights, activity performance, and category trends.</p>
            </div>
          </div>
        )}
        {status && <p className="success">{status}</p>}

        {active === "dashboard" && (
          <section className="dashboard-grid">
            <div className="dash-card">
              <h3>All Users</h3>
              <div className="bar-row">
                <span>{allUsersCount}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min(allUsersCount * 10, 100)}%` }}></div>
                </div>
              </div>
            </div>
            <div className="dash-card">
              <h3>All Products</h3>
              <div className="bar-row">
                <span>{allPostsCount}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill accent"
                    style={{ width: `${Math.min(allPostsCount * 8, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="dash-card">
              <h3>Trending Categories</h3>
              <canvas ref={chartRef} height="180"></canvas>
            </div>
          </section>
        )}

        {active === "pending" && (
          <section className="section">
            <div className="section-head">
              <h2>Pending Products</h2>
            </div>
            <h3 className="subhead">Marketplace Products</h3>
            {renderItems(pendingPageItems, "posts", true)}
            {renderPager(pending.posts, pendingPage, setPendingPage)}
          </section>
        )}

        {active === "approved" && (
          <section className="section">
            <div className="section-head">
              <h2>Approved Products</h2>
            </div>
            <h3 className="subhead">Marketplace Products</h3>
            {renderItems(approvedPageItems, "posts", false)}
            {renderPager(approved.posts, approvedPage, setApprovedPage)}
          </section>
        )}

        {editOpen && (
          <div className="modal-overlay" onClick={() => setEditOpen(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Edit Approved Product</h3>
                <button className="ghost-btn" onClick={() => setEditOpen(false)}>Close</button>
              </div>
              <p className="muted">Uploaded by: {editUploader.name} ({editUploader.email})</p>
              <form className="form-card" onSubmit={saveEdit}>
                <input
                  type="text"
                  placeholder="Title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Type"
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  required
                />
                <textarea
                  rows="3"
                  placeholder="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  required
                />
                <input
                  type="url"
                  placeholder="Live Link"
                  value={editForm.liveLink}
                  onChange={(e) => setEditForm({ ...editForm, liveLink: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Posted By (Email)"
                  value={editForm.userEmail}
                  onChange={(e) => setEditForm({ ...editForm, userEmail: e.target.value })}
                  readOnly
                />
                {!isEditVideoCategory && (
                  <>
                    <input type="text" placeholder="Image URL" value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} />
                    <div className="detail-actions">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleEditImage(e.target.files[0])}
                      />
                      <button type="button" className="ghost-btn" onClick={() => setEditForm({ ...editForm, imageUrl: "" })}>Remove Image</button>
                    </div>
                  </>
                )}
                {isEditVideoCategory && (
                  <>
                    <input type="text" placeholder="Video URL" value={editForm.videoUrl || ""} onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })} />
                    <div className="detail-actions">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setEditVideoFile(e.target.files?.[0] || null)}
                      />
                      <button type="button" className="ghost-btn" onClick={() => setEditForm({ ...editForm, videoUrl: "" })}>Remove Video</button>
                    </div>
                    <input type="text" placeholder="Poster URL" value={editForm.posterUrl || ""} onChange={(e) => setEditForm({ ...editForm, posterUrl: e.target.value })} />
                    <div className="detail-actions">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditPosterFile(e.target.files?.[0] || null)}
                      />
                      <button type="button" className="ghost-btn" onClick={() => setEditForm({ ...editForm, posterUrl: "" })}>Remove Poster</button>
                    </div>
                  </>
                )}
                <input type="text" placeholder="ZIP File URL" value={editForm.zipFileUrl} onChange={(e) => setEditForm({ ...editForm, zipFileUrl: e.target.value })} />
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(e) => setEditZipFile(e.target.files?.[0] || null)}
                />
                {!isEditVideoCategory && editForm.imageUrl && (
                  <img className="preview-image" src={editForm.imageUrl} alt="Preview" />
                )}
                {isEditVideoCategory && editForm.posterUrl && (
                  <img className="preview-image" src={editForm.posterUrl} alt="Poster Preview" />
                )}
                <button className="primary-btn" type="submit">Save Changes</button>
              </form>
            </div>
          </div>
        )}

        {active === "users" && (
          <section className="section">
            <div className="section-head">
              <h2>Control Users</h2>
            </div>
            <div className="grid">
              {usersPageItems.map((user) => (
                <div key={user._id} className="card">
                  <h4>{user.name}</h4>
                  <p>{user.email}</p>
                  <p className="muted">Role: {(user.role || "buyer").toString().replace(/^./, (c) => c.toUpperCase())}</p>
                  <div className="action-row">
                    <button className="ghost-btn" onClick={() => removeUser(user._id)}>
                      Remove User
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {renderPager(users, usersPage, setUsersPage)}
          </section>
        )}

        {active === "categories" && (
          <section className="section">
            <div className="section-head">
              <h2>Category Manager</h2>
              <button className="primary-btn" onClick={() => setCategoryOpen(true)}>Add Category</button>
            </div>
            <div className="grid">
              {categoriesPageItems.map((cat) => (
                <div key={cat._id} className="card">
                  <h4>{cat.name}</h4>
                  <p>{cat.description || ""}</p>
                  <div className="action-row">
                    <button className="ghost-btn" onClick={() => startEditCategory(cat)}>Edit</button>
                    <button className="ghost-btn" onClick={() => deleteCategory(cat._id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {renderPager(categories, categoriesPage, setCategoriesPage)}
          </section>
        )}

        {categoryOpen && (
          <div className="modal-overlay" onClick={() => setCategoryOpen(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Add Category</h3>
                <button className="ghost-btn" onClick={() => setCategoryOpen(false)}>Close</button>
              </div>
              <form className="form-card" onSubmit={(e) => { addCategory(e); setCategoryOpen(false); }}>
                <input
                  type="text"
                  placeholder="Category Name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                />
                <textarea
                  rows="3"
                  placeholder="Description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
                <div className="type-row">
                  <input
                    type="text"
                    placeholder="Add Type"
                    value={typeInput}
                    onChange={(e) => setTypeInput(e.target.value)}
                  />
                  <button className="ghost-btn" type="button" onClick={addType}>Add</button>
                </div>
                <div className="type-list">
                  {(categoryForm.types || []).map((t) => (
                    <span key={t} className="type-chip">
                      {t}
                      <button type="button" onClick={() => removeType(t)}>×</button>
                    </span>
                  ))}
                </div>
                <button className="primary-btn" type="submit">Add Category</button>
              </form>
            </div>
          </div>
        )}

        {categoryEditOpen && (
          <div className="modal-overlay" onClick={() => setCategoryEditOpen(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Edit Category</h3>
                <button className="ghost-btn" onClick={() => setCategoryEditOpen(false)}>Close</button>
              </div>
              <form className="form-card" onSubmit={saveEditCategory}>
                <input
                  type="text"
                  placeholder="Category Name"
                  value={editCategoryForm.name}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                  required
                />
                <textarea
                  rows="3"
                  placeholder="Description"
                  value={editCategoryForm.description}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, description: e.target.value })}
                />
                <div className="type-row">
                  <input
                    type="text"
                    placeholder="Add Type"
                    value={editTypeInput}
                    onChange={(e) => setEditTypeInput(e.target.value)}
                  />
                  <button className="ghost-btn" type="button" onClick={addEditType}>Add</button>
                </div>
                <div className="type-list">
                  {(editCategoryForm.types || []).map((t) => (
                    <span key={t} className="type-chip">
                      {t}
                      <button type="button" onClick={() => removeEditType(t)}>×</button>
                    </span>
                  ))}
                </div>
                <button className="primary-btn" type="submit">Save Changes</button>
              </form>
            </div>
          </div>
        )}

        {active === "settings" && (
          <section className="section form-section">
            <div className="section-head">
              <h2>Settings</h2>
            </div>
            <form className="form-card" onSubmit={saveSettings}>
              <label className="field-label">Hero Background Video (Upload)</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleHeroVideo(e.target.files[0])}
              />
              {settings.heroBg && <small className="muted">Current video: {settings.heroBg}</small>}
              <label className="field-label">Hero Foreground Image (Upload)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleHeroImage(e.target.files[0])}
              />
              {settings.heroImage && <small className="muted">Current image: {settings.heroImage}</small>}
              <input
                type="email"
                placeholder="Contact Email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              />
              <button className="primary-btn" type="submit">Save Settings</button>
            </form>
          </section>
        )}

        {active === "purchases" && (
          <section className="section">
            <div className="section-head">
              <h2>Purchase Management</h2>
            </div>
            <div className="type-row">
              <input
                type="text"
                placeholder="Search by buyer email or product title"
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
              />
              <button className="primary-btn" onClick={() => loadPurchases(purchaseSearch, 1)}>Search</button>
            </div>
            <div className="grid">
              {purchases.map((item) => (
                <div key={item._id} className="card">
                  <h4>{item.productTitle}</h4>
                  <p>{item.userName} ({item.userEmail})</p>
                  <p className="muted">Amount: ₹{item.amount}</p>
                  <p className="muted">Order ID: {item.orderId}</p>
                  <p className="muted">Payment ID: {item.paymentId}</p>
                  <p className="muted">Date: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</p>
                </div>
              ))}
            </div>
            {purchasePages > 1 && (
              <div className="pagination">
                {Array.from({ length: Math.min(4, purchasePages) }, (_, idx) => idx + 1).map((num) => (
                  <button key={num} className={`page-btn ${purchasePage === num ? "active" : ""}`} onClick={() => loadPurchases(purchaseSearch, num)}>
                    {num}
                  </button>
                ))}
                {purchasePage < purchasePages && (
                  <button className="page-btn" onClick={() => loadPurchases(purchaseSearch, purchasePage + 1)}>Next</button>
                )}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
};

export default AdminPanel;
