import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const fallbackImage = "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80";

const MarketplacePage = ({ apiBase }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const [searchInput, setSearchInput] = useState(params.get("search") || "");
  const [search, setSearch] = useState(params.get("search") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [type, setType] = useState(params.get("type") || "");
  const [shop, setShop] = useState(params.get("shop") || "");
  const [priceSort, setPriceSort] = useState(params.get("price") || "");
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [shopOptions, setShopOptions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    fetch(`${apiBase}/api/categories`)
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [apiBase]);

  const loadPosts = async (nextPage) => {
    const q = new URLSearchParams();
    q.set("status", "approved");
    q.set("page", String(nextPage));
    q.set("limit", "6");
    q.set("sort", priceSort === "low" ? "price_asc" : priceSort === "high" ? "price_desc" : "sales_desc");
    if (search) q.set("search", search);
    if (category) q.set("category", category);
    if (type) q.set("type", type);
    if (shop) q.set("shop", shop);
    const res = await fetch(`${apiBase}/api/products?${q.toString()}`);
    const data = await res.json();
    setPosts(Array.isArray(data.items) ? data.items : []);
    setPages(data.pages || 1);
  };

  useEffect(() => {
    loadPosts(page).catch(() => {});
  }, [page, search, category, type, shop, priceSort]);

  useEffect(() => {
    const loadShops = async () => {
      const q = new URLSearchParams();
      q.set("status", "approved");
      q.set("page", "1");
      q.set("limit", "50");
      q.set("sort", "sales_desc");
      const res = await fetch(`${apiBase}/api/products?${q.toString()}`);
      const data = await res.json();
      const names = Array.from(
        new Set(
          (Array.isArray(data.items) ? data.items : [])
            .map((item) => String(item.sellerShopName || item.sellerEmail || "").trim())
            .filter(Boolean)
        )
      );
      setShopOptions(names);
    };
    loadShops().catch(() => {});
  }, [apiBase]);

  const typeOptions = useMemo(() => {
    if (category) {
      const selected = categories.find((item) => item.name && item.name.toLowerCase() === category.toLowerCase());
      return Array.isArray(selected?.types) ? selected.types : [];
    }
    const merged = categories.flatMap((item) => (Array.isArray(item.types) ? item.types : []));
    return Array.from(new Set(merged));
  }, [categories, category]);

  return (
    <main className="page posts-market">
      <section className="section-head-block">
        <h1>Digital Products Marketplace</h1>
        <p>Browse premium assets from creators: videos, photography packs, AI prompts, and source code.</p>
      </section>

      <div className="wrapper">
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search products, categories, or types..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button className="search-btn" onClick={() => { setSearch(searchInput); setPage(1); }}>
            Search
          </button>
        </div>

        <div className="meta-info">
          <strong>PromptMert Digital Marketplace</strong>
          <br />
          Discover production-ready digital products published by independent creators.
          <br />
          Need inspiration? Explore <Link to="/posts">all categories</Link> in one place.
        </div>

        <div className="filter-bar">
          <div className="filter-left">
            <strong>{posts.length}</strong> items in <span className="filter-highlight">{category || "All Categories"}</span>
          </div>
          <div className="sort-options">
            <select
              className="posts-filter-select"
              value={shop}
              onChange={(e) => { setShop(e.target.value); setPage(1); }}
              aria-label="Filter by shop"
            >
              <option value="">All shops</option>
              {shopOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select
              className="posts-filter-select"
              value={priceSort}
              onChange={(e) => { setPriceSort(e.target.value); setPage(1); }}
              aria-label="Filter by price"
            >
              <option value="">Price</option>
              <option value="low">Low to High</option>
              <option value="high">High to Low</option>
            </select>
          </div>
        </div>

        <div className="category-row">
          <button type="button" className={`cat-pill ${!category ? "active" : ""}`} onClick={() => { setCategory(""); setType(""); setPage(1); }}>
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              className={`cat-pill ${category === cat.name ? "active" : ""}`}
              onClick={() => { setCategory(cat.name); setType(""); setPage(1); }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="type-row">
          <button type="button" className={`type-pill ${!type ? "active" : ""}`} onClick={() => { setType(""); setPage(1); }}>
            All Types
          </button>
          {typeOptions.map((item) => (
            <button
              key={item}
              type="button"
              className={`type-pill ${type === item ? "active" : ""}`}
              onClick={() => { setType(item); setPage(1); }}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="product-list">
          {posts.map((post) => (
            <article key={post._id} className="product-card">
              <img src={(post.posterUrl) || (post.imageUrls && post.imageUrls[0]) || post.imageUrl || fallbackImage} alt={post.title} className="prod-img" loading="lazy" />
              <div className="prod-details">
                <h2 className="prod-title" onClick={() => navigate(`/posts/${post._id}`)}>{post.title}</h2>
                <div className="prod-author">by {post.sellerShopName || post.sellerEmail || "Seller"} in <Link to="/posts">{post.category}</Link></div>
                <ul className="prod-features">
                  <li>{post.category}</li>
                  <li>{post.type || "General"}</li>
                  <li className="clamp-2">{post.description}</li>
                </ul>
              </div>
              <div className="prod-pricing">
                <div className="action-icons">
                  <span title="Save">Save</span>
                  <span title="Like">Like</span>
                </div>
                <div className="price">₹{Number(post.price || 0).toFixed(0)}</div>
                <div className="rating">★★★★★ <span className="muted">(8)</span></div>
                <div className="sales">{post.salesCount || 0} Sales</div>
                <button className="btn-preview" onClick={() => navigate(`/posts/${post._id}`)}>View Details</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="pagination">
        {Array.from({ length: Math.min(4, pages) }, (_, idx) => idx + 1).map((num) => (
          <button key={num} className={`page-btn ${page === num ? "active" : ""}`} onClick={() => setPage(num)}>{num}</button>
        ))}
        {page < pages && <button className="page-btn" onClick={() => setPage(page + 1)}>Next</button>}
      </div>
    </main>
  );
};

export default MarketplacePage;

