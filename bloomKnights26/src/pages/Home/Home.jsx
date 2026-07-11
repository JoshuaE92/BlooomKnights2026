import { useEffect, useRef, useState } from "react";
import Header from './Header';
import { api } from "../../api";
import "./Home.css"

function Home() {
    const [draftMessage, setDraftMessage] = useState("");
    const messagesContainerRef = useRef(null);
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: "bot",
            text: "Hello, send a meal you would like to cook and I will provide you with a renewable ingredient list"
        }
    ]);

    useEffect(() => {
        if (!messagesContainerRef.current) {
            return;
        }

        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }, [messages]);

    async function handleSubmit(event) {
        event.preventDefault()
        const trimmedMessage = draftMessage.trim();

        if (!trimmedMessage) {
            return;
        }

        setMessages((currentMessages) => [
            ...currentMessages,
            { id: Date.now(), role: "user", text: trimmedMessage },
            { id: "loading", role: "bot", text: "Finding greener ingredients…" }
        ]);
        setDraftMessage("");

        try {
            // no stores => search all stores; backend picks by overallScore
            const res = await api.suggest(trimmedMessage);

            const lines = res.picks?.length
                ? res.picks
                      .map((p) => `• ${p.name} — ${p.store}${p.price != null ? ` · $${p.price}` : ""}${p.overallScore != null ? ` · score ${p.overallScore}` : ""}`)
                      .join("\n")
                : "I couldn't find matching products for that.";

            const summary = res.picks?.length
                ? `\n\nTotal: $${res.totalCost} · avg score ${res.avgOverallScore}`
                : "";

            const text = `Here's a greener cart for "${trimmedMessage}":\n${lines}${summary}`;

            setMessages((cur) => [
                ...cur.filter((m) => m.id !== "loading"),
                { id: Date.now() + 1, role: "bot", text }
            ]);
        } catch (err) {
            const msg = /not authorized|token/i.test(err.message)
                ? "Please log in again to use the chat."
                : err.message;
            setMessages((cur) => [
                ...cur.filter((m) => m.id !== "loading"),
                { id: Date.now() + 1, role: "bot", text: `⚠️ ${msg}` }
            ]);
        }
    }

    function handleTextareaKeyDown(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
        }
    }

    return (
    <main className="home-page">
        <Header />
        <div className="home-content">
            <p className="home-subheader">start your recipe chat</p>
            <section className="chatbot-card" aria-labelledby="chatbot-title">
                <div className="chatbot-card__header">
                    <h2 id="chatbot-title">Dr. Green :0</h2>
                    <p>Enter a meal you would like to cook</p>
                </div>
                <div className="chatbot-card__messages" aria-live="polite" ref={messagesContainerRef}>
                    {messages.map((message) => (
                        <p
                            key={message.id}
                            className={`chatbot-card__message chatbot-card__message--${message.role}`}
                            style={{ whiteSpace: "pre-line" }}
                        >
                            {message.text}
                        </p>
                    ))}
                </div>
                <form className="chatbot-form" onSubmit={handleSubmit}>
                    <label htmlFor="chatbot-message">You:</label>
                    <textarea
                        id="chatbot-message"
                        name="chatbot-message"
                        placeholder="Ask about ingredients, recipes, or swaps"
                        rows="3"
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        onKeyDown={handleTextareaKeyDown}
                    />
                    <button type="submit">send</button>
                </form>
            </section>
        </div>
    </main>
    );
}

export default Home;