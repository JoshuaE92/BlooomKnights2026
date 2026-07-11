import { useMemo } from "react";
import Header from "./Home/Header";
import "./Dashboard.css";

const DASHBOARD_CART_STORAGE_KEY = "dashboardCartSnapshot";
const DASHBOARD_CART_HISTORY_STORAGE_KEY = "dashboardCartHistory";

const MOCK_CART_HISTORY = [
    {
        store: "Publix",
        progress: 82,
        total: 41.37,
        savedAt: "2026-07-10T17:45:00.000Z",
        items: [
            { id: "spinach", name: "Baby Spinach", quantity: 2, price: 3.49, unit: "bag" },
            { id: "salmon", name: "Salmon Fillet", quantity: 1, price: 12.99, unit: "lb" },
            { id: "rice", name: "Basmati Rice", quantity: 1, price: 2.29, unit: "lb" },
            { id: "olive-oil", name: "Olive Oil", quantity: 1, price: 8.99, unit: "bottle" }
        ]
    },
    {
        store: "Target",
        progress: 68,
        total: 27.14,
        savedAt: "2026-07-08T13:10:00.000Z",
        items: [
            { id: "tofu", name: "Firm Tofu", quantity: 2, price: 2.49, unit: "block" },
            { id: "tomatoes", name: "Tomatoes", quantity: 1, price: 2.99, unit: "lb" },
            { id: "pasta", name: "Spaghetti", quantity: 2, price: 1.99, unit: "box" }
        ]
    },
    {
        store: "Walmart",
        progress: 54,
        total: 33.92,
        savedAt: "2026-07-06T19:20:00.000Z",
        items: [
            { id: "chicken", name: "Chicken Breast", quantity: 2, price: 6.99, unit: "lb" },
            { id: "milk", name: "Whole Milk", quantity: 1, price: 3.79, unit: "gallon" },
            { id: "bread", name: "Sourdough Bread", quantity: 1, price: 5.49, unit: "loaf" },
            { id: "bananas", name: "Bananas", quantity: 1, price: 1.29, unit: "bunch" }
        ]
    }
];

function formatCartItemName(item) {
    if (item.name) {
        return item.name;
    }

    return item.id
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

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

function readCartHistory() {
    const storedHistory = localStorage.getItem(DASHBOARD_CART_HISTORY_STORAGE_KEY);

    if (!storedHistory) {
		return MOCK_CART_HISTORY;
    }

    try {
        const parsedHistory = JSON.parse(storedHistory);
		return Array.isArray(parsedHistory) && parsedHistory.length ? parsedHistory : MOCK_CART_HISTORY;
    } catch {
        localStorage.removeItem(DASHBOARD_CART_HISTORY_STORAGE_KEY);
		return MOCK_CART_HISTORY;
    }
}

function Dashboard() {
    const snapshot = readCartSnapshot();
    const cartHistory = readCartHistory();
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
                            <h2>Previous Carts</h2>
                            {snapshot?.savedAt && (
                                <span className="dashboard-chip">
                                    {new Date(snapshot.savedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {cartHistory.length ? (
                            <div className="dashboard-cart-history" aria-label="Previous carts">
                                {cartHistory.map((cartEntry) => {
                                    return (
                                        <div key={cartEntry.savedAt} className="dashboard-cart-card">
                                            <div className="dashboard-cart-card__header">
                                                <p className="dashboard-cart-card__title">{cartEntry.store}</p>
                                                <span className="dashboard-chip">
                                                    {new Date(cartEntry.savedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="dashboard-cart-card__items" aria-label={`${cartEntry.store} saved cart items`}>
                                                <div className="dashboard-cart-card__meter">
                                                    <div className="dashboard-cart-card__meter-header">
                                                        <span className="dashboard-stat__label">Green Score</span>
                                                        <strong>{cartEntry.progress}%</strong>
                                                    </div>
                                                    <div className="dashboard-cart-card__meter-bar" aria-hidden="true">
                                                        <div
                                                            className="dashboard-cart-card__meter-fill"
                                                            style={{ width: `${cartEntry.progress}%` }}
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
                                                        <div key={`${cartEntry.savedAt}-${item.id}`} className="dashboard-cart-card__item-row">
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