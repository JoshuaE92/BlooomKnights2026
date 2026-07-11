import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Header from "./Home/Header";
import "./Login.css";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    function handleSubmit(event) {
        event.preventDefault();

        const correctEmail = "test@example.com";
        const correctPassword = "password123";

        if (email === correctEmail && password === correctPassword) {
            setError("");
            localStorage.setItem("isLoggedIn", "true");
            navigate("/");
        } else {
            setError("Incorrect email or password.");
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
                            placeholder="Enter your email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />

                        <label htmlFor="password">password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />

                        <button type="submit">login</button>
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