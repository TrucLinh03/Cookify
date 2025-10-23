const User = require('../model/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET_KEY;

// Debug: Check if JWT_SECRET is loaded
console.log('JWT_SECRET loaded:', !!JWT_SECRET);
if (!JWT_SECRET) {
  console.error('JWT_SECRET_KEY not found in environment variables');
}

// Đăng ký tài khoản mới
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      // Log for debug
      console.log("Registration failed: email already exists", email);
      return res.status(400).json({ message: "User already exists" });
    }

    // Only assign the plain password, let the model's pre('save') handle hashing
    const role = email === "trucling03@gmail.com" ? "admin" : "user";
    const user = new User({ name, email, password, role });
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Đăng nhập
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Kiểm tra tài khoản có bị cấm không
    if (user.status === 'banned') {
      return res.status(403).json({ 
        success: false,
        message: "Tài khoản của bạn đã bị cấm. Vui lòng liên hệ admin để được hỗ trợ." 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

module.exports = { registerUser, loginUser };
