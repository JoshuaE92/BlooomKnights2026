import { useState } from "react"
import { Link } from "react-router"
import Header from "./Home/Header"
import { api, saveAuth } from "../api"
import "./Signup.css"

function Signup() {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setError("")
        setLoading(true)
        try {
            // register returns a token immediately (email verification optional)
            const data = await api.register(username.trim(), email.trim(), password)
            saveAuth(data)
            window.location.replace("/")
        } catch (err) {
            setError(err.message || "Sign up failed.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="signup-page">
            <Header />
            <div className="signup-content">
                <p className="subheader">start shopping green today</p>
                <div className="signup-card">
                    <div className="signup-card__header">
                        <h2 id="signup-title">sign up</h2>
                    </div>

                    <form className="signup-form" onSubmit={handleSubmit}>
                        <label htmlFor="username">username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            placeholder="greenshopper"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <label htmlFor="email">email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <label htmlFor="password">password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="at least 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <button type="submit" disabled={loading}>{loading ? "creating…" : "sign up"}</button>
                    </form>

                    {error && <p className="signup-error">{error}</p>}

                    <p className="signup-footer">
                        Already have an account? <Link to="/login">Log in here</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

export default Signup;
