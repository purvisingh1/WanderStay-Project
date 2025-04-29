const express=require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn, isOwner,validateListing}=require("../middleware.js");
const listingController=require("../controllers/listings.js");
const multer  = require("multer");
const Listing=require("../models/listing");

const {cloudinary,storage}=require("../cloudConfig.js");
const ExpressError = require("../utils/ExpressError.js");
const upload = multer({storage})

router.route("/")
.get(wrapAsync( listingController.index) )
.post(isLoggedIn,
upload.single("listing[image]"),
wrapAsync(listingController.createListing))



//Search Route
router.get("/search", wrapAsync(listingController.searchListing));

//Filter Route
router.get("/filter", wrapAsync(listingController.filterListings));


 //New Route
 router.get("/new",isLoggedIn,listingController.renderNewForm);

 //Recommendations Route
 router.get("/:listingId/recommendations",listingController.recommendations );

router.route("/:id")
.get(wrapAsync(listingController.showListing))
.put(isLoggedIn,isOwner,
  upload.single("listing[image]"),
  //validateListing,
  wrapAsync(listingController.updateListing))
.delete( isLoggedIn,isOwner,wrapAsync(listingController.deleteListing));


//Edit route
router.get("/:id/edit",isLoggedIn,isOwner, wrapAsync(listingController.editListing));

module.exports=router;

//Search Route
/*router.get("/search",async(req,res)=>{
  try{
    let query=req.query.q || "";
    let listings= await Listing.find({
      title:{$regex:query ,$options:"i"}
    })
    console.log(query,listings);
    res.render("listings", { listings,query });
  }catch(error){
new ExpressError(500,"Error in fetching listing");
  }
})*/