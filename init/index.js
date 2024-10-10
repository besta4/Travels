const mongoose=require("mongoose");
const initData=require("./data.js");
const Listing = require("../models/listing.js");

const mongourl="mongodb://127.0.0.1:27017/travels";

main().then(()=>{
    console.log("connected to db");
}).catch(err=>{
    console.log(err);
});

async function main(){
    await mongoose.connect(mongourl);
}

const initdb=async()=>{
    await Listing.deleteMany({});
    initData.data=initData.data.map((obj)=>({...obj,
        owner:"6700dfe339536d8bac05642e",}));
    await Listing.insertMany(initData.data);
    console.log("data was initialized");
};

initdb();
