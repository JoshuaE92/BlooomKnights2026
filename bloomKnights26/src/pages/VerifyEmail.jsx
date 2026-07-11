import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import Header from "./Home/Header";
import { api } from "../api";
import "./Login.css";

// Landing page for the verification link emailed on signup:
//   {CLIENT_URL}/verify-email/:token  ->  GET /api/auth/verify-email/:token
function VerifyEmail() {
    const { token } = useParams();
    const [status, setStatus] = useState("verifying"); // verifying | success | error
    const [message, setMessage] = useState("");
    const requestedRef = useRef(false);

    useEffect(() => {
        // Guard against React StrictMode double-invoking the effect — the
        // token is single-use, so the second call would report a false error.
        if (requestedRef.current) return;
        requestedRef.current = true;

        api.verifyEmail(token)
            .then((data) => {
                setStatus("success");
                setMessage(data.message || "Email verified successfully.");
            })
            .catch((err) => {
                setStatus("error");
                setMessage(err.message || "Verification link is invalid or has expired.");
            });
    }, [token]);

    return (
        <main className="login-page">
            <Header />
            <div className="login-content">
                <p className="subheader">one quick check</p>
                <div className="login-card">
                    <div className="login-card__header">
                        <h2>verify email</h2>
                    </div>

                    {status === "verifying" && <p>Verifying your email…</p>}
                    {status !== "verifying" && <p>{message}</p>}

                    {status === "success" && (
                        <p className="login-footer">
                            <Link to="/login">Log in to get started</Link>
                        </p>
                    )}
                    {status === "error" && (
                        <p className="login-footer">
                            <Link to="/login">Back to login</Link>
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}

export default VerifyEmail;
