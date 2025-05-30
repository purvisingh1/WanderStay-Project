

if(process.env.NODE_ENV!="production"){require('dotenv').config()}
//console.log(process.env);

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const listingRouter=require("./routes/listing.js");
const reviewRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");
const session=require("express-session");
const MongoStore = require('connect-mongo');
const flash=require("connect-flash");
const passport= require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");


const dbUrl=process.env.ATLASDB_URL;
main()
    .then(() => {
        console.log("connected successfully");
    })
    .catch(err => console.log(err));

async function main() {
    await mongoose.connect(dbUrl)
}


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));


app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));



// for using static files
app.use(express.static(path.join(__dirname,"/public")));



// use ejs-locals for all ejs templates:
app.engine('ejs', ejsMate);

const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET
    },
    touchAfter:24*3600,
})

store.on("error",()=>{
    console.log("ERROR in MONGO SESSION STORE",err);
})

const sessionOptions={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()*7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true
    }
}
/*app.get("/", (req, res) => {
    res.send("hi i am root");
})*/


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// use static authenticate method of model in LocalStrategy
passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
   // console.log(res.locals.success)
    next();
})

app.get("/demouser",async(req,res)=>{
    let fakeuser=new User({
        email:"student@gmail.com",
        username:"delta-student"
    })
   let registeredUser=await User.register(fakeuser,"helloworld");
   res.send(registeredUser);
})

//api

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);



//app.get("/testListing",async(req,res)=>{
//let sampleListing = new Listing({
   // title:"My New Villa",
    //description:"By the beach",
    //price:1200,
    //location:"Calangute,Goa",
    //Country:"India"
//});




//handling error for  route which does not exist
app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page not found!"));
         
})

//Custom Error Handler
/*app.use((err, req, res, next) => {
    //order of parameters should be same
   let{statusCode=500,message="Something went wrong!"}=err;
  res.status(statusCode).render("error.ejs",{message});
 //  res.status(statusCode).send(message);
    //res.status(500).send("Something went wrong!");
});*/

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    if (res.headersSent) {
        return next(err); // Prevents multiple responses
    }
    res.status(statusCode).render("error.ejs", { message });
});


app.listen(8080, () => {
    console.log("app listening on port 8080");
})