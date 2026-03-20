import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const fallbackImage = "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80";

const PostDetails = ({ apiBase }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const [post, setPost] = useState(null);
  const [activeImage, setActiveImage] = useState("");
  const [access, setAccess] = useState({ hasPurchased: false, locked: true, owner: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await fetch(`${apiBase}/api/products/${id}`);
    const data = await res.json();
    setPost(data);
    const first = (data?.imageUrls && data.imageUrls[0]) || data?.imageUrl || fallbackImage;
    setActiveImage(first);
    if (token) {
      const accessRes = await fetch(`${apiBase}/api/products/${id}/access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const accessData = await accessRes.json();
      setAccess(accessData || { hasPurchased: false, locked: true });
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [id, apiBase]);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const buyNow = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    if ((user?.role || "buyer") !== "buyer") {
      setMessage("Only buyer accounts can purchase products.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const ready = await loadRazorpay();
      if (!ready) throw new Error("Payment SDK failed to load");
      const orderRes = await fetch(`${apiBase}/api/checkout/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: id })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || "Unable to create order");
      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "PromptMert",
        description: post?.title || "Product Purchase",
        order_id: orderData.order.id,
        handler: async (response) => {
          const verifyRes = await fetch(`${apiBase}/api/checkout/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...response, productId: id })
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.message || "Verification failed");
          setMessage("Purchase successful.");
          await load();
          navigate("/purchase");
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setMessage(err.message || "Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/products/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Download unavailable");
      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (!post) {
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
      <section className="post-details">
        <div className="post-gallery">
          {post.videoUrl ? (
            <video className="post-main-image" src={post.videoUrl} poster={post.posterUrl || post.imageUrl || fallbackImage} controls playsInline />
          ) : (
            <img className="post-main-image" src={activeImage || fallbackImage} alt={post.title} />
          )}
          {!post.videoUrl && Array.isArray(post.imageUrls) && post.imageUrls.length > 1 && (
            <div className="post-thumbs">
              {post.imageUrls.map((url, idx) => (
                <button key={`${url}-${idx}`} type="button" className={`thumb-btn ${activeImage === url ? "active" : ""}`} onClick={() => setActiveImage(url)}>
                  <img src={url} alt={`${post.title} ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="post-info">
          <span className="badge">{post.category}</span>
          {post.type && <span className="badge">{post.type}</span>}
          <h1>{post.title}</h1>
          <p>{post.description}</p>
          <p className="muted">Seller: {post.sellerShopName || post.sellerEmail || "Seller"}</p>
          <h2>₹{Number(post.price || 0).toFixed(2)}</h2>
          <div className="detail-actions">
            {!access?.hasPurchased && !access?.owner && (
              <button className="primary-btn" disabled={busy} onClick={buyNow}>
                {busy ? "Processing..." : "Buy Now"}
              </button>
            )}
            <button className="ghost-btn" onClick={download} disabled={!access?.hasPurchased && !access?.owner}>
              {(access?.hasPurchased || access?.owner) ? "Download Product" : "Download Locked"}
            </button>
            {post.liveLink && (
              <a className="ghost-btn" href={post.liveLink} target="_blank" rel="noreferrer">
                Live Link
              </a>
            )}
          </div>
          {message && <p className="success">{message}</p>}
        </div>
      </section>
    </main>
  );
};

export default PostDetails;
