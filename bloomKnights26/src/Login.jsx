import "./Login.css"

function Login() {
    return (
    <main className="login-page">
        <h1 className="header">Green Cart.</h1>
        <p className="subheader">start shopping green today</p>
        <div className="login-card">
            <div className="login-card__header">
                <h2 id="login-title">login</h2>
            </div>

            <form className="login-form">
                <label htmlFor="username">username</label>
                <input type="text" id="username" name="username" placeholder="Enter your username" />

                <label htmlFor="password">password</label>
                <input type="password" id="password" name="password" placeholder="Enter your password" />

                <button type="submit">login</button>
            </form>

            <p className="login-footer">
                Don&apos;t have an account? <a href="/signup">Sign up here</a>
            </p>
        </div>
    </main>
    );
}

export default Login;