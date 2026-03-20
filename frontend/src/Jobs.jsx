import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

const Jobs = ({ apiBase }) => {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${apiBase}/api/jobs?status=approved`)
      .then((r) => r.json())
      .then(setJobs)
      .catch(console.error);
  }, [apiBase]);

  const filtered = useMemo(() => {
    if (!query.trim()) return jobs;
    const q = query.toLowerCase();
    return jobs.filter((job) => JSON.stringify(job).toLowerCase().includes(q));
  }, [jobs, query]);

  return (
    <main className="page">
      <section className="section-head-block">
        <h1>Jobs & Services</h1>
        <p>Discover community jobs, services, and trusted local providers.</p>
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search job title, service..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <NavLink to="/post-job" className="primary-btn">Post a Job</NavLink>
        </div>
      </section>
      <section className="grid">
        {filtered.map((job) => (
          <div key={job._id} className="card">
            <h4>{job.jobTitle}</h4>
            <p>{job.description}</p>
            <div className="contact-row">
              <span>{job.phone}</span>
              <a className="ghost-btn" href={`https://wa.me/${job.whatsapp}`}>WhatsApp</a>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};

export default Jobs;


