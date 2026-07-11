import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import Header from './Header';
import { api } from "../../api";
import "./Home.css"

// Cart page reads this to preload the AI's picks.
export const AI_SUGGESTION_STORAGE_KEY = "aiSuggestion";

function formatSuggestion(result) {
    const lines = (result.picks || []).map((pick) => {
        const price = pick.price != null ? ` — $${pick.price.toFixed(2)}` : "";
        const why = pick.greenExplanation ? `\n   ${pick.greenExplanation}` : "";
        return `• ${pick.name}${price}${why}`;
    });

    const total = result.totalCost != null ? `\n\nEstimated total: $${result.totalCost.toFixed(2)}` : "";
    return `${result.summary}\n\n${lines.join("\n")}${total}\n\nTaking you to your cart…`;
}

function Home() {
    const [draftMessage, setDraftMessage] = useState("");
    const [sending, setSending] = useState(false);
    const messagesContainerRef = useRef(null);
    const navigationTimerRef = useRef(null);
    const navigate = useNavigate();
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

    useEffect(() => {
        return () => {
            if (navigationTimerRef.current) {
                clearTimeout(navigationTimerRef.current);
            }
        };
    }, []);

    function appendMessage(role, text) {
        setMessages((currentMessages) => [
            ...currentMessages,
            { id: Date.now() + Math.random(), role, text }
        ]);
    }

    async function handleSubmit(event) {
        event.preventDefault()
        const trimmedMessage = draftMessage.trim();

        if (!trimmedMessage || sending) {
            return;
        }

        appendMessage("user", trimmedMessage);
        appendMessage("bot", "gathering your ingredients...");
        setDraftMessage("");
        setSending(true);

        try {
            const result = await api.suggest(trimmedMessage);

            if (!result.picks?.length) {
                appendMessage("bot", "I couldn't find matching products for that — try describing the meal differently.");
                return;
            }

            // Cart page preloads these picks.
            localStorage.setItem(AI_SUGGESTION_STORAGE_KEY, JSON.stringify(result));

            appendMessage("bot", formatSuggestion(result));

            navigationTimerRef.current = window.setTimeout(() => {
                navigate("/cart");
            }, 2500);
        } catch (err) {
            appendMessage("bot", `Something went wrong: ${err.message}. Please try again.`);
        } finally {
            setSending(false);
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
                    <button type="submit" disabled={sending}>{sending ? "thinking…" : "send"}</button>
                </form>
            </section>
        </div>
    </main>
    );
}

export default Home;
