import React, { useState } from 'react'
import { useSelector } from 'react-redux';
import MobileNav from './MobileNav';
import DesktopNav from './DesktopNav';
import logo from '/logo.svg'

const Header = () => {
    const [hideLeft, setHideLeft] = useState("-left-[1000px]");
    const { user } = useSelector((state) => state.auth);
    
    // Không hiển thị header cho admin
    if (user?.role === 'admin') {
        return null;
    }
    
    const menuItems = [
        { label: "Công thức", path: "recipes" },
        { label: "Gợi ý", path: "recommendations" },
        { label: "Cộng đồng", path: "blog" },
        { label: "Giới thiệu", path: "about" },
        { label: "Liên hệ", path: "contact" }
    ];
    
    const onOpen = () => {
      setHideLeft("left-0");
    };
    const onClose = () => {
      setHideLeft("-left-[1000px]");
    };
    
  return (
    <>
     <div className="max-[900px]:hidden">
        <DesktopNav menuItems={menuItems} logo={logo} />
      </div>
      <div className="min-[900px]:hidden">
        <MobileNav
          menuItems={menuItems}
          logo={logo}
          onClose={onClose}
          hideLeft={hideLeft}
          onOpen={onOpen}
        />
      </div>
      </>
  )
}

export default Header