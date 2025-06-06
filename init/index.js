const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
main()
    .then(() => {
        console.log("connected successfully");
    })
    .catch(err => console.log(err));

async function main() {
    await mongoose.connect(MONGO_URL);

}

const initDB=async()=>{
    await Listing.deleteMany({});
    initData.data=initData.data.map((obj)=>({...obj,owner:"67ac690a725a28d9d0d67dbf"}))
    await Listing.insertMany(initData.data);
    console.log("data was initialied");
}
initDB();
