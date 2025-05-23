const express=require("express");
const router = express.Router({mergeParams:true});
const wrapAsync = require("../utils/wrapAsync.js");
const { validateReview, isLoggedIn,isReviewAuthor } = require("../middleware.js");
const reviewController=require("../controllers/reviews.js");


//Reviews
//Post Route

router.post("/",
    isLoggedIn,
    wrapAsync(reviewController.createReview)
    )


    //Delete Review
    router.delete("/:reviewId",
        isLoggedIn,
        isReviewAuthor,
        wrapAsync(reviewController.deleteReview));

    module.exports=router;