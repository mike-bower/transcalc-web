import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MaterialLibraryProvider } from './components/MaterialContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MaterialLibraryProvider>
      <App />
    </MaterialLibraryProvider>
  </React.StrictMode>
)
