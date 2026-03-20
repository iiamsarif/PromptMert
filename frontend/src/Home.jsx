import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

const fallbackHero = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80";

const Home = ({ apiBase }) => {
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postSearch, setPostSearch] = useState("");
  const [heroImage, setHeroImage] = useState(() => {
    try {
      return localStorage.getItem("heroImageCache") || "";
    } catch {
      return "";
    }
  });
  const [heroBg, setHeroBg] = useState(() => {
    try {
      return localStorage.getItem("heroBgCache") || "";
    } catch {
      return "";
    }
  });
  const categoriesRef = useRef(null);
  const cleanText = (value) => (value || '').replace(/\\r?\\n/g, ' ').trim();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const [user, setUser] = useState(() => {
    if (!token) return null;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return null;
    }
  });
  const [showCongrats, setShowCongrats] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const testimonials = [
    {
      name: "Aditi K.",
      role: "Motion Designer",
      quote: "PromptMert helped me ship a campaign faster with ready-to-use video and photo assets.",
      avatar: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=140&q=80"
    },
    {
      name: "Rahul M.",
      role: "Frontend Developer",
      quote: "From UI kits to source code bundles, I found production-ready resources in minutes.",
      avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=140&q=80"
    },
    {
      name: "Sneha P.",
      role: "AI Content Creator",
      quote: "The AI prompt packs are clean, practical, and easy to monetize as a seller.",
      avatar: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=140&q=80"
    }
  ];
  const [paymentInfo, setPaymentInfo] = useState(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [c, p, settings] = await Promise.all([
          fetch(`${apiBase}/api/categories`).then((r) => r.json()),
          fetch(`${apiBase}/api/posts?status=approved&limit=15`).then((r) => r.json()),
          fetch(`${apiBase}/api/settings/web`).then((r) => r.json())
        ]);
        if (!mounted) return;
        setCategories(Array.isArray(c) ? c : []);
        setPosts(p?.items || []);
        const nextHeroImage = settings?.heroImage || "";
        const nextHeroBg = settings?.heroBg || "";
        if (nextHeroImage && nextHeroImage !== heroImage) {
          setHeroImage(nextHeroImage);
          try {
            localStorage.setItem("heroImageCache", nextHeroImage);
          } catch {}
        }
        if (nextHeroBg && nextHeroBg !== heroBg) {
          setHeroBg(nextHeroBg);
          try {
            localStorage.setItem("heroBgCache", nextHeroBg);
          } catch {}
        }
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

  useEffect(() => {
    if (!token || !apiBase) return;
    fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.email) {
          localStorage.setItem("user", JSON.stringify(data));
          setUser(data);
          window.dispatchEvent(new Event("user-updated"));
        }
      })
      .catch(console.error);
  }, [apiBase, token]);


  const [categoriesVisible, setCategoriesVisible] = useState(false);
  useEffect(() => {
    const section = categoriesRef.current;
    if (!section) return;
    const reveal = () => {
      const rect = section.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > 0;
      if (inView && !categoriesVisible) {
        setCategoriesVisible(true);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCategoriesVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(section);
    const onScroll = () => reveal();
    const onLoad = () => reveal();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onLoad);
    reveal();
    return () => observer.disconnect();
  }, [categoriesVisible]);


  useEffect(() => {
    const syncUser = () => {
      try {
        const next = localStorage.getItem("user");
        setUser(next ? JSON.parse(next) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", syncUser);
    window.addEventListener("user-updated", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, []);

  useEffect(() => {
    if (location.hash === "#pricing") {
      const section = document.getElementById("pricing");
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  const goToCategory = (name) => {
    navigate(`/posts?category=${encodeURIComponent(name)}`);
  };

  const goToSearch = () => {
    const term = postSearch.trim();
    if (!term) return;
    navigate(`/posts?search=${encodeURIComponent(term)}`);
  };

  return (
    <main className="page home-page">
      <section className="hero-section">
        {heroBg && (
          <video
            className="hero-video"
            src={heroBg}
            autoPlay
            muted
            loop
            playsInline
          />
        )}
        <div className="container hero-layout">
          <div className="hero-content">
            <div className="hero-tag section-label">Creator-First Digital Marketplace</div>
            <h1 className="hero-title">Buy and sell digital assets for your next product, campaign, or client project.</h1>
            <p className="hero-subtitle">
              PromptMert connects creative developers with content seekers through a secure marketplace
              for cinematic videos, professional photography, AI prompts, and website source code.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  if (!token) {
                    navigate("/login?role=seller");
                    return;
                  }
                  const role = user?.role || "buyer";
                  if (role === "seller") {
                    navigate("/my-shop");
                    return;
                  }
                  navigate("/login?role=seller");
                }}
              >
                Start Selling
              </button>
              <NavLink to="/posts" className="ghost-btn">View Products</NavLink>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-fore-description">
              <h3>Creative Assets Marketplace</h3>
              <p>Secure marketplace where creators sell videos, photos, prompts, and source code globally efficiently.</p>
            </div>
            {heroImage && (
              <img
                className="hero-image"
                src={heroImage}
                alt="Marketplace showcase"
                loading="lazy"
              />
            )}
            <div className="hero-glow"></div>
          </div>
        </div>
      </section>

      <section className="section" id="categories" ref={categoriesRef}>
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-label">CATEGORIES</div>
              <h2>Product Categories</h2>
            </div>
            <NavLink to="/services">View all</NavLink>
          </div>
          <div className="category-split">
            <aside className="category-filter card">
              <div className="filter-title">Filter By</div>
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search products by title, category, or type..."
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      goToSearch();
                    }
                  }}
                />
                <span className="filter-icon">🔍</span>
              </div>
              <button className="primary-btn filter-search-btn" type="button" onClick={goToSearch}>
                Search
              </button>
              <div className="filter-group">
                <div className="filter-label">FILTER BY</div>
                <button
                  className="filter-item active"
                  type="button"
                  onClick={() => navigate("/posts")}
                >
                  Show All
                </button>
                {categories.slice(0, 8).map((cat) => (
                  <button
                    key={cat._id}
                    className="filter-item"
                    type="button"
                    onClick={() => goToCategory(cat.name)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </aside>
            <div className="category-grid">
              {categories.slice(0, 9).map((cat, idx) => (
                <div
                  key={cat._id}
                  className={`card category-card ${categoriesVisible ? "jump-in" : ""}`}
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="demo-badge">NEW</div>
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
                  <div className="service-number">{String(idx + 1).padStart(2, "0")}</div>
                  <h4>{cat.name}</h4>
                  <p>{cat.description || "Explore premium products from verified creators."}</p>
                  <button className="ghost-btn" onClick={() => goToCategory(cat.name)}>View Products</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light featured-market-section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-label">FEATURED</div>
              <h2>Featured Products</h2>
            </div>
            <NavLink to="/posts">View all</NavLink>
          </div>
          <div className="featured-market-wrap">
            <aside className="featured-intro-card">
              <h3>Featured themes</h3>
              <p>
                Every week, our team hand-picks high-converting products from video, photography,
                AI prompts, and source code collections.
              </p>
              <NavLink to="/posts" className="primary-btn">View all featured themes</NavLink>
            </aside>
            <div className="featured-market-grid">
              {posts.slice(0, 4).map((item) => (
                <article key={item._id} className="featured-market-card">
                <span className="demo-badge">NEW</span>
                <img src={item.posterUrl || (item.imageUrls && item.imageUrls[0]) || item.imageUrl || fallbackHero} alt={item.title} loading="lazy" />
                <div className="featured-market-body">
                  <h4>{item.title}</h4>
                  <p className="muted">{item.category}</p>
                  <div className="featured-market-meta">
                    <strong>₹{Number(item.price || 0).toFixed(0)}</strong>
                    <NavLink className="ghost-btn" to={`/posts/${item._id}`}>Live Preview</NavLink>
                  </div>
                </div>
              </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      

      <section className="section section-light">
        <div className="container about-layout">
          <div>
            <div className="section-label">ABOUT</div>
            <h2>Creative Asset Marketplace</h2>
            <p>
              Our marketplace streamlines digital asset exchange so teams can launch faster.
              Discover high-quality creative resources and instantly move from idea to execution.
            </p>
            <div className="about-visual parallax-media" data-speed="0.8">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80"
                alt="Digital marketplace"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackHero;
                }}
              />
            </div>
          </div>
          <div className="stat-grid">
            <div className="card float-card">
              <h3>98%</h3>
              <p>Seller quality score</p>
            </div>
            <div className="card float-card">
              <h3>24 hrs</h3>
              <p>Average product review window</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-label">WHY US</div>
              <h2>Why Use PromptMert</h2>
            </div>
            <p>A secure, high-trust ecosystem built for modern digital commerce.</p>
          </div>
          <div className="section-visual">
            <img
              src="https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80"
              alt="Why us"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackHero;
              }}
            />
          </div>
          <div className="services-grid">
            <div className="card">
              <div className="service-number">01</div>
              <h4>Verified Content</h4>
              <p>Every submission is reviewed to keep quality high and buyer confidence strong.</p>
            </div>
            <div className="card">
              <div className="service-number">02</div>
              <h4>Unified Search</h4>
              <p>Search products by title, category, and type from one unified interface.</p>
            </div>
            <div className="card">
              <div className="service-number">03</div>
              <h4>Secure Access</h4>
              <p>Secure authentication and role-based access protect buyers and sellers.</p>
            </div>
            <div className="card">
              <div className="service-number">04</div>
              <h4>Premium Support</h4>
              <p>Fast support for checkout, uploads, delivery, and account issues.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section testimonials-section">
        <div className="container">
          <div className="trusted-strip">
            <div className="section-label">TRUSTED BY</div>
            <h2>Selected creator studios, product teams, and digital partners.</h2>
            <div className="trusted-logos">
              <div className="trusted-track">
                <span>CREATOR HUB</span>
                <span>DIGITAL STUDIO</span>
                <span>VIDEO ASSETS</span>
                <span>PHOTO PACKS</span>
                <span>AI PROMPTS</span>
                <span>SOURCE CODE</span>
                <span>UI KITS</span>
                <span>WEBSITE THEMES</span>
                <span>VIDEO ASSETS</span>
                <span>PHOTO PACKS</span>
                <span>AI PROMPTS</span>
                <span>SOURCE CODE</span>
              </div>
            </div>
          </div>

          <div className="testimonial-panel">
            <div className="testimonial-copy">
              <div className="section-label">OUR TESTIMONIALS</div>
              <h2>Customers talk about us</h2>
              <p>Real creators and teams sharing how PromptMert accelerates delivery.</p>
            </div>
            <div className="testimonial-slider">
              <div className="testimonial-slider-head">
                <div className="testimonial-identity">
                  <img src={testimonials[testimonialIndex].avatar} alt="Customer" />
                  <div>
                    <h4>{testimonials[testimonialIndex].name}</h4>
                    <span>{testimonials[testimonialIndex].role}</span>
                  </div>
                </div>
                <div className="testimonial-controls">
                  <button
                    type="button"
                    onClick={() => setTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestimonialIndex((prev) => (prev + 1) % testimonials.length)}
                  >
                    →
                  </button>
                </div>
              </div>
              <div key={testimonialIndex} className="testimonial-quote-card">
                <span className="quote-mark">“</span>
                <p>{testimonials[testimonialIndex].quote}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light faq-section">
        <div className="container">
          <div className="section-head">
            <div className="section-label">FAQS</div>
            
          </div>
          <div className="faq-grid">
            <div className="card faq-card">
              <h4>How are products verified?</h4>
              <p>Our team reviews uploads before they go live in the marketplace.</p>
            </div>
            <div className="card faq-card">
              <h4>How long does approval take?</h4>
              <p>Most products are reviewed and approved within 24 hours.</p>
            </div>
            <div className="card faq-card">
              <h4>Can I edit a post after approval?</h4>
              <p>Yes, you can edit your posts from the profile menu.</p>
            </div>
            <div className="card faq-card">
              <h4>Is my data secure?</h4>
              <p>We use JWT authentication and admin approvals for safety.</p>
            </div>
          </div>
        </div>
      </section>

      

      {showCongrats && (
        <div className="modal-overlay" onClick={() => setShowCongrats(false)}>
          <div className="modal-card congrats-card" onClick={(e) => e.stopPropagation()}>
            <div className="success-tick">
              <span>✓</span>
            </div>
            <h2>Congratulations!</h2>
            <p>You are now on the Premium plan.</p>
            <div className="payment-summary">
              <div>
                <span>Plan</span>
                <strong>{paymentInfo?.plan || "Premium"}</strong>
              </div>
              <div>
                <span>Amount</span>
                <strong>{paymentInfo?.amount || "₹350"}</strong>
              </div>
              <div>
                <span>Valid Until</span>
                <strong>{paymentInfo?.paidUntil ? new Date(paymentInfo.paidUntil).toLocaleDateString() : "—"}</strong>
              </div>
            </div>
            <button className="primary-btn" onClick={() => setShowCongrats(false)}>Continue</button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;












