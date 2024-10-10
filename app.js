if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
// const Listing=require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
// const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
// const {listingSchema,reviewSchema}=require("./schema.js");
// const Review=require("./models/review.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const user = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const dburl = process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dburl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
  mongoUrl: dburl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", () => {
  console.log("ERROR IN MONGO SESSION STORE", err);
});

const sessionOptions = {
  secret: "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxage: 7 * 24 * 60 * 60 * 1000,
    httponly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(user.authenticate()));

passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success"); // Correctly set success flash message
  res.locals.error = req.flash("error"); // Correctly set error flash message
  res.locals.currUser = req.user;
  next();
});

app.get("/demouser", async (req, res) => {
  let fakeUser = new user({
    email: "student@gmail.com",
    username: "delta-student",
  });

  const registeredUser = await user.register(fakeUser, "helloworld");
  res.send(registeredUser);
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// app.set("view engine", "ejs"): Sets EJS as the view engine for rendering templates.
// app.set("views", path.join(__dirname, "views")): Configures the directory where EJS templates are stored.
// app.use(express.urlencoded({ extended: true })): Parses URL-encoded form data.
// app.use(methodOverride("_method")): Supports method overriding for HTTP methods like PUT and DELETE.
// app.engine('ejs', ejsMate): Uses ejsMate as the EJS engine to enable additional features.
// app.use(express.static(path.join(__dirname, "/public"))): Serves static files from the public directory.

// app.get("/testListing",async(req,res)=>{
//     let sampleListing=new Listing({
//         title:"my new villa",
//         description:"by the beach",
//         price:1200,
//         location:"calangute,Goa",
//         country:"india",
//     });
//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("sucessfull");
// });

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "page not found"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "something went wrong" } = err;
  //res.status(statusCode).send(message);
  res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080, () => {
  console.log("server is listining");
});
