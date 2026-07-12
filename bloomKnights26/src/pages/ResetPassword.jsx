import { useState } from "react";
import { Link, useParams } from "react-router";
import Header from "./Home/Header";
import { api } from "../api";
import "./Login.css";

// Landing page for the reset link emailed by forgot-password:
//   {CLIENT_URL}/reset-password/:token  ->  POST /api/auth/reset-password/:token
function ResetPassword() {
    const { token } = useParams();
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            const data = await api.resetPassword(token, password);
            setMessage(data.message || "Password reset successfully.");
            setDone(true);
        } catch (err) {
            setError(err.message || "Reset link is invalid or has expired.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">
            <Header />
            <div className="login-content">
                <p className="subheader">pick something memorable</p>
                <div className="login-card">
                    <div className="login-card__header">
                        <h2>reset password</h2>
                    </div>

                    {done ? (
                        <>
                            <p>{message}</p>
                            <p className="login-footer">
                                <Link to="/login">Log in with your new password</Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <form className="login-form" onSubmit={handleSubmit}>
                                <label htmlFor="password">new password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    placeholder="at least 8 characters"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                />
                                <button type="submit" disabled={loading}>
                                    {loading ? "resetting…" : "reset password"}
                                </button>
                            </form>

                            {error && <p>{error}</p>}

                            <p className="login-footer">
                                <Link to="/login">Back to login</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}

export default ResetPassword;
