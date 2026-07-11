import { Link } from "react-router"
import "./Header.css";

function Header() {
    function handleLogout() {
        localStorage.removeItem("isLoggedIn");
        window.location.replace("/login");
    }

    return (
        <header className="header">
            <h1 className="header__title">Bloom Knights</h1>
            <nav className="header__nav">
                <Link to="/" className="header__link">Home</Link>
                <Link to="/signup" className="header__link">Sign Up</Link>
                <Link to="/login" className="header__link">Login</Link>
                <Link to="/login" className="header__link" onClick={handleLogout}>Logout</Link>
            </nav>
        </header>
    );
}

export default Header;
