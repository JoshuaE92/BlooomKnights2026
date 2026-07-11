import { Link } from "react-router"
import Header from "./Home/Header"
import "./Signup.css"

function Signup() {
    function handleSubmit(event) {
        event.preventDefault()
        localStorage.setItem("isLoggedIn", "true")
        window.location.replace("/")
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
                        <input type="text" id="username" name="username" placeholder="test@example.com" />

                        <label htmlFor="password">password</label>
                        <input type="password" id="password" name="password" placeholder="greenCart123" />

                        <button type="submit">sign up</button>
                    </form>

                    <p className="signup-footer">
                        Already have an account? <Link to="/login">Log in here</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

export default Signup;
