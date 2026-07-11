import { useMemo, useState } from "react";
import Header from "./Home/Header";
import "./Cart.css";

const INGREDIENTS = [
	{ id: "avocado", name: "Avocado", category: "Produce", unit: "each", price: 1.5 },
	{ id: "tomatoes", name: "Tomatoes", category: "Produce", unit: "lb", price: 2.99 },
	{ id: "onion", name: "Yellow Onion", category: "Produce", unit: "each", price: 0.79 },
	{ id: "garlic", name: "Garlic", category: "Produce", unit: "head", price: 0.99 },
	{ id: "spinach", name: "Baby Spinach", category: "Produce", unit: "bag", price: 3.49 },
	{ id: "chicken", name: "Chicken Breast", category: "Protein", unit: "lb", price: 6.99 },
	{ id: "salmon", name: "Salmon Fillet", category: "Protein", unit: "lb", price: 12.99 },
	{ id: "tofu", name: "Firm Tofu", category: "Protein", unit: "block", price: 2.49 },
	{ id: "eggs", name: "Eggs", category: "Protein", unit: "dozen", price: 4.99 },
	{ id: "milk", name: "Whole Milk", category: "Dairy", unit: "gallon", price: 3.79 },
	{ id: "butter", name: "Butter", category: "Dairy", unit: "stick", price: 1.99 },
	{ id: "cheese", name: "Cheddar Cheese", category: "Dairy", unit: "block", price: 4.49 },
	{ id: "yogurt", name: "Greek Yogurt", category: "Dairy", unit: "cup", price: 1.49 },
	{ id: "rice", name: "Basmati Rice", category: "Pantry", unit: "lb", price: 2.29 },
	{ id: "pasta", name: "Spaghetti", category: "Pantry", unit: "box", price: 1.99 },
	{ id: "olive-oil", name: "Olive Oil", category: "Pantry", unit: "bottle", price: 8.99 },
	{ id: "flour", name: "All-Purpose Flour", category: "Pantry", unit: "lb", price: 1.89 },
	{ id: "sugar", name: "Granulated Sugar", category: "Pantry", unit: "lb", price: 1.99 },
	{ id: "salt", name: "Sea Salt", category: "Pantry", unit: "container", price: 2.99 },
	{ id: "bread", name: "Sourdough Bread", category: "Bakery", unit: "loaf", price: 5.49 },
	{ id: "bagels", name: "Bagels", category: "Bakery", unit: "pack", price: 4.29 },
	{ id: "bananas", name: "Bananas", category: "Produce", unit: "bunch", price: 1.29 }
];

const STORE_OPTIONS = ["Walmart", "Target", "Publix"];

function Cart() {
	const [progress, setProgress] = useState(0);
	const [cart, setCart] = useState({});
	const [selectedStore, setSelectedStore] = useState(STORE_OPTIONS[0]);

	const filteredIngredients = useMemo(() => INGREDIENTS, []);
	const cartItems = useMemo(() => Object.values(cart), [cart]);
	const cartTotal = useMemo(
		() => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
		[cartItems]
	);

	function incrementProgress() {
		setProgress((currentProgress) => Math.min(currentProgress + 10, 100));
	}

	function decrementProgress() {
		setProgress((currentProgress) => Math.max(currentProgress - 10, 0));
	}

	function handleAddIngredient(ingredient) {
		incrementProgress();
		setCart((previousCart) => {
			const existingItem = previousCart[ingredient.id];

			return {
				...previousCart,
				[ingredient.id]: {
					...ingredient,
					quantity: existingItem ? existingItem.quantity + 1 : 1
				}
			};
		});
	}

	function handleRemoveOneItem(itemId) {
		decrementProgress();
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
		decrementProgress();
		setCart((previousCart) => {
			const updatedCart = { ...previousCart };
			delete updatedCart[itemId];
			return updatedCart;
		});
	}

	function handleClearCart() {
		setProgress(0);
		setCart({});
	}

	return (
		<main className="cart-page">
			<Header />
			<section className="cart-layout">
				<div className="cart-top-panel">
					<h1>Green Meter</h1>
					<p>Measures the average green rating of your cart!</p>
					<div className="cart-progress" aria-label="Cart loading progress">
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
									{STORE_OPTIONS.map((store) => (
										<option key={store} value={store}>
											{store}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="cart-list" aria-label="Ingredient list">
							{filteredIngredients.map((ingredient) => (
								<div key={ingredient.id} className="ingredient-item">
									<div className="ingredient-item__info">
										<p className="ingredient-item__name">{ingredient.name}</p>
										<p className="ingredient-item__meta">
											${ingredient.price.toFixed(2)} / {ingredient.unit}
										</p>
										<span className="ingredient-item__badge">{ingredient.category}</span>
									</div>
									<button
										type="button"
										className="ingredient-item__add"
										onClick={() => handleAddIngredient(ingredient)}
										aria-label={`Add ${ingredient.name} to cart`}
									>
										+
									</button>
								</div>
							))}
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
													${item.price.toFixed(2)} / {item.unit}
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
									<button type="button" className="cart-total__checkout">
										Continue
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
