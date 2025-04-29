const mongoose = require("mongoose");
const Listing = require("./models/listing.js"); // Apne model ka correct path do

mongoose.connect("mongodb://127.0.0.1:27017/wanderlust", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const updateListings = async () => {
    try {
        // Sabhi listings fetch karo
        const listings = await Listing.find({});
        
        for (let listing of listings) {
            // Random categories assign karne ke liye ek array
            const categories = ["trending", "rooms", "iconic-cities", "mountains", "castles", "amazing-pools", "camping", "farms"];
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];

            // Category update karo
            listing.category = randomCategory;
            await listing.save();
        }
        
        console.log("✅ All listings updated with categories!");
        mongoose.connection.close();
    } catch (err) {
        console.error("❌ Error updating listings:", err);
        mongoose.connection.close();
    }
};

updateListings();

