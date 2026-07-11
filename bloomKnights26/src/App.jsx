import { Navigate, Route, Routes } from "react-router"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Home from "./pages/Home/Home"
import Dashboard from "./pages/Dashboard"
import Cart from "./pages/Cart"
import VerifyEmail from "./pages/VerifyEmail"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import "./App.css"

const isLoggedIn = () => localStorage.getItem("isLoggedIn") === "true"

function App() {

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={isLoggedIn() ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={isLoggedIn() ? <Navigate to="/" replace /> : <Login />}
        />
        <Route path="/signup" element={<Signup />} />
        {/* Email-link landing pages — must stay public (users arrive logged out) */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={isLoggedIn() ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/cart"
          element={isLoggedIn() ? <Cart /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App