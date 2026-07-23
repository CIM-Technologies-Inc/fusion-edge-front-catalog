import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Library from './pages/Library'
import Dashboard from './pages/Dashboard'
import SignIn from './pages/SignIn'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="library" element={<Library />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="signin" element={<SignIn />} />
        <Route path="*" element={<p className="muted">Page not found.</p>} />
      </Route>
    </Routes>
  )
}
