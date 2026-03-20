import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const PostService = ({ apiBase }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
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
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);

  useEffect(() => {
    fetch(`${apiBase}/api/categories`)
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [apiBase]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.name && item.name.toLowerCase() === form.category.toLowerCase()),
    [categories, form.category]
  );
  const types = Array.isArray(selectedCategory?.types) ? selectedCategory.types : [];
  const isVideo = /video/i.test(String(form.category || ""));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("type", form.type);
      fd.append("liveLink", form.liveLink);
      fd.append("price", form.price);
      fd.append("imageUrl", form.imageUrl);
      fd.append("videoUrl", form.videoUrl || "");
      fd.append("posterUrl", form.posterUrl || "");
      imageFiles.forEach((file) => fd.append("images", file));
      if (videoFile) fd.append("videos", videoFile);
      if (posterFile) fd.append("poster", posterFile);
      if (zipFile) fd.append("zipFile", zipFile);
      const res = await fetch(`${apiBase}/api/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit");
      setStatus("Product submitted successfully.");
      setTimeout(() => navigate("/my-shop"), 900);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page center-page">
      <section className="section-head-block">
        <h1>Start Selling</h1>
        <p>Upload your product for approval and marketplace listing.</p>
      </section>
      <section className="form-section">
        <form className="form-card" onSubmit={submit}>
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <textarea
            rows="4"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            required
          />
          <select
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value, type: "" }))}
            required
          >
            <option value="">Select Category</option>
            {categories.map((item) => (
              <option key={item._id} value={item.name}>{item.name}</option>
            ))}
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            required
          >
            <option value="">Select Type</option>
            {types.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <input
            type="url"
            placeholder="Live Link (optional)"
            value={form.liveLink}
            onChange={(e) => setForm((prev) => ({ ...prev, liveLink: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            step="0.01"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            required
          />
          {!isVideo && (
            <>
              <input
                type="text"
                placeholder="Image URL (optional fallback)"
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              />
              <label className="field-label">Upload Product Images</label>
              <input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files || []))} />
            </>
          )}
          {isVideo && (
            <>
              <input
                type="text"
                placeholder="Video URL (optional fallback)"
                value={form.videoUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
              />
              <label className="field-label">Upload Product Video</label>
              <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
              <input
                type="text"
                placeholder="Poster URL (optional fallback)"
                value={form.posterUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, posterUrl: e.target.value }))}
              />
              <label className="field-label">Upload Poster Image</label>
              <input type="file" accept="image/*" onChange={(e) => setPosterFile(e.target.files?.[0] || null)} />
            </>
          )}
          <label className="field-label">Upload ZIP Product File</label>
          <input type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={(e) => setZipFile(e.target.files?.[0] || null)} required />
          <button className="primary-btn" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Product"}
          </button>
          {status && <p className={status.toLowerCase().includes("success") ? "success" : "error"}>{status}</p>}
        </form>
      </section>
    </main>
  );
};

export default PostService;
