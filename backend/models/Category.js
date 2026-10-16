const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    image: { type: String, default: '' },
    fallbackEmoji: { type: String, default: '📦' },
    color: { type: String, default: '#E3F2FD' },
    textColor: { type: String, default: '#1565C0' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
