import React from 'react'
import { useTheme } from '../context/ThemeContext'

export default function Header(){
  const { theme, toggleTheme } = useTheme();
  const logoSrc = theme === 'dark' ? '/makerspace_white.png' : '/makerspace_black.png';
  
  return (
    <div className="topbar">
      <div className="brand">
        <img src={logoSrc} alt="Makerspace logo" className="brand-logo" />
        
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
