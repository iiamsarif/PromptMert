import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const NotificationsDetail = ({ apiBase }) => {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    fetch(`${apiBase}/api/notifications/${id}`)
      .then((r) => r.json())
      .then(setItem)
      .catch(console.error);
  }, [apiBase, id]);

  if (!item) {
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
      <section className="news-detail">
        <div className="news-detail-body">
          <span className="badge">{item.category}</span>
          <h1>{item.title}</h1>
          <p className="muted">{item.notificationDate}</p>
          <p className="news-text">{item.description}</p>
          {item.pdfData || item.pdfFile ? (
            <a className="primary-btn" href={item.pdfData || item.pdfFile} download>
              Download PDF
            </a>
          ) : (
            <p className="muted">PDF not available.</p>
          )}
        </div>
      </section>
    </main>
  );
};

export default NotificationsDetail;


