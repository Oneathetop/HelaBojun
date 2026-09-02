const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

exports.loginAdmin = async (req, res) => {
    const { username, password } = req.body;
    
    // 🔍 DEBUG LINE 1: See what Thunder Client is sending
    console.log("\n--- [LOGIN DEBUG START] ---");
    console.log("1. Payload received from client:", { username, password });

    try {
        const admin = await Admin.findOne({ username });
        
        // 🔍 DEBUG LINE 2: See if Mongoose can find the admin document
        if (!admin) {
            console.log("2. ERROR: Admin username NOT found in MongoDB!");
            console.log("--- [LOGIN DEBUG END] ---\n");
            return res.status(401).json({ success: false, message: 'Invalid administrative credentials' });
        }
        
        console.log("2. SUCCESS: Admin found in DB! Saved Password in DB is:", admin.password);

        const isMatch = await admin.comparePassword(password);
        
        // 🔍 DEBUG LINE 3: See if Bcrypt thinks they match
        console.log("3. Bcrypt Comparison Result:", { isMatch });
        console.log("--- [LOGIN DEBUG END] ---\n");

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid administrative credentials' });
        }

        // Generate JSON Web Token (JWT)
        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            success: true,
            token,
            admin: { name: admin.name, username: admin.username, role: admin.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};