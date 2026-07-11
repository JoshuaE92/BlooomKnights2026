import { useMemo } from "react";
import Header from "./Home/Header";
import "./Dashboard.css";

const DASHBOARD_CART_STORAGE_KEY = "dashboardCartSnapshot";

function readCartSnapshot() {
    const storedSnapshot = localStorage.getItem(DASHBOARD_CART_STORAGE_KEY);

    if (!storedSnapshot) {
        return null;
    }

    try {
        return JSON.parse(storedSnapshot);
    } catch {
        localStorage.removeItem(DASHBOARD_CART_STORAGE_KEY);
        return null;
    }
}

function Dashboard() {
    const snapshot = readCartSnapshot();
    const ingredientCount = useMemo(
        () => snapshot?.items?.reduce((total, item) => total + item.quantity, 0) ?? 0,
        [snapshot]
    );
    const greenScore = snapshot?.progress ?? 0;
    const arcLength = 100;
    const arcOffset = arcLength - greenScore;

    return (
        <main className="dashboard-page">
            <Header />
            <div className="dashboard-shell">
                <h1>Dashboard</h1>
                <div className="dashboard-content">
                    <div className="dashboard-top-row">
                        <section className="dashboard-section dashboard-section--overview">
                            {snapshot ? (
                                <div className="dashboard-overview">
                                    <div className="dashboard-score-arc" aria-label={`Current green score ${greenScore} out of 100`}>
                                        <svg viewBox="0 0 120 80" className="dashboard-score-arc__svg" role="img">
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
                                    No saved cart yet. Add ingredients in the cart and continue to send them here.
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
                                            <strong>{snapshot.progress}%</strong>
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
                            <h2>Ingredients</h2>
                            {snapshot?.savedAt && (
                                <span className="dashboard-chip">
                                    {new Date(snapshot.savedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {snapshot?.items?.length ? (
                            <div className="dashboard-items" aria-label="Saved cart ingredients">
                                {snapshot.items.map((item) => (
                                    <div key={item.id} className="dashboard-item">
                                        <div>
                                            <p className="dashboard-item__name">{item.name}</p>
                                            <p className="dashboard-item__meta">
                                                ${item.price.toFixed(2)} / {item.unit}
                                            </p>
                                        </div>
                                        <span className="dashboard-item__qty">x{item.quantity}</span>
                                    </div>
                                ))}
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