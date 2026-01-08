import React from 'react'
import { useTheme } from '../context/ThemeContext'

export default function Header(){
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="topbar">
      <div className="brand">
        <div className="logo">MS</div>
        <h1>Makerspace</h1>
      </div>
      <div className="nav-actions">
        <button 
          className="btn btn-ghost small" 
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  )
}
