const Listing = require("./models/listing");
const Review = require("./models/review.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");

module.exports.isLoggedIn = (req, res, next) => {
  // console.log(req.user);
  //console.log(req.path,"..",req.originalUrl);
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "you must be logged in");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }
  if (!listing.owner.equals(res.locals.currUser._id)) {
    req.flash("error", "You do not the owner of this listing");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

module.exports.validateListing = (req, res, next) => {
  console.log("Validating listing data:", req.body);
  let { error } = listingSchema.validate(req.body);
  if (error) {
    console.log("Validation error:", error);
    let errmsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errmsg);
  } else {
    next();
  }
};

module.exports.validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errmsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errmsg);
  } else {
    next();
  }
};

module.exports.isReviewAuthor = async (req, res, next) => {
  const { reviewId } = req.params;
  const review = await Review.findById(reviewId);
  if (!review) {
    req.flash("error", "Review not found");
    return res.redirect(`/listings/${req.params.id}`);
  }
  if (!review.author.equals(req.user._id)) {
    req.flash("error", "You are not the author of this review");
    return res.redirect(`/listings/${req.params.id}`);
  }
  next();
};
