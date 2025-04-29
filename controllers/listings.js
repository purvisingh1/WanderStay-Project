const Listing=require("../models/listing");
const ExpressError = require("../utils/ExpressError.js");
const {listingSchema} = require("../schema.js");
const natural = require("natural");
const mongoose = require('mongoose'); 

const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const tokenizer = new natural.WordTokenizer();
const mapToken=process.env.MAP_KEY;
const geocodingClient = mbxGeocoding({ accessToken:mapToken });



module.exports.index= async(req,res)=>{
    const allListings =  await Listing.find({});
    res.render("listings/index.ejs",{listingsToShow:allListings, query: "",isSearch:false});
      }


      module.exports.searchListing = async (req, res) => {
        try {
            const query = req.query.q;
            let searchQuery = {};
    
            if (query) {
                if (!isNaN(query)) { 
                    // If query is a number, assume it's a price filter (≤ entered price)
                    searchQuery.price = { $lte: parseInt(query) };
                } else if (query.includes('-')) { 
                    // If query contains a range (e.g., "100-500"), filter price accordingly
                    const [minPrice, maxPrice] = query.split('-');
                    searchQuery.price = { 
                        $gte: parseInt(minPrice), 
                        $lte: parseInt(maxPrice) 
                    };
                } else { 
                    // Partial search in title and location
                    searchQuery.$or = [
                        { title: { $regex: query, $options: "i" } }, 
                        { location: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } } // Optional: Search in descriptions
                    ];
                }
            }
    
            const listings = await Listing.find(searchQuery);
    
            console.log("Search Query:", query);
            console.log("Search Results:", listings);
    
            res.render("listings/index", { listingsToShow: listings, query, isSearch: true });
    
        } catch (error) {
            console.error("Error searching listings:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    };
    
    
    
    module.exports.filterListings = async (req, res) => {
        const category = req.query.category;  // Frontend se category aayegi
        let filteredListings;
    
        if (category) {
            filteredListings = await Listing.find({ category: category });
        } else {
            filteredListings = await Listing.find({});
        }
    
        res.render("listings/index", { listingsToShow: filteredListings, query: category, isSearch: true });
    };
      

module.exports.renderNewForm= (req,res)=>{
    res.render("listings/new.ejs")
}

module.exports.showListing= async(req,res)=>{
    let {id} = req.params;
   const listing =  await Listing.findById(id).
   populate({
    path:"reviews",
    populate:{
        path:"author",
    },
   })
   .populate("owner");
   
   if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", { listing, currUser: req.user });
};

  




module.exports.createListing=async(req,res,next)=>{
    /*  
    Schema Validation using if--
  
    if(!req.body.listing){
          throw new ExpressError(400,"send valid data for request");
      }
   
   if(!req.body.title){
      throw new ExpressError(400,"title is missing!");
  }
  if(!req.body.description){
      throw new ExpressError(400,"description is missing!");
  }
  if(!req.body.price){
      throw new ExpressError(400,"price is missing!");
  }
  if(!req.body.location){
      throw new ExpressError(400,"location is missing!");
  }*/
  
  //Joi handler
  /*let result = listingSchema.validate(req.body);
  console.log(result);
  
  if(result.error){
      throw new ExpressError (400,result.error);
  }*/

    let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1
      })
        .send();
      

  let url=req.file.path;
  let filename=req.file.filename;

  const newListing = new Listing(req.body.listing);
  newListing.owner=req.user._id;
  newListing.image={url,filename};
  newListing.geometry=response.body.features[0].geometry;
  const savedListing= await newListing.save();
  console.log(savedListing);
  req.flash("success","New Listing Created!");
  res.redirect("/listings")
   // let{title,desciption,image,price,location,country}=req.body;
}

module.exports.editListing=async (req, res) => {
    let { id } = req.params;

    const listing = await Listing.findById(id);
    if(!listing){
        req.flash("error","Listing you requested for does not exist!");
        res.redirect("/listings");
       } 
       let originalImageUrl=listing.image.url;
       originalImageUrl=originalImageUrl.replace("/upload","/upload/w_250")
    res.render("listings/edit.ejs", { listing,originalImageUrl });
  }

  module.exports.updateListing=async (req, res, next) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if( typeof req.file !== "undefined"){
        let url=req.file.path;
  let filename=req.file.filename;
  listing.image={url,filename};
  await listing.save();
    }

   /* if (!updatedListing) {
        return next(new ExpressError(404, "Listing not found!"));
    }*/


   req.flash("success","Listing Updated!");
    return res.redirect(`/listings/${id}`); // Ensure only one response is sent
}

