import { Routes, Route, Link } from "react-router"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import "./App.css"

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </>
  )
}

export default App