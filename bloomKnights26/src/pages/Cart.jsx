import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Header from "./Home/Header";
import { api } from "../api";
import { AI_SUGGESTION_STORAGE_KEY } from "./Home/Home";
import "./Cart.css";

// Quantity-weighted average green score of the cart (0-100).
// Items without a greenScore fall back to overallScore; unscored items are skipped.
function computeGreenMeter(items) {
	let weighted = 0;
	let quantity = 0;

	for (const item of items) {
		const score = item.greenScore ?? item.overallScore;
		if (score == null) continue;
		weighted += score * item.quantity;
		quantity += item.quantity;
	}

	return quantity ? Math.round(weighted / quantity) : 0;
}

function Cart() {
	const navigate = useNavigate();
	const [stores, setStores] = useState([]);
	const [selectedStore, setSelectedStore] = useState("");
	const [products, setProducts] = useState([]);
	const [loadingProducts, setLoadingProducts] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [cart, setCart] = useState(() => {
		// Preload the AI chatbot's picks (saved by the Home page), one of each.
		try {
			const stored = localStorage.getItem(AI_SUGGESTION_STORAGE_KEY);
			if (!stored) return {};
			localStorage.removeItem(AI_SUGGESTION_STORAGE_KEY);

			const suggestion = JSON.parse(stored);
			const preloaded = {};
			for (const pick of suggestion.picks || []) {
				preloaded[pick.id] = { ...pick, quantity: 1 };
			}
			return preloaded;
		} catch {
			return {};
		}
	});

	// Load the store list once.
	useEffect(() => {
		api.stores()
			.then((data) => {
				setStores(data.stores || []);
				if (data.stores?.length) setSelectedStore(data.stores[0].id);
			})
			.catch((err) => setError(err.message));
	}, []);

	// Load products whenever the selected store changes.
	useEffect(() => {
		if (!selectedStore) return;
		setLoadingProducts(true);
		api.products([selectedStore])
			.then((data) => setProducts(data.products || []))
			.catch((err) => setError(err.message))
			.finally(() => setLoadingProducts(false));
	}, [selectedStore]);

	const cartItems = useMemo(() => Object.values(cart), [cart]);
	const cartTotal = useMemo(
		() => cartItems.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0),
		[cartItems]
	);
	const progress = useMemo(() => computeGreenMeter(cartItems), [cartItems]);

	function handleAddIngredient(product) {
		setCart((previousCart) => {
			const existingItem = previousCart[product.id];

			return {
				...previousCart,
				[product.id]: {
					...product,
					quantity: existingItem ? existingItem.quantity + 1 : 1
				}
			};
		});
	}

	function handleRemoveOneItem(itemId) {
		setCart((previousCart) => {
			const existingItem = previousCart[itemId];

			if (!existingItem) {
				return previousCart;
			}

			if (existingItem.quantity <= 1) {
				const updatedCart = { ...previousCart };
				delete updatedCart[itemId];
				return updatedCart;
			}

			return {
				...previousCart,
				[itemId]: {
					...existingItem,
					quantity: existingItem.quantity - 1
				}
			};
		});
	}

	function handleClearItem(itemId) {
		setCart((previousCart) => {
			const updatedCart = { ...previousCart };
			delete updatedCart[itemId];
			return updatedCart;
		});
	}

	function handleClearCart() {
		setCart({});
	}

	async function handleContinue() {
		if (cartItems.length === 0 || saving) {
			return;
		}

		setSaving(true);
		setError("");
		try {
			await api.saveCart({
				store: selectedStore,
				greenScore: progress,
				total: Number(cartTotal.toFixed(2)),
				items: cartItems.map((item) => ({
					id: item.id,
					name: item.name,
					price: item.price,
					unit: item.unit,
					quantity: item.quantity,
					greenScore: item.greenScore ?? item.overallScore ?? null
				}))
			});
			navigate("/dashboard");
		} catch (err) {
			setError(err.message || "Could not save your cart.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<main className="cart-page">
			<Header />
			<section className="cart-layout">
				<div className="cart-top-panel">
					<h1>Green Meter</h1>
					<p>Measures the average green rating of your cart!</p>
					<div className="cart-progress" aria-label="Cart green score">
						<div
							className="cart-progress__fill"
							style={{ width: `${progress}%` }}
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={progress}
						/>
					</div>
					<p className="cart-progress__value">{progress}%</p>
				</div>

				{error && <p className="cart-error" role="alert">{error}</p>}

				<div className="cart-panels">
					<div className="cart-panel cart-panel--ingredients">
						<div className="ingredients-panel__header">
							<h2>Ingredients</h2>
							<div className="ingredients-panel__store">
								<span className="ingredients-panel__store-label">Store</span>
								<select
									className="ingredients-panel__select"
									value={selectedStore}
									onChange={(event) => setSelectedStore(event.target.value)}
									aria-label="Select store"
								>
									{stores.map((store) => (
										<option key={store.id} value={store.id}>
											{store.name}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="cart-list" aria-label="Ingredient list">
							{loadingProducts ? (
								<div className="cart-empty">
									<p className="cart-empty__title">Loading products…</p>
								</div>
							) : (
								products.map((product) => (
									<div key={product.id} className="ingredient-item">
										<div className="ingredient-item__info">
											<p className="ingredient-item__name">{product.name}</p>
											<p className="ingredient-item__meta">
												${(product.price ?? 0).toFixed(2)}{product.unit ? ` / ${product.unit}` : ""}
											</p>
											{(product.greenScore ?? product.overallScore) != null && (
												<span className="ingredient-item__badge">
													green {product.greenScore ?? product.overallScore}
												</span>
											)}
										</div>
										<button
											type="button"
											className="ingredient-item__add"
											onClick={() => handleAddIngredient(product)}
											aria-label={`Add ${product.name} to cart`}
										>
											+
										</button>
									</div>
								))
							)}
						</div>
					</div>

					<div className="cart-panel cart-panel--cart">
						<div className="cart-panel__header">
							<h2>Your Cart</h2>
							{cartItems.length > 0 && (
								<button type="button" className="cart-clear-all" onClick={handleClearCart}>
									Clear
								</button>
							)}
						</div>

						<div className="cart-panel__items">
							<div className="cart-list" aria-live="polite" aria-label="User cart items">
								{cartItems.length === 0 ? (
									<div className="cart-empty">
										<p className="cart-empty__title">Your cart is empty</p>
										<p className="cart-empty__text">Add ingredients from the list to get started.</p>
									</div>
								) : (
									cartItems.map((item) => (
										<div key={item.id} className="cart-item">
											<div className="cart-item__info">
												<p>{item.name}</p>
												<p className="cart-item__meta">
													${(item.price ?? 0).toFixed(2)}{item.unit ? ` / ${item.unit}` : ""}
												</p>
											</div>
											<div className="cart-item__actions">
												<button
													type="button"
													className="cart-item__remove"
													onClick={() => handleRemoveOneItem(item.id)}
													aria-label={`Remove one ${item.name}`}
												>
													-
												</button>
												<span className="cart-item__qty">{item.quantity}</span>
												<button
													type="button"
													className="cart-item__add"
													onClick={() => handleAddIngredient(item)}
													aria-label={`Add one ${item.name}`}
												>
													+
												</button>
												<button
													type="button"
													className="cart-item__clear"
													onClick={() => handleClearItem(item.id)}
													aria-label={`Clear ${item.name} from cart`}
												>
													clear
												</button>
											</div>
										</div>
									))
								)}
							</div>
						</div>

						<div className="cart-panel__footer">
							{cartItems.length > 0 && (
								<div className="cart-total">
									<div className="cart-total__row">
										<span>Total</span>
										<span>${cartTotal.toFixed(2)}</span>
									</div>
									<button
										type="button"
										className="cart-total__checkout"
										onClick={handleContinue}
										disabled={saving}
									>
										{saving ? "Saving…" : "Continue"}
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}

export default Cart;
