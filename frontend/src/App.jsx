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
  
  // Ẩn header và footer cho trang đăng nhập và đăng ký
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <FavoritesProvider>
      <div className='max-w-screen-2xl mx-auto'>
        {!isAuthPage && <Header />}
        <div className="min-h-[calc(100vh-136px)]">
          <Outlet />
        </div>
        {!isAuthPage && user?.role !== 'admin' && <Footer/>}
        <ChatBot />
      </div>
    </FavoritesProvider>
  )
}

export default App
