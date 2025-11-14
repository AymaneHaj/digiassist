import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
        index: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
    },
    company_name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
    sector: {
        type: String,
        required: [true, 'Sector is required'],
        enum: [
            'Technologie',
            'Commerce',
            'Services',
            'Industrie',
            'Santé',
            'Éducation',
            'Finance',
            'Immobilier',
            'Transport',
            'Tourisme',
            'Agriculture',
            'Autre'
        ],
    },
    company_size: {
        type: String,
        required: [true, 'Company size is required'],
        enum: [
            'Micro (1-5 employés)',
            'Petite (6-20 employés)',
            'Moyenne (21-50 employés)',
            'Grande (51-200 employés)',
            'Très grande (201+ employés)'
        ],
    },
    total_score: {
        type: Number,
        default: 0,
    },
    answered_questions: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });


UserSchema.pre('save', async function (next) {
    // Hash the password only if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10); // Generate a salt
        this.password = await bcrypt.hash(this.password, salt); // Hash the password
        next();
    } catch (error) {
        next(error); // Pass error to the next middleware
    }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

export const User = mongoose.model('User', UserSchema);