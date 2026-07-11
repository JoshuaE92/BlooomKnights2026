import Header from './Header';
import "./Home.css"

function Home() {
    return (
    <main className="home-page">
        <Header />
        <div className="home-content">
            <p className="home-subheader">start your recipe chat</p>
            <section className="chatbot-card" aria-labelledby="chatbot-title">
                <div className="chatbot-card__header">
                    <h2 id="chatbot-title">recipe chatbot</h2>
                    <p>Ask for ingredients, substitutions, or meal ideas.</p>
                </div>
                <div className="chatbot-card__messages" aria-live="polite">
                    <p className="chatbot-card__message chatbot-card__message--bot">
                        Hi, I can help you build a recipe from what you have on hand.
                    </p>
                </div>
                <form className="chatbot-form">
                    <label htmlFor="chatbot-message">message</label>
                    <textarea
                        id="chatbot-message"
                        name="chatbot-message"
                        placeholder="Ask about ingredients, recipes, or swaps"
                        rows="3"
                    />
                    <button type="submit">send</button>
                </form>
            </section>
        </div>
    </main>
    );
}

export default Home;