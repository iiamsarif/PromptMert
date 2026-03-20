import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const fallbackImage = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80";

const NewsDetail = ({ apiBase }) => {
  const { id } = useParams();
  const [news, setNews] = useState(null);

  useEffect(() => {
    fetch(`${apiBase}/api/news/${id}`)
      .then((r) => r.json())
      .then(setNews)
      .catch(console.error);
  }, [apiBase, id]);

  if (!news) {
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
        <img src={news.imageData || news.image || fallbackImage} alt={news.title} />
        <div className="news-detail-body">
          <span className="badge">{news.category}</span>
          <h1>{news.title}</h1>
          <p className="muted">{news.date}</p>
          <p className="news-text">{news.description}</p>
        </div>
      </section>
    </main>
  );
};

export default NewsDetail;


