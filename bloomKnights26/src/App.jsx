import { Navigate, Route, Routes } from "react-router"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Home from "./pages/Home/Home"
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App