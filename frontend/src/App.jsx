import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './App.css'
import Header from './components/header/Header';
import Footer from './components/Footer';
import ChatBot from './components/chatbot/ChatBot';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { useSelector } from 'react-redux';

function App() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  
  // Ẩn header, footer và chatbot cho trang đăng nhập và đăng ký
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  // Ẩn footer cho admin pages và profile pages
  const isAdminPage = location.pathname.startsWith('/dashboard');
  const isProfilePage = location.pathname === '/profile' || location.pathname === '/edit-profile' || location.pathname === '/favourites';

  return (
    <FavoritesProvider>
      <div className='max-w-screen-2xl mx-auto'>
        {!isAuthPage && <Header />}
        <div className={isAuthPage ? "min-h-screen" : "min-h-[calc(100vh-136px)]"}>
          <Outlet />
        </div>
        {!isAuthPage && !isAdminPage && !isProfilePage && <Footer/>}
        {!isAuthPage && <ChatBot />}
      </div>
    </FavoritesProvider>
  )
}

export default App
