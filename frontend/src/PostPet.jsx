import React, { useState } from "react";

const PostPet = ({ apiBase }) => {
  const [form, setForm] = useState({
    petName: "",
    breed: "",
    age: "",
    gender: "",
    photos: "",
    contactPerson: "",
    phone: ""
  });
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/pets`, {
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
      setForm({ petName: "", breed: "", age: "", gender: "", photos: "", contactPerson: "", phone: "" });
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Post Pet Adoption</h1>
        <p>Share adoption listings for review.</p>
      </section>
      <section className="form-section">
        <form className="form-card" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Pet Name"
            value={form.petName}
            onChange={(e) => setForm({ ...form, petName: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Breed"
            value={form.breed}
            onChange={(e) => setForm({ ...form, breed: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Age"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Gender"
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
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
            placeholder="Contact Person"
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <button className="primary-btn" type="submit">Submit Listing</button>
          {status && <p className="success">{status}</p>}
        </form>
      </section>
    </main>
  );
};

export default PostPet;


