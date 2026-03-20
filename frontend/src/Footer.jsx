import React, { useEffect, useState } from "react";

const Footer = ({ apiBase }) => {
  const [contactEmail, setContactEmail] = useState("support@promptmert.com");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/api/settings/web`);
        const data = await res.json();
        if (data.contactEmail) setContactEmail(data.contactEmail);
      } catch (err) {
        console.error(err);
      }
    };
    if (apiBase) load();
  }, [apiBase]);

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">PromptMert</div>
          <p className="footer-text">
            A creator-first digital marketplace for videos, photography, AI prompts, and website source code.
          </p>
        </div>
        <div className="footer-links">
          <a href="/services">Categories</a>
          <a href="/posts">Products</a>
          <a href="/contact">Contact</a>
        </div>
        <div className="footer-meta">
          <p>Contact: {contactEmail}</p>
          <p>(c) 2026 PromptMert. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;



