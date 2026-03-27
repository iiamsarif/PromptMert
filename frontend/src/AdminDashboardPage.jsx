import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { useNavigate } from "react-router-dom";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PAGE_SIZE = 10;
const MAX_EDIT_IMAGES = 3;
const foregroundKeys = ["foreBg1", "foreBg2", "foreBg3", "foreBg4", "foreBg5"];

const SidebarNavIcon = ({ type }) => {
  const iconMap = {
    dashboard: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M10 21v-6h4v6" />
      </>
    ),
    pending: (
      <>
        <path d="M8 3h8l4 4v14H4V3h4Z" />
        <path d="M16 3v4h4" />
        <path d="M8 11h8M8 15h8" />
      </>
    ),
    approved: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12 2.2 2.2 4.8-4.8" />
      </>
    ),
    users: (
      <>
        <path d="M16.5 21v-1.6a3.6 3.6 0 0 0-3.6-3.6H7.6A3.6 3.6 0 0 0 4 19.4V21" />
        <circle cx="10.3" cy="8.4" r="3.4" />
        <path d="M16.8 10.5 18 11.7l2.2-2.2" />
      </>
    ),
    categories: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        <path d="M8 12h8" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="2.5" />
        <path d="m19.4 15 1.1 1.9-2 3.5-2.2-.2a7.7 7.7 0 0 1-1.5.8L13.7 23h-3.4l-1.1-2a7.7 7.7 0 0 1-1.5-.8l-2.2.2-2-3.5 1.1-1.9a8.7 8.7 0 0 1 0-2l-1.1-1.9 2-3.5 2.2.2a7.7 7.7 0 0 1 1.5-.8l1.1-2h3.4l1.1 2a7.7 7.7 0 0 1 1.5.8l2.2-.2 2 3.5-1.1 1.9a8.7 8.7 0 0 1 0 2Z" />
      </>
    ),
    purchases: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </>
    )
  };

  return (
    <span className="nav-icon nav-icon-svg" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {iconMap[type] || iconMap.dashboard}
      </svg>
    </span>
  );
};

const buildTrendSeries = (count, seed = 1) => {
  const base = Math.max(3, Number(count) || 0);
  return Array.from({ length: 8 }, (_, idx) => {
    const wave = (((idx + seed) % 4) - 1.5) * 0.12;
    const growth = 0.45 + idx * 0.11;
    return Math.max(1, Math.round(base * (growth + wave)));
  });
};

const Sparkline = ({ values = [], idPrefix }) => {
  const width = 220;
  const height = 88;
  const padding = 8;
  const safe = Array.isArray(values) && values.length ? values : [1, 2, 3, 4, 5, 6, 7, 8];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const spread = Math.max(1, max - min);
  const stepX = (width - padding * 2) / Math.max(1, safe.length - 1);
  const baseline = height - padding;
  const points = safe.map((value, index) => {
    const x = padding + index * stepX;
    const normalized = (value - min) / spread;
    const y = baseline - normalized * (height - padding * 2 - 8);
    return { x, y };
  });
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M ${points[0].x} ${baseline} L ${linePoints.replace(/,/g, " ")} L ${points[points.length - 1].x} ${baseline} Z`;

  return (
    <svg className="kpi-line-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${idPrefix}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.38)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.03)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${idPrefix}-grad)`} />
      <polyline className="kpi-line-path" points={linePoints} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.6" className="kpi-line-dot" />
    </svg>
  );
};

