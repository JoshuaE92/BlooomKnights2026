import { useState } from "react";
import { useNavigate } from "react-router";
import Header from "./Header";
import NewsCarousel from "./NewsCarousel";
import { api } from "../../api";
import "./Home.css";

// Cart page reads this key to preload the AI's picks. Keep it exported —
// src/pages/Cart.jsx imports it. (Changing/removing it breaks the Cart page.)
export const AI_SUGGESTION_STORAGE_KEY = "aiSuggestion";

function Home() {
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        const trimmed = prompt.trim();
        if (!trimmed || loading) return;

        setError("");
        setLoading(true);
        try {
            const result = await api.suggest(trimmed);

            if (!result.picks?.length) {
                setError("I couldn't find matching products for that — try describing the meal differently.");
                return;
            }

            // Hand the picks to the Cart page, then go there (Home -> Cart -> Dashboard).
            localStorage.setItem(AI_SUGGESTION_STORAGE_KEY, JSON.stringify(result));
            navigate("/cart");
        } catch (err) {
            setError(
                /not authorized|token/i.test(err.message)
                    ? "Please log in again to generate your list."
                    : err.message || "Something went wrong. Try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="home-page">
            <Header />

            <section className="home-hero">
                <span className="home-badge">✦ AI-powered sustainable shopping</span>
                <h1 className="home-title">Start your recipe</h1>
                <p className="home-subtitle">
                    Tell us what you're cooking. We'll build a curated shopping list with the
                    greenest ingredients — ranked by carbon impact, sourcing, and freshness.
                </p>

                <form className="home-card" onSubmit={handleSubmit}>
                    <label className="home-card__label" htmlFor="recipe-input">
                        WHAT WOULD YOU LIKE TO COOK?
                    </label>
                    <div className="home-card__row">
                        <input
                            id="recipe-input"
                            className="home-card__input"
                            type="text"
                            placeholder="e.g. spaghetti bolognese, Thai green curry, weeknight tacos..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            autoComplete="off"
                        />
                        <button className="home-card__btn" type="submit" disabled={loading}>
                            {loading ? "Generating…" : "Generate"}
                            <span aria-hidden="true">➤</span>
                        </button>
                    </div>
                    <p className={`home-card__hint${error ? " home-card__hint--error" : ""}`}>
                        {error ? `⚠️ ${error}` : "Press Enter to generate your greenest shopping list."}
                    </p>
                </form>

                <NewsCarousel />
            </section>

            <footer className="home-footer">
                <span className="home-footer__brand">🌿 © 2026 Green Cart — shop greener, live better.</span>
                <span className="home-footer__links">
                    <a href="#">Privacy</a>
                    <a href="#">Terms</a>
                    <a href="#">Contact</a>
                </span>
            </footer>
        </main>
    );
}

export default Home;
