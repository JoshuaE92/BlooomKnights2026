import Header from "./Home/Header";
import "./Dashboard.css";

function Dashboard() {
    return (
        <main className="dashboard-page">
            <Header />
            <div className="dashboard-shell">
                <h1>Dashboard</h1>
                <div className="dashboard-content">
                    <div className="dashboard-section">
                        <div className="dashboard-section__header">
                            <h2>Your Impact</h2>
                        </div>
                        <p className="dashboard-section__description">
                            Track eco-friendly purchases and estimated carbon savings.
                        </p>
                        <div className="dashboard-placeholder" aria-hidden="true" />
                    </div>
                    <div className="dashboard-section">
                        <div className="dashboard-section__header">
                            <h2>Past Carts</h2>
                        </div>
                        <p className="dashboard-section__description">
                            Review your most recent carts.
                        </p>
                        <div className="dashboard-placeholder" aria-hidden="true" />
                    </div>
                </div>
            </div>
        </main>
    );
}

export default Dashboard;