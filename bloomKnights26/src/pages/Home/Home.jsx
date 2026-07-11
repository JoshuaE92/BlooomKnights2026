import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import Header from './Header';
import { api } from "../../api";
import "./Home.css"

function Home() {
    const [draftMessage, setDraftMessage] = useState("");
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

    function handleSubmit(event) {
        event.preventDefault()
        const trimmedMessage = draftMessage.trim();

        if (!trimmedMessage) {
            return;
        }

        setMessages((currentMessages) => [
            ...currentMessages,
            {
                id: Date.now(),
                role: "user",
                text: trimmedMessage
            },
            {
                id: Date.now() + 1,
                role: "bot",
                text: "gathering your ingredients..."
            }
        ]);
        setDraftMessage("");

        if (navigationTimerRef.current) {
            clearTimeout(navigationTimerRef.current);
        }

        navigationTimerRef.current = window.setTimeout(() => {
            navigate("/cart");
        }, 1500);
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