import { useState } from "react";
import { Link } from "react-router";
import Header from "./Home/Header";
import { api, saveAuth } from "../api";
import "./Login.css";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            // backend login accepts an "identifier" (username OR email)
            const data = await api.login(email.trim(), password);
            saveAuth(data);
            window.location.replace("/");
        } catch (err) {
            setError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">
            <Header />
            <div className="login-content">
                <p className="subheader">start shopping green today</p>
                <div className="login-card">
                    <div className="login-card__header">
                        <h2 id="login-title">login</h2>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <label htmlFor="email">email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="test@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />

                        <label htmlFor="password">password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="greenCart123"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />

                        <button type="submit" disabled={loading}>{loading ? "logging in…" : "login"}</button>
                    </form>

                    {error && <p>{error}</p>}

                    <p className="login-footer">
                        Don&apos;t have an account? <Link to="/signup">Sign up here</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

export default Login;