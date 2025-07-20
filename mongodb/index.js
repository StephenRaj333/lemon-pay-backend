const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

const ConnectDB = async () => {     
    try {   
       await mongoose.connect(MONGODB_URI).then(() => console.log("Connected to Mongo DB")); 
    } catch(err) {
        console.log("Error Connecting to Mongo DB",err); 
    }
}   

ConnectDB(); 

module.exports = ConnectDB; 