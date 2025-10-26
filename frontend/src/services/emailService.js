/**
 * Email Service using EmailJS
 * Gửi email thật đến trucling03@gmail.com
 */

// EmailJS configuration
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_cookify', // Bạn sẽ tạo trên EmailJS
  TEMPLATE_ID: 'template_contact', // Bạn sẽ tạo trên EmailJS  
  PUBLIC_KEY: 'YOUR_EMAILJS_PUBLIC_KEY' // Bạn sẽ lấy từ EmailJS
};

// Fallback email service using Formspree (miễn phí, dễ setup)
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xdkpknba'; // Thay bằng form ID thật từ Formspree

/**
 * Send email using Formspree (Recommended - Easy setup)
 */
export const sendEmailViaFormspree = async (formData) => {
  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        message: formData.message,
        _subject: `Liên hệ từ website Cookify - ${formData.firstName} ${formData.lastName}`,
        _replyto: formData.email,
        _template: 'box'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Formspree error:', error);
    throw error;
  }
};

/**
 * Send email using EmailJS (Alternative)
 */
export const sendEmailViaEmailJS = async (formData) => {
  try {
    // Dynamically import EmailJS to avoid build issues
    const emailjs = await import('@emailjs/browser');
    
    const templateParams = {
      to_email: 'trucling03@gmail.com',
      from_name: `${formData.firstName} ${formData.lastName}`,
      from_email: formData.email,
      subject: `Liên hệ từ website Cookify - ${formData.firstName} ${formData.lastName}`,
      message: formData.message,
      reply_to: formData.email
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY
    );

    return { success: true, message: 'Email sent successfully', response };
  } catch (error) {
    console.error('EmailJS error:', error);
    throw error;
  }
};

/**
 * Send email using backend API (if you have one)
 */
export const sendEmailViaBackend = async (formData) => {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        to: 'trucling03@gmail.com'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    const result = await response.json();
    return { success: true, message: 'Email sent successfully', result };
  } catch (error) {
    console.error('Backend API error:', error);
    throw error;
  }
};

/**
 * Main email sending function with fallbacks
 */
export const sendContactEmail = async (formData) => {
  // Try Formspree first (easiest to setup)
  try {
    return await sendEmailViaFormspree(formData);
  } catch (error) {
    console.warn('Formspree failed, trying EmailJS...');
    
    // Fallback to EmailJS
    try {
      return await sendEmailViaEmailJS(formData);
    } catch (emailJSError) {
      console.warn('EmailJS failed, trying backend API...');
      
      // Final fallback to backend API
      try {
        return await sendEmailViaBackend(formData);
      } catch (backendError) {
        // All methods failed
        throw new Error('Không thể gửi email. Vui lòng thử lại sau hoặc liên hệ trực tiếp qua trucling03@gmail.com');
      }
    }
  }
};
