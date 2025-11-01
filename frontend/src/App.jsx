import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './App.css'
import Header from './components/header/Header';
import Footer from './components/Footer';
import ChatBot from './components/chatbot/ChatBot';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  
  // Ẩn header, footer và chatbot cho trang đăng nhập và đăng ký
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  // Ẩn footer cho admin pages và profile pages
  const isAdminPage = location.pathname.startsWith('/dashboard');
  const isProfilePage = location.pathname === '/profile' || location.pathname === '/edit-profile' || location.pathname === '/favourites' || location.pathname === '/my-blogs';
  const isBlogCreateEditPage = location.pathname === '/blog/create' || location.pathname.startsWith('/edit-blog/');

  return (
    <FavoritesProvider>
      <div className='max-w-screen-2xl mx-auto'>
        {!isAuthPage && <Header />}
        <div className={isAuthPage ? "min-h-screen" : "min-h-[calc(100vh-136px)]"}>
          <Outlet />
        </div>
        {!isAuthPage && !isAdminPage && !isProfilePage && !isBlogCreateEditPage && <Footer/>}
        {!isAuthPage && <ChatBot />}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </FavoritesProvider>
  )
}

export default App
