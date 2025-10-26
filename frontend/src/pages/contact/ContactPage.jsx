import React, { useState } from 'react'
import { FaEnvelope, FaHome, FaMap, FaMapMarked, FaMapPin, FaPhone } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { sendContactEmail } from '../../services/emailService'

const ContactPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.message) {
      toast.error('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send real email using email service
      console.log('Sending email to trucling03@gmail.com:', formData);
      
      const result = await sendContactEmail(formData);
      
      if (result.success) {
        toast.success('Gửi tin nhắn thành công! Chúng tôi sẽ phản hồi sớm nhất có thể. 📧');
      } else {
        throw new Error(result.message || 'Failed to send email');
      }
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        message: ''
      });

    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className='my-10 sm:my-20'>
    <div className="container px-4 sm:px-6 lg:px-12 mx-auto">
        <div className="text-center sm:text-left">
            <p className="font-medium text-tomato dark:text-orange-400">Liên hệ với chúng tôi</p>

            <h1 className="mt-2 text-2xl font-semibold text-secondary sm:text-3xl lg:text-4xl">Kết nối với đội ngũ Cookify</h1>

            <p className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400">Chúng tôi rất mong được lắng nghe ý kiến từ bạn. Hãy điền form dưới đây hoặc gửi email cho chúng tôi.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:gap-12 mt-8 sm:mt-10 lg:grid-cols-2">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 md:gap-12">
                <div>
                    <span className='p-2.5 text-tomato rounded-full bg-peachLight'><FaEnvelope className="inline-block "/></span>
                    

                    <h2 className="mt-4 text-base font-medium text-gray-800 dark:text-white">Email</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Đội ngũ hỗ trợ nhiệt tình của chúng tôi.</p>
                    <p className="mt-2 text-sm text-tomato dark:text-orange-400">trucling03@gmail.com</p>
                </div>

                <div>
                <span className='p-2.5 text-tomato rounded-full bg-peachLight'><FaMapMarked className="inline-block "/></span>
                    
                    <h2 className="mt-4 text-base font-medium text-gray-800 dark:text-white">Chat AI</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Trợ lý AI nấu ăn thông minh của chúng tôi.</p>
                    <p className="mt-2 text-sm text-tomato dark:text-orange-400">Bắt đầu chat ngay</p>
                </div>

                <div>
                <span className='p-2.5 text-tomato rounded-full bg-peachLight'><FaHome className="inline-block "/></span>
                    
                    <h2 className="mt-4 text-base font-medium text-gray-800 dark:text-white">Văn phòng</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ghé thăm trụ sở chính của chúng tôi.</p>
                    <p className="mt-2 text-sm text-tomato dark:text-orange-400">Trường Đại học Kiến Trúc Đà Nẵng</p>
                </div>

                <div>
                <span className='p-2.5 text-tomato rounded-full bg-peachLight'><FaPhone className="inline-block "/></span>
                    
                    <h2 className="mt-4 text-base font-medium text-gray-800 dark:text-white">Điện thoại</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Thứ 2 - Thứ 6 từ 8h đến 17h.</p>
                    <p className="mt-2 text-sm text-tomato dark:text-orange-400">0916082***</p>
                </div>
            </div>

            <div className="p-4 py-6 rounded-lg bg-gray-50 dark:bg-gray-800 md:p-8">
                <form onSubmit={handleSubmit}>
                    <div className="-mx-2 md:items-center md:flex">
                        <div className="flex-1 px-2">
                            <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Họ *</label>
                            <input 
                              type="text" 
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              placeholder="Nguyễn" 
                              required
                              className="block w-full px-5 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-400 focus:ring-orange-400 focus:outline-none focus:ring focus:ring-opacity-40" 
                            />
                        </div>

                        <div className="flex-1 px-2 mt-4 md:mt-0">
                            <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Tên *</label>
                            <input 
                              type="text" 
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              placeholder="Văn A" 
                              required
                              className="block w-full px-5 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-400 focus:ring-orange-400 focus:outline-none focus:ring focus:ring-opacity-40" 
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Địa chỉ email *</label>
                        <input 
                          type="email" 
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="nguyenvana@example.com" 
                          required
                          className="block w-full px-5 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-400 focus:ring-orange-400 focus:outline-none focus:ring focus:ring-opacity-40" 
                        />
                    </div>

                    <div className="w-full mt-4">
                        <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Tin nhắn *</label>
                        <textarea 
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          placeholder="Nhập tin nhắn của bạn..."
                          required
                          rows="6"
                          className="block w-full px-5 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg md:h-56 dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-400 focus:ring-orange-400 focus:outline-none focus:ring focus:ring-opacity-40"
                        ></textarea>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full px-6 py-3 mt-4 text-sm font-medium tracking-wide text-white transition-colors duration-300 transform rounded-lg focus:outline-none focus:ring focus:ring-orange-300 focus:ring-opacity-50 ${
                        isSubmitting 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                    >
                      {isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                    </button>
                </form>
            </div>
        </div>
    </div>
</section>
  )
}

export default ContactPage