import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

const fallbackHero = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80";
const SETTINGS_REFRESH_MS = 180000;

const sameIdList = (prev = [], next = []) => {
  if (prev === next) return true;
  if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    const prevId = String(prev[i]?._id || "");
    const nextId = String(next[i]?._id || "");
    if (prevId !== nextId) return false;
  }
  return true;
};

const HomePage = ({ apiBase }) => {
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
  const [heroForegrounds, setHeroForegrounds] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("heroForeCache") || "[]");
      return Array.isArray(cached) ? cached.slice(0, 5) : [];
    } catch {
      return [];
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
  const [allowHeroVideo, setAllowHeroVideo] = useState(true);
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
      if (document.visibilityState === "hidden") return;
      try {
        const [c, p, settings] = await Promise.all([
          fetch(`${apiBase}/api/categories`).then((r) => r.json()),
          fetch(`${apiBase}/api/posts?status=approved&limit=15`).then((r) => r.json()),
          fetch(`${apiBase}/api/settings/web`).then((r) => r.json())
        ]);
        if (!mounted) return;
        const nextCategories = Array.isArray(c) ? c : [];
        const nextPosts = p?.items || [];
        setCategories((prev) => (sameIdList(prev, nextCategories) ? prev : nextCategories));
        setPosts((prev) => (sameIdList(prev, nextPosts) ? prev : nextPosts));
        const nextHeroImage = settings?.heroImage || "";
        const nextHeroBg = settings?.heroBg || "";
        const nextForegrounds = [
          settings?.foreBg1 || "",
          settings?.foreBg2 || "",
          settings?.foreBg3 || "",
          settings?.foreBg4 || "",
          settings?.foreBg5 || ""
        ];
        setHeroImage((prev) => (prev === nextHeroImage ? prev : nextHeroImage));
        try {
          if (localStorage.getItem("heroImageCache") !== nextHeroImage) {
            localStorage.setItem("heroImageCache", nextHeroImage);
          }
        } catch {}
        setHeroBg((prev) => (prev === nextHeroBg ? prev : nextHeroBg));
        try {
          if (localStorage.getItem("heroBgCache") !== nextHeroBg) {
            localStorage.setItem("heroBgCache", nextHeroBg);
          }
        } catch {}
        setHeroForegrounds((prev) => (JSON.stringify(prev) === JSON.stringify(nextForegrounds) ? prev : nextForegrounds));
        try {
          const nextSerialized = JSON.stringify(nextForegrounds);
          if (localStorage.getItem("heroForeCache") !== nextSerialized) {
            localStorage.setItem("heroForeCache", nextSerialized);
          }
        } catch {}
      } catch (err) {
        console.error(err);
      }
    };
    const handleFocus = () => load();
    load();
    const interval = setInterval(load, SETTINGS_REFRESH_MS);
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
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCategoriesVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const updateMode = () => {
      const isReduced = !!reduceMotion?.matches;
      const saveData = !!navigator.connection?.saveData;
      const smallScreen = window.innerWidth < 768;
      setAllowHeroVideo(!(isReduced || saveData || smallScreen));
    };
    updateMode();
    reduceMotion?.addEventListener?.("change", updateMode);
    window.addEventListener("resize", updateMode);
    return () => {
      reduceMotion?.removeEventListener?.("change", updateMode);
      window.removeEventListener("resize", updateMode);
    };
  }, []);


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

  const heroDeckImages = React.useMemo(() => {
    const postImages = (posts || [])
      .map((item) => item?.posterUrl || (Array.isArray(item?.imageUrls) ? item.imageUrls[0] : "") || item?.imageUrl || "")
      .filter(Boolean);
    const fallbacks = [
      "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
    ];
    return Array.from({ length: 5 }, (_, idx) => (
      heroForegrounds[idx] || postImages[idx] || fallbacks[idx % fallbacks.length]
    ));
  }, [heroForegrounds, posts]);

  return (
    <main className="page home-page">
      <section className="hero-section">
        {heroBg && allowHeroVideo && (
          <video
            className="hero-video"
            src={heroBg}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroImage || fallbackHero}
          />
        )}
        <div className="container hero-layout hero-layout-seven">
          <div className="hero-content hero-content-seven">
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
          {heroImage && (
            <img
              className="hero-seven-float-image"
              src={heroImage}
              alt="Marketplace showcase"
              loading="lazy"
            />
          )}
        </div>
        <div className="hero-foreground-showcase" aria-hidden="true">
          {heroDeckImages.map((image, index) => (
            <article
              key={`hero-fore-${index}`}
              className={`hero-foreground-card fore-${index + 1}`}
            >
              <img src={image || fallbackHero} alt="" loading="lazy" />
            </article>
          ))}
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

      

      <section className="section section-light about-sunburst-section">
        <div className="container about-layout about-premium-shell">
          <div className="about-premium-copy">
            <div className="section-label">ABOUT</div>
            <h2>Creative Asset Marketplace</h2>
            <p>
              Our marketplace streamlines digital asset exchange so teams can launch faster.
              Discover high-quality creative resources and instantly move from idea to execution.
            </p>
            <div className="about-kpi-row">
              <strong>98%</strong>
              <span>Seller quality score</span>
            </div>
            <div className="about-visual parallax-media premium-about-media" data-speed="0.8">
              <img
                src="http://images.pexels.com/photos/109371/pexels-photo-109371.jpeg?_gl=1*1jh8rwv*_ga*MTM2NDg4Njc4Ny4xNzcyODY2ODE5*_ga_8JE65Q40S6*czE3NzQ1OTE4MzgkbzM3JGcxJHQxNzc0NTkxOTQyJGozNCRsMCRoMA.."
                alt="Digital marketplace"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackHero;
                }}
              />
            </div>
          </div>
          <div className="stat-grid about-premium-stats">
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

      <section className="section why-tropic-section">
        <div className="container why-premium-shell">
          <div className="section-head">
            <div>
              <div className="section-label">WHY US</div>
              <h2>Why Use PromptMert</h2>
            </div>
            <p>A secure, high-trust ecosystem built for modern digital commerce.</p>
          </div>
          <div className="section-visual why-premium-visual">
            <img
              src="https://images.pexels.com/photos/265685/pexels-photo-265685.jpeg?_gl=1*ucw2g6*_ga*MTM2NDg4Njc4Ny4xNzcyODY2ODE5*_ga_8JE65Q40S6*czE3NzQ1ODY3MjckbzM2JGcxJHQxNzc0NTg2NzQyJGo0NSRsMCRoMA.."
              alt="Digital creator workspace"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackHero;
              }}
            />
            <img
              className="why-float-media why-float-media-a"
              src="https://images.pexels.com/photos/34140/pexels-photo.jpg?_gl=1*8zqwbl*_ga*MTM2NDg4Njc4Ny4xNzcyODY2ODE5*_ga_8JE65Q40S6*czE3NzQ1ODY3MjckbzM2JGcxJHQxNzc0NTg2NzcxJGoxNiRsMCRoMA.."
              alt="Digital product analytics dashboard"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackHero;
              }}
            />
            <img
              className="why-float-media why-float-media-b"
              src="https://images.pexels.com/photos/13012466/pexels-photo-13012466.jpeg?_gl=1*ji0lza*_ga*MTM2NDg4Njc4Ny4xNzcyODY2ODE5*_ga_8JE65Q40S6*czE3NzQ1ODY3MjckbzM2JGcxJHQxNzc0NTg2ODgzJGo0OSRsMCRoMA.."
              alt="Creative team collaboration"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackHero;
              }}
            />
          </div>
          <div className="services-grid why-premium-grid">
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

      <section className="section testimonials-section tropical-trust-section">
        <div className="container trust-premium-shell">
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
          <div className="fresh-produce-board" aria-hidden="true">
            <div className="fresh-produce-left">Build Faster With Premium Digital Assets</div>
            <div className="fresh-produce-right">
              <span>🎬 Cinematic Videos</span>
              <span>📸 Photo Packs</span>
              <span>🤖 AI Prompt Bundles</span>
              <span>💻 Source Code Kits</span>
              <span>🎨 UI Resource Packs</span>
              <span>🌐 Website Themes</span>
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

      <section className="section section-light faq-section lemon-faq-section">
        <div className="container faq-premium-shell">
          <div className="retina-showcase">
            <h3>FULLY RESPONSIVE & RETINA READY</h3>
            <p>All templates stay sharp across desktops, tablets, and mobile screens.</p>
            <div className="retina-devices">
              <article className="retina-device retina-desktop">
                <img src={heroImage || fallbackHero} alt="Desktop preview" loading="lazy" />
              </article>
              <article className="retina-device retina-laptop">
                <img src={heroDeckImages[1] || fallbackHero} alt="Laptop preview" loading="lazy" />
              </article>
              <article className="retina-device retina-tablet">
                <img src={heroDeckImages[2] || fallbackHero} alt="Tablet preview" loading="lazy" />
              </article>
              <article className="retina-device retina-mobile">
                <img src={heroDeckImages[3] || fallbackHero} alt="Mobile preview" loading="lazy" />
              </article>
            </div>
          </div>
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

export default HomePage;








