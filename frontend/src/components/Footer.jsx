import React from 'react'
import { Link } from 'react-router-dom'
import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa'

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Logo & Description */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="Cookify" className="h-8" />
            </Link>
            <p className="mt-4 text-sm text-gray-600 max-w-xs">
              Khám phá và chia sẻ những công thức nấu ăn ngon miệng từ khắp nơi trên thế giới.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Khám phá</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/recipes" className="text-gray-600 hover:text-btnColor transition">
                  Công thức
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 hover:text-btnColor transition">
                  Về chúng tôi
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-600 hover:text-btnColor transition">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Kết nối với chúng tôi</h3>
            <div className="flex gap-4">
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 hover:text-btnColor transition"
              >
                <FaFacebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 hover:text-btnColor transition"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 hover:text-btnColor transition"
              >
                <FaTwitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            &copy; {new Date().getFullYear()} Cookify. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer