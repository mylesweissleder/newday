import React from 'react'
  import { Routes, Route } from 'react-router-dom'
  import SiteAccessGate from './components/SiteAccessGate'
  import LoginPage from './pages/LoginPage'

  function App() {
    return (
      <SiteAccessGate>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </SiteAccessGate>
    )
  }

  export default App
