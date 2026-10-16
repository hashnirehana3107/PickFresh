const mongoose = require('mongoose');
const fs = require('fs');
const URI = 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

mongoose.connect(URI).then(async () => {
    const CategorySchema = new mongoose.Schema({}, { strict: false });
    const Category = mongoose.model('Category', CategorySchema, 'categories');
    const cats = await Category.find({}).lean();
    const lines = cats.map(c => 'name=' + c.name + ' | emoji=' + (c.fallbackEmoji || 'N/A'));
    fs.writeFileSync('cats.txt', lines.join('\n'));
    console.log('Written to cats.txt - ' + cats.length + ' categories');
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
