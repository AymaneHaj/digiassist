import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

export const register = async (req, res) => {
    try {
        const { email, password, company_name, sector, company_size } = req.body;

        console.log('📝 Registration attempt for:', email);

        // Validate required fields
        if (!email || !password || !company_name || !sector || !company_size) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('⚠️ User already exists:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new user
        const user = new User({ 
            email, 
            password, 
            company_name, 
            sector, 
            company_size 
        });
        
        console.log('💾 Saving user to database...');
        await user.save();
        console.log('✅ User saved successfully!');
        console.log('📊 User ID:', user._id);
        
        // Get database name from mongoose connection
        const dbName = mongoose.connection.db?.databaseName || 'Unknown';
        console.log('📊 Database:', dbName);

        // Verify the user was saved
        const savedUser = await User.findById(user._id);
        if (savedUser) {
            console.log('✅ User verified in database:', savedUser.email);
        } else {
            console.error('❌ User not found after save!');
        }

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            message: 'User registered successfully',
            user: { 
                id: user._id, 
                email: user.email,
                company_name: user.company_name,
                sector: user.sector,
                company_size: user.company_size,
                total_score: user.total_score || 0,
                answered_questions: user.answered_questions || 0
            },
            token
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: errors.join(', ') });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            user: { 
                id: user._id, 
                email: user.email,
                company_name: user.company_name,
                total_score: user.total_score || 0,
                answered_questions: user.answered_questions || 0
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user._id,
            email: user.email,
            company_name: user.company_name,
            sector: user.sector,
            company_size: user.company_size,
            total_score: user.total_score || 0,
            answered_questions: user.answered_questions || 0
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
};