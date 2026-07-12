import { NEWS_ARTICLES } from "../../data/newsArticles";
import "./NewsCarousel.css";

function NewsCarousel() {
    // Duplicate the list so the marquee can loop seamlessly (track scrolls -50%).
    const items = [...NEWS_ARTICLES, ...NEWS_ARTICLES];

    return (
        <section className="news" aria-label="Sustainability news">
            <div className="news__head">
                <span className="news__title">📰 IN THE NEWS</span>
                <span className="news__hint">Hover to pause</span>
            </div>

            <div className="news__viewport">
                <div className="news__track">
                    {items.map((article, index) => (
                        <a
                            key={`${article.id}-${index}`}
                            className="news-card"
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-hidden={index >= NEWS_ARTICLES.length}
                        >
                            <div
                                className="news-card__art"
                                style={{ background: `linear-gradient(135deg, ${article.gradient[0]}, ${article.gradient[1]})` }}
                            >
                                <span className="news-card__emoji">{article.emoji}</span>
                                {article.badge && <span className="news-card__badge">{article.badge}</span>}
                            </div>
                            <div className="news-card__body">
                                <p className="news-card__headline">{article.title}</p>
                                <span className="news-card__read">Read article ↗</span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default NewsCarousel;
