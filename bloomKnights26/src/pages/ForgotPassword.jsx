import { useState } from "react";
import { Link } from "react-router";
import Header from "./Home/Header";
import { api } from "../api";
import "./Login.css";

// Sends the password-reset email. The emailed link lands on /reset-password/:token.
function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const data = await api.forgotPassword(email.trim());
            setMessage(data.message || "If an account exists for that email, a reset link has been sent.");
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">
            <Header />
            <div className="login-content">
                <p className="subheader">we all forget sometimes</p>
                <div className="login-card">
                    <div className="login-card__header">
                        <h2>forgot password</h2>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <label htmlFor="email">email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? "sending…" : "send reset link"}
                        </button>
                    </form>

                    {message && <p>{message}</p>}
                    {error && <p>{error}</p>}

                    <p className="login-footer">
                        Remembered it? <Link to="/login">Log in here</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

export default ForgotPassword;
