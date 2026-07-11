import { useEffect, useMemo, useState } from "react";
import Header from "./Home/Header";
import { api } from "../api";
import "./Dashboard.css";

function formatCartItemName(item) {
    if (item.name) {
        return item.name;
    }

    return String(item.id)
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

function Dashboard() {
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api.carts()
            .then((data) => setCarts(data.carts || []))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Latest saved cart drives the overview; the rest are "Previous Carts".
    const snapshot = carts[0] ?? null;
    const cartHistory = carts;

    const ingredientCount = useMemo(
        () => snapshot?.items?.reduce((total, item) => total + item.quantity, 0) ?? 0,
        [snapshot]
    );
    const greenScore = snapshot?.greenScore ?? 0;
    const arcLength = 100;
    const arcOffset = arcLength - greenScore;

    return (
        <main className="dashboard-page">
            <Header />
            <div className="dashboard-shell">
                <h1>Dashboard</h1>
                {error && <p className="dashboard-empty" role="alert">{error}</p>}
                <div className="dashboard-content">
                    <div className="dashboard-top-row">
                        <section className="dashboard-section dashboard-section--overview">
                            {snapshot ? (
                                <div className="dashboard-overview">
                                    <div className="dashboard-score-arc" aria-label={`Current green score ${greenScore} out of 100`}>
                                        <svg viewBox="0 0 120 80" className="dashboard-score-arc__svg" role="img">
                                            <defs>
                                                <linearGradient id="dashboard-green-score-gradient" x1="20" y1="60" x2="100" y2="60" gradientUnits="userSpaceOnUse">
                                                    <stop offset="0%" stopColor="var(--color-primary)" />
                                                    <stop offset="55%" stopColor="var(--color-secondary)" />
                                                    <stop offset="100%" stopColor="var(--color-tertiary)" />
                                                </linearGradient>
                                            </defs>
                                            <path
                                                className="dashboard-score-arc__track"
                                                d="M 20 60 A 40 40 0 0 1 100 60"
                                                pathLength="100"
                                            />
                                            <path
                                                className="dashboard-score-arc__value"
                                                d="M 20 60 A 40 40 0 0 1 100 60"
                                                pathLength="100"
                                                style={{ strokeDasharray: arcLength, strokeDashoffset: arcOffset }}
                                            />
                                        </svg>
                                        <div className="dashboard-score-arc__content">
                                            <span className="dashboard-overview__label">Green Score</span>
                                            <strong>{greenScore}%</strong>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="dashboard-empty">
                                    {loading
                                        ? "Loading your carts…"
                                        : "No saved cart yet. Add ingredients in the cart and continue to send them here."}
                                </p>
                            )}
                        </section>

                        <section className="dashboard-section dashboard-section--summary">
                            <div className="dashboard-section__header">
                                <h2>Saved Cart</h2>
                                {snapshot?.store && <span className="dashboard-chip">{snapshot.store}</span>}
                            </div>

                            {snapshot ? (
                                <>
                                    <p className="dashboard-section__description">
                                        Your latest cart was saved from the cart page and is ready for review.
                                    </p>
                                    <div className="dashboard-stats">
                                        <div className="dashboard-stat">
                                            <span className="dashboard-stat__label">Items</span>
                                            <strong>{ingredientCount}</strong>
                                        </div>
                                        <div className="dashboard-stat">
                                            <span className="dashboard-stat__label">Products</span>
                                            <strong>{snapshot.items.length}</strong>
                                        </div>
                                        <div className="dashboard-stat">
                                            <span className="dashboard-stat__label">Total</span>
                                            <strong>${snapshot.total.toFixed(2)}</strong>
                                        </div>
                                        <div className="dashboard-stat">
                                            <span className="dashboard-stat__label">Green Meter</span>
                                            <strong>{greenScore}%</strong>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="dashboard-placeholder" />
                            )}
                        </section>
                    </div>

                    <section className="dashboard-section dashboard-section--items">
                        <div className="dashboard-section__header">
                            <h2>Previous Carts</h2>
                            {snapshot?.createdAt && (
                                <span className="dashboard-chip">
                                    {new Date(snapshot.createdAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {cartHistory.length ? (
                            <div className="dashboard-cart-history" aria-label="Previous carts">
                                {cartHistory.map((cartEntry) => {
                                    return (
                                        <div key={cartEntry.id} className="dashboard-cart-card">
                                            <div className="dashboard-cart-card__header">
                                                <p className="dashboard-cart-card__title">{cartEntry.store}</p>
                                                <span className="dashboard-chip">
                                                    {new Date(cartEntry.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="dashboard-cart-card__items" aria-label={`${cartEntry.store} saved cart items`}>
                                                <div className="dashboard-cart-card__meter">
                                                    <div className="dashboard-cart-card__meter-header">
                                                        <span className="dashboard-stat__label">Green Score</span>
                                                        <strong>{cartEntry.greenScore ?? 0}%</strong>
                                                    </div>
                                                    <div className="dashboard-cart-card__meter-bar" aria-hidden="true">
                                                        <div
                                                            className="dashboard-cart-card__meter-fill"
                                                            style={{ width: `${cartEntry.greenScore ?? 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="dashboard-cart-card__receipt-head" aria-hidden="true">
                                                    <span>Item</span>
                                                    <span>Qty</span>
                                                    <span>Price</span>
                                                    <span>Total</span>
                                                </div>
                                                {cartEntry.items.map((item, index) => {
                                                    const itemPrice = item.price ?? 0;
                                                    const lineTotal = itemPrice * item.quantity;

                                                    return (
                                                        <div key={`${cartEntry.id}-${item.id}`} className="dashboard-cart-card__item-row">
                                                            <div className="dashboard-cart-card__item-name-cell">
                                                                <span className="dashboard-cart-card__item-order">{index + 1}.</span>
                                                                <div>
                                                                    <p className="dashboard-cart-card__item-name">{formatCartItemName(item)}</p>
                                                                    {item.unit && (
                                                                        <p className="dashboard-cart-card__item-meta">per {item.unit}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="dashboard-cart-card__item-value">{item.quantity}</span>
                                                            <span className="dashboard-cart-card__item-value">${itemPrice.toFixed(2)}</span>
                                                            <span className="dashboard-cart-card__item-value dashboard-cart-card__item-value--total">
                                                                ${lineTotal.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                <div className="dashboard-cart-card__receipt-total">
                                                    <span>Total</span>
                                                    <strong>${cartEntry.total.toFixed(2)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="dashboard-placeholder" />
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}

export default Dashboard;
