import Header from "./Home/Header";
import "./Dashboard.css";

function Dashboard() {
    return (
        <main className="dashboard-page">
            <Header />
            <div className="dashboard-shell">
                <h1>Dashboard</h1>
                <div className="dashboard-content">
                    <div className="rating">
                        
                    </div>
                </div>
            </div>
        </main>
    );
}

export default Dashboard;