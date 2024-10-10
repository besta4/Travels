const Listing = require("../models/listing");
const mongoose = require("mongoose");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const cloudinary = require("cloudinary").v2;

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs", { mapToken: process.env.MAP_TOKEN });
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  // Validate the ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid Listing ID");
    return res.redirect("/listings");
  }
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Requested Listing is Unavailable");
    return res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
  console.log("Request body:", req.body);
  console.log("Request file:", req.file);
  try {
    if (!req.body.listing) {
      throw new Error("Listing data is required");
    }

    let response = await geocodingClient
      .forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
      })
      .send();

    if (!response.body.features.length) {
      throw new Error("Invalid location provided");
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.geometry = response.body.features[0].geometry;

    if (req.file) {
      let { path: url, filename } = req.file;
      newListing.image = { url, filename };
    }
    console.log("New listing geometry:", newListing.geometry);
    await newListing.save();

    req.flash("success", "New Listing Created");
    res.redirect("/listings");
  } catch (error) {
    console.error("Error creating listing:", error);
    req.flash("error", error.message || "Error creating listing");
    res.redirect("/listings/new");
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Requested Listing is Unavaialble");
    res.redirect("/listings");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl.replace("/upload", "/upload/h_300,w_500");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  try {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(
      id,
      { ...req.body.listing },
      { new: true }
    );

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    if (req.file) {
      const { path: url, filename } = req.file;
      listing.image = { url, filename };
      await listing.save();
    }

    req.flash("success", "Listing Updated");
    res.redirect(`/listings/${id}`);
  } catch (error) {
    console.error("Error updating listing:", error);
    req.flash("error", "Error updating listing");
    res.redirect(`/listings/${id}/edit`);
  }
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  // Delete image from Cloudinary if it exists
  if (listing.image && listing.image.filename) {
    await cloudinary.uploader.destroy(listing.image.filename);
  }

  await Listing.findByIdAndDelete(id);

  req.flash("success", "Listing Deleted");
  res.redirect("/listings");
};
