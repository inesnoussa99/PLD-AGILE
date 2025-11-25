import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import DashboardLayout from './Dashboardlayout';

// frontend/src/App.jsx
function App() {
  return (
    <div className="min-w-screen min-h-screen bg-gray-100 flex items-center justify-center">
      <DashboardLayout/>
    </div>
  );
}

export default App;