module.exports.deleteListing=async (req, res, next) => {
    let { id } = req.params;
    console.log(`Attempting to delete listing with ID: ${id}`);
    let deletedListing = await Listing.findByIdAndDelete(id);

    if (!deletedListing) {
        return next(new ExpressError(404, "Listing not found!"));
    }

    console.log(deletedListing);
    req.flash("success","Listing Deleted!");
    return res.redirect("/listings");
}

// Function to calculate similarity between two listings
function calculateSimilarity(listing, allListings) {
    const listingTokens = tokenizer.tokenize(listing.description.toLowerCase());

    return allListings.map(otherListing => {
        if (listing._id.equals(otherListing._id)) return null; // Ignore itself
        
        const otherTokens = tokenizer.tokenize(otherListing.description.toLowerCase());

        const intersection = listingTokens.filter(token => otherTokens.includes(token)).length;
        const union = new Set([...listingTokens, ...otherTokens]).size;
        const similarity = intersection / union;

        return { listing: otherListing, similarity };
    }).filter(item => item !== null) // Remove null values
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity
      .slice(0, 5); // Get top 5 recommendations
}

module.exports.recommendations = async (req, res) => {
  try {
    const listingId = req.params.listingId;
    console.log("listingId at Backend", listingId);

    const listing = await Listing.findById(listingId).populate("reviews");
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    console.log("Listing reviews:", listing.reviews);

    // Combine title, description, and reviews for similarity comparison
    const currentText =
      (listing.title || "") +
      " " +
      (listing.description || "") +
      " " +
      listing.reviews.map((review) => review.comment).join(" ");

    // Fetch all listings except the current one
    const allListings = await Listing.find({ _id: { $ne: listingId } }).populate("reviews");

    const recommendations = allListings.map((otherListing) => {
      // Combine title, description, and reviews of other listings
      const otherText =
        (otherListing.title || "") +
        " " +
        (otherListing.description || "") +
        " " +
        otherListing.reviews.map((review) => review.comment).join(" ");

      // Compute cosine similarity between the current listing and other listings
      const similarity = getCosineSimilarity(currentText, otherText);

      // Calculate average rating
      const averageRating = getAverageRating(otherListing);

      return { listing: otherListing, similarity, averageRating };
    });

    // Apply OR condition (either rating > 3 or similarity > threshold)
    const filteredRecommendations = recommendations
      .filter((rec) => rec.similarity > 0.1 || rec.averageRating > 3)  // **Modified this line**
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity (higher first)
      .slice(0, 6); // Return only top 6 recommendations

    console.log("Recommendations:", filteredRecommendations.map((rec) => rec.listing.title));

    if (filteredRecommendations.length === 0) {
      return res.status(404).json({ error: "No recommendations found" });
    }

    res.json({ recommendations: filteredRecommendations.map((rec) => rec.listing) });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Function to calculate cosine similarity
function getCosineSimilarity(text1, text2) {
  const tokenizer = new natural.WordTokenizer();
  const words1 = tokenizer.tokenize(text1.toLowerCase());
  const words2 = tokenizer.tokenize(text2.toLowerCase());

  const uniqueWords = new Set([...words1, ...words2]);

  const vector1 = Array.from(uniqueWords).map((word) =>
    words1.filter((w) => w === word).length
  );
  const vector2 = Array.from(uniqueWords).map((word) =>
    words2.filter((w) => w === word).length
  );

  const dotProduct = vector1.reduce((sum, value, i) => sum + value * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + value ** 2, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + value ** 2, 0));

  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
}

// Function to calculate average rating
function getAverageRating(listing) {
  if (!listing.reviews || listing.reviews.length === 0) return 0;
  const total = listing.reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / listing.reviews.length;
}