const AdminDashboardPage = ({ apiBase, sidebarOpen, setSidebarOpen }) => {
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
    heroBg: "",
    contactEmail: "",
    foreBg1: "",
    foreBg2: "",
    foreBg3: "",
    foreBg4: "",
    foreBg5: "",
  });
  const [heroVideoFile, setHeroVideoFile] = useState(null);
  const [foregroundFiles, setForegroundFiles] = useState({
    foreBg1: null,
    foreBg2: null,
    foreBg3: null,
    foreBg4: null,
    foreBg5: null
  });
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
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPostData, setViewPostData] = useState(null);
  const [viewUploader, setViewUploader] = useState({ name: "", email: "" });
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [editImagePreviewUrls, setEditImagePreviewUrls] = useState([]);
  const [editExistingImageUrls, setEditExistingImageUrls] = useState([]);
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
  const [metricsTrend, setMetricsTrend] = useState({ days: [], users: [], products: [] });

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
      const [p, a, u, s, c, tr, metrics] = await Promise.all([
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
        }).then((r) => r.json()),
        fetch(`${apiBase}/api/admin/metrics/trends?days=8`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then((r) => (r.ok ? r.json() : { days: [], users: [], products: [] }))
          .catch(() => ({ days: [], users: [], products: [] }))
      ]);
      setPending(p);
      setApproved(a);
      setUsers(u);
      setCategories(c);
      setTrending(tr || []);
      setMetricsTrend({
        days: Array.isArray(metrics?.days) ? metrics.days : [],
        users: Array.isArray(metrics?.users) ? metrics.users : [],
        products: Array.isArray(metrics?.products) ? metrics.products : []
      });
      setSettings({
        heroBg: s?.heroBg || "",
        contactEmail: s?.contactEmail || "",
        foreBg1: s?.foreBg1 || "",
        foreBg2: s?.foreBg2 || "",
        foreBg3: s?.foreBg3 || "",
        foreBg4: s?.foreBg4 || "",
        foreBg5: s?.foreBg5 || "",
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
      formData.append("heroBg", settings.heroBg || "");
      if (heroVideoFile) formData.append("heroVideo", heroVideoFile);
      foregroundKeys.forEach((key) => {
        formData.append(key, settings[key] || "");
        if (foregroundFiles[key]) {
          formData.append(key, foregroundFiles[key]);
        }
      });
      const res = await fetch(`${apiBase}/api/settings/web`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update settings.");
      setHeroVideoFile(null);
      setForegroundFiles({
        foreBg1: null,
        foreBg2: null,
        foreBg3: null,
        foreBg4: null,
        foreBg5: null
      });
      await loadData();
    }, "Settings updated");
  };

  const handleHeroVideo = (file) => {
    setHeroVideoFile(file || null);
  };

  const handleForegroundImage = (key, file) => {
    setForegroundFiles((prev) => ({ ...prev, [key]: file || null }));
  };

  const isEditVideoCategory = useMemo(
    () => /video/i.test(String(editForm.category || "")),
    [editForm.category]
  );

  useEffect(() => {
    const nextUrls = editImageFiles.map((file) => URL.createObjectURL(file));
    setEditImagePreviewUrls(nextUrls);
    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [editImageFiles]);

  const addEditImages = (files = []) => {
    if (!files.length) return;
    const maxNewAllowed = Math.max(0, MAX_EDIT_IMAGES - editExistingImageUrls.length);
    if (maxNewAllowed <= 0) {
      pushToast(`Only ${MAX_EDIT_IMAGES} images are allowed.`);
      return;
    }
    setEditImageFiles((prev) => {
      const merged = [...prev];
      files.forEach((file) => {
        if (merged.length >= maxNewAllowed) return;
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        const exists = merged.some((item) => `${item.name}-${item.size}-${item.lastModified}` === key);
        if (!exists) merged.push(file);
      });
      return merged;
    });
    if (files.length + editImageFiles.length > maxNewAllowed) {
      pushToast(`Only ${MAX_EDIT_IMAGES} images are allowed.`);
    }
  };

  const removeEditImageFile = (index) => {
    setEditImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingEditImage = (index) => {
    setEditExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const startEdit = async (post) => {
    setEditPost(post._id);
    try {
      const res = await fetch(`${apiBase}/api/admin/posts/${post._id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const existingImages = Array.isArray(data.post.imageUrls) && data.post.imageUrls.length
        ? data.post.imageUrls.filter(Boolean)
        : [data.post.imageUrl].filter(Boolean);
      setEditForm({
        title: data.post.title,
        category: data.post.category,
        type: data.post.type || "",
        description: data.post.description,
        liveLink: data.post.liveLink || "",
        price: data.post.price || "",
        imageUrl: data.post.imageUrl || existingImages[0] || "",
        videoUrl: data.post.videoUrl || "",
        posterUrl: data.post.posterUrl || data.post.imageUrl || "",
        zipFileUrl: data.post.zipFileUrl || "",
        status: data.post.status || "approved",
        userEmail: data.post.userEmail || data.post.sellerEmail || data.user?.email || ""
      });
      setEditExistingImageUrls(existingImages);
      setEditUploader({
        name: data.user?.name || data.post.sellerShopName || "Unknown",
        email: data.user?.email || data.post.userEmail || data.post.sellerEmail || ""
      });
      setEditImageFiles([]);
      setEditVideoFile(null);
      setEditPosterFile(null);
      setEditZipFile(null);
      setEditOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const startView = async (post) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/posts/${post._id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load post details.");
      setViewPostData(data.post || null);
      setViewUploader({
        name: data.user?.name || data.post?.sellerShopName || "Unknown",
        email: data.user?.email || data.post?.userEmail || data.post?.sellerEmail || ""
      });
      setViewOpen(true);
    } catch (err) {
      pushToast(err.message || "Failed to load post details.");
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
      const existingImagesPayload = isEditVideoCategory
        ? [editForm.posterUrl].filter(Boolean)
        : [...editExistingImageUrls];
      if (!isEditVideoCategory && !existingImagesPayload.length && String(editForm.imageUrl || "").trim()) {
        existingImagesPayload.push(String(editForm.imageUrl).trim());
      }
      formData.append("existingImages", JSON.stringify(existingImagesPayload));
      editImageFiles.forEach((file) => formData.append("images", file));
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
      setEditImageFiles([]);
      setEditExistingImageUrls([]);
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
          {type !== "posts" && <p>{item.description || item.breed || item.category}</p>}
          <div className="action-row">
            {pendingView && type === "posts" && (
              <button className="ghost-btn" onClick={() => startView(item)}>
                View
              </button>
            )}
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

  const renderPager = (items, page, setPage) => {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (totalPages <= 1) return null;
    const pages = getPageNumbers(page, totalPages);
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
        {page < totalPages && (
          <button className="page-btn" onClick={() => setPage(page + 1)}>Next</button>
        )}
      </div>
    );
  };

  const allPostsCount = approved.posts.length + pending.posts.length;
  const allUsersCount = users.length;
  const usersTrend = useMemo(
    () => (metricsTrend.users.length ? metricsTrend.users : buildTrendSeries(allUsersCount, 1)),
    [metricsTrend.users, allUsersCount]
  );
  const postsTrend = useMemo(
    () => (metricsTrend.products.length ? metricsTrend.products : buildTrendSeries(allPostsCount, 2)),
    [metricsTrend.products, allPostsCount]
  );
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
    const totalPages = Math.max(1, Math.ceil((pending.posts || []).length / PAGE_SIZE));
    if (pendingPage > totalPages) setPendingPage(totalPages);
  }, [pending.posts, pendingPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((approved.posts || []).length / PAGE_SIZE));
    if (approvedPage > totalPages) setApprovedPage(totalPages);
  }, [approved.posts, approvedPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
    if (usersPage > totalPages) setUsersPage(totalPages);
  }, [users, usersPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
    if (categoriesPage > totalPages) setCategoriesPage(totalPages);
  }, [categories, categoriesPage]);

  useEffect(() => {
    if (!chartRef.current || active !== "dashboard") return;
    const labels = chartSource.map((c) => c.name || c.category);
    const data = chartSource.map((c) => c.count || 0);
    const fillPalette = [
      "rgba(59, 130, 246, 0.85)",
      "rgba(16, 185, 129, 0.85)",
      "rgba(249, 115, 22, 0.85)",
      "rgba(168, 85, 247, 0.85)",
      "rgba(236, 72, 153, 0.85)",
      "rgba(14, 165, 233, 0.85)",
      "rgba(245, 158, 11, 0.85)",
      "rgba(34, 197, 94, 0.85)"
    ];
    const strokePalette = [
      "rgba(37, 99, 235, 1)",
      "rgba(5, 150, 105, 1)",
      "rgba(234, 88, 12, 1)",
      "rgba(147, 51, 234, 1)",
      "rgba(219, 39, 119, 1)",
      "rgba(2, 132, 199, 1)",
      "rgba(217, 119, 6, 1)",
      "rgba(22, 163, 74, 1)"
    ];
    const barFillColors = data.map((_, idx) => fillPalette[idx % fillPalette.length]);
    const barStrokeColors = data.map((_, idx) => strokePalette[idx % strokePalette.length]);
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
            backgroundColor: barFillColors,
            borderColor: barStrokeColors,
            borderWidth: 1,
            borderRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#ffffff" }
          },
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
        <h2>PROMPTMERT</h2>
        <button className={`nav-item ${active === "dashboard" ? "active" : ""}`} onClick={() => { setActive("dashboard"); setSidebarOpen(false); }}>
          <SidebarNavIcon type="dashboard" /> Dashboard
        </button>
        <button className={`nav-item ${active === "pending" ? "active" : ""}`} onClick={() => { setActive("pending"); setSidebarOpen(false); }}>
          <SidebarNavIcon type="pending" /> Pending Products
        </button>
        <button className={`nav-item ${active === "approved" ? "active" : ""}`} onClick={() => { setActive("approved"); setSidebarOpen(false); }}>
          <SidebarNavIcon type="approved" /> Approved Products
        </button>
        <button className={`nav-item ${active === "users" ? "active" : ""}`} onClick={() => { setActive("users"); setSidebarOpen(false); }}>
          <SidebarNavIcon type="users" /> Control Users
        </button>
        <button className={`nav-item ${active === "categories" ? "active" : ""}`} onClick={() => { setActive("categories"); setSidebarOpen(false); }}>
          <SidebarNavIcon type="categories" /> Categories
        </button>
        <button className={`nav-item ${active === "settings" ? "active" : ""}`} onClick={() => { setActive("settings"); setSidebarOpen(false); }}>
          <SidebarNavIcon type="settings" /> Settings
        </button>
        <button className={`nav-item ${active === "purchases" ? "active" : ""}`} onClick={() => { setActive("purchases"); setSidebarOpen(false); loadPurchases(); }}>
          <SidebarNavIcon type="purchases" /> Purchases
        </button>
      </aside>

      <section className="admin-content">
        <div className="admin-material-topbar">
          <div className="nav-title">Material Dashboard</div>
          <div className="nav-actions">
            <button type="button" className="mobile-side-toggle" onClick={() => setSidebarOpen((v) => !v)}>
              <span className="admin-inline-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </span>
            </button>
            <div className="admin-user-wrap">
              <button type="button" className="admin-user-btn" onClick={() => setAdminMenuOpen((v) => !v)}>
                <span className="admin-inline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="3.2" />
                    <path d="M5 19c1.7-3.4 4-5 7-5s5.3 1.6 7 5" />
                  </svg>
                </span>
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
            <div className="dash-card kpi-line-card">
              <h3>All Users</h3>
              <div className="kpi-value">{allUsersCount}</div>
              <Sparkline values={usersTrend} idPrefix="users-kpi" />
            </div>
            <div className="dash-card kpi-line-card">
              <h3>All Products</h3>
              <div className="kpi-value">{allPostsCount}</div>
              <Sparkline values={postsTrend} idPrefix="products-kpi" />
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
                        multiple
                        onChange={(e) => {
                          addEditImages(Array.from(e.target.files || []));
                          e.currentTarget.value = "";
                        }}
                      />
                      <button type="button" className="ghost-btn" onClick={() => setEditForm({ ...editForm, imageUrl: "" })}>Remove URL</button>
                    </div>
                    <div className="seller-image-preview-grid">
                      {editExistingImageUrls.map((url, index) => (
                        <article key={`${url}-${index}`} className="seller-image-preview-card">
                          <img src={url} alt={`Existing ${index + 1}`} loading="lazy" />
                          <button type="button" className="ghost-btn" onClick={() => removeExistingEditImage(index)}>Remove</button>
                        </article>
                      ))}
                      {editImagePreviewUrls.map((url, index) => (
                        <article key={`${url}-${index}`} className="seller-image-preview-card">
                          <img src={url} alt={`Selected ${index + 1}`} loading="lazy" />
                          <button type="button" className="ghost-btn" onClick={() => removeEditImageFile(index)}>Remove</button>
                        </article>
                      ))}
                      {!editExistingImageUrls.length && !editImagePreviewUrls.length && editForm.imageUrl && (
                        <article className="seller-image-preview-card">
                          <img
                            src={editForm.imageUrl}
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
                      <small className="muted">
                        {editExistingImageUrls.length} existing, {editImageFiles.length} new selected
                      </small>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => setEditImageFiles([])}
                        disabled={!editImageFiles.length}
                      >
                        Clear Images
                      </button>
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
                {isEditVideoCategory && editForm.posterUrl && (
                  <img className="preview-image" src={editForm.posterUrl} alt="Poster Preview" />
                )}
                <button className="primary-btn" type="submit">Save Changes</button>
              </form>
            </div>
          </div>
        )}

        {viewOpen && viewPostData && (
          <div className="modal-overlay" onClick={() => setViewOpen(false)}>
            <div className="modal-card view-post-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>View Pending Product</h3>
                <button className="ghost-btn" onClick={() => setViewOpen(false)}>Close</button>
              </div>
              <div className="form-card view-post-content">
                <p><strong>Title:</strong> {viewPostData.title || "-"}</p>
                <p><strong>Category:</strong> {viewPostData.category || "-"}</p>
                <p><strong>Type:</strong> {viewPostData.type || "-"}</p>
                <p><strong>Price:</strong> ₹{Number(viewPostData.price || 0).toFixed(2)}</p>
                <p><strong>Status:</strong> {viewPostData.status || "pending"}</p>
                <p><strong>Seller:</strong> {viewUploader.name} ({viewUploader.email || "-"})</p>
                {viewPostData.liveLink && (
                  <p><strong>Live Link:</strong> <a href={viewPostData.liveLink} target="_blank" rel="noreferrer">{viewPostData.liveLink}</a></p>
                )}
                {viewPostData.zipFileUrl && (
                  <p><strong>ZIP URL:</strong> <a href={viewPostData.zipFileUrl} target="_blank" rel="noreferrer">{viewPostData.zipFileUrl}</a></p>
                )}
                <p><strong>Description:</strong></p>
                <p>{viewPostData.description || "-"}</p>
                {!/video/i.test(String(viewPostData.category || "")) && (
                  <div className="seller-image-preview-grid">
                    {Array.from(
                      new Set(
                        [
                          ...(Array.isArray(viewPostData.imageUrls) ? viewPostData.imageUrls : []),
                          viewPostData.imageUrl || ""
                        ].filter(Boolean)
                      )
                    ).map((url, index) => (
                      <article key={`${url}-${index}`} className="seller-image-preview-card">
                        <img src={url} alt={`Product ${index + 1}`} loading="lazy" />
                      </article>
                    ))}
                  </div>
                )}
                {/video/i.test(String(viewPostData.category || "")) && (
                  <div className="seller-image-preview-grid">
                    {(viewPostData.posterUrl || viewPostData.imageUrl) && (
                      <article className="seller-image-preview-card">
                        <img src={viewPostData.posterUrl || viewPostData.imageUrl} alt="Poster" loading="lazy" />
                      </article>
                    )}
                  </div>
                )}
              </div>
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
              <input
                type="url"
                placeholder="Hero video URL"
                value={settings.heroBg}
                onChange={(e) => setSettings({ ...settings, heroBg: e.target.value })}
              />
              {settings.heroBg && <small className="muted">Current video: {settings.heroBg}</small>}
              {foregroundKeys.map((key, index) => (
                <div key={key}>
                  <label className="field-label">{`Foreground ${index + 1} Image (Upload)`}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleForegroundImage(key, e.target.files?.[0])}
                  />
                  <input
                    type="url"
                    placeholder={`Foreground ${index + 1} image URL`}
                    value={settings[key] || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                  {settings[key] && <small className="muted">Current image: {settings[key]}</small>}
                </div>
              ))}
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
                {getPageNumbers(purchasePage, purchasePages).map((num) => (
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

export default AdminDashboardPage;
