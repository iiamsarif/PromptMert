import React, { useState } from "react";

const PostProperty = ({ apiBase }) => {
  const [form, setForm] = useState({
    propertyTitle: "",
    saleType: "Sale",
    price: "",
    photos: "",
    contactNumber: "",
    whatsapp: ""
  });
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");
      setStatus("Submitted. Awaiting admin approval.");
      setForm({ propertyTitle: "", saleType: "Sale", price: "", photos: "", contactNumber: "", whatsapp: "" });
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Post Property Listing</h1>
        <p>Upload verified property details for review.</p>
      </section>
      <section className="form-section">
        <form className="form-card" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Property Title"
            value={form.propertyTitle}
            onChange={(e) => setForm({ ...form, propertyTitle: e.target.value })}
            required
          />
          <select
            value={form.saleType}
            onChange={(e) => setForm({ ...form, saleType: e.target.value })}
          >
            <option>Sale</option>
            <option>Rent</option>
          </select>
          <input
            type="text"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <input
            type="text"
            required
          />
          <input
            type="text"
            placeholder="Photos (URL)"
            value={form.photos}
            onChange={(e) => setForm({ ...form, photos: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={form.contactNumber}
            onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            required
          />
          <button className="primary-btn" type="submit">Submit Listing</button>
          {status && <p className="success">{status}</p>}
        </form>
      </section>
    </main>
  );
};

export default PostProperty;


