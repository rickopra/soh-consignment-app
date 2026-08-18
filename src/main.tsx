import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const storedTheme = window.localStorage.getItem('soh-theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.classList.toggle('dark', storedTheme === 'dark' || (!storedTheme && prefersDark))

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
