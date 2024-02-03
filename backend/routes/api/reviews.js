const express = require("express");
const { check } = require("express-validator");

const {
  setTokenCookie,
  restoreUser,
  requireAuth,
} = require("../../utils/auth");
const {
  Spot,
  Review,
  SpotImage,
  User,
  ReviewImage,
  sequelize,
} = require("../../db/models");
const { Op } = require("sequelize");
const { handleValidationErrors } = require("../../utils/validation");

const router = express.Router();

//Validations -I am lazy. I am sure there is a way to import these between files to avoid repeats
const validateReview = [
  check("review").notEmpty().withMessage("Review text is required"),
  check("stars")
    .notEmpty()
    .isInt({ min: 1, max: 5 })
    .withMessage("Stars must be an integer from 1 to 5"),
  handleValidationErrors,
];

//get all reviews by current user
router.get("/current", requireAuth, async (req, res) => {
    const user = req.user.id;

  const reviews = await Review.findAll({
    where: { userId: user },
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName"],
      },
      {
        model: Spot,
        attributes: [
          "id",
          "ownerId",
          "address",
          "city",
          "state",
          "country",
          "lat",
          "lng",
          "name",
          "price",
        ],
        include: [
          {
            model: SpotImage,
            attributes: ["url"],
            where: { preview: true },
          },
        ],
      },
      {
        model: ReviewImage,
        attributes: ["id", "url"],
      },
    ],
  });

  const prettiedResponse = reviews.map((review) => ({
    id: review.id,
    userId: review.userId,
    spotId: review.spotId,
    review: review.review,
    stars: review.stars,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    User: {
      id: review.User.id,
      firstName: review.User.firstName,
      lastName: review.User.lastName,
    },
    Spot: {
      id: review.Spot.id,
      ownerId: review.Spot.ownerId,
      address: review.Spot.address,
      city: review.Spot.city,
      state: review.Spot.state,
      country: review.Spot.country,
      lat: review.Spot.lat,
      lng: review.Spot.lng,
      name: review.Spot.name,
      price: review.Spot.price,
      previewImage:
        review.Spot.SpotImages.length > 0
          ? review.Spot.SpotImages[0].url
          : null,
    },
    ReviewImages: review.ReviewImages.map((image) => ({
      id: image.id,
      url: image.url,
    })),
  }));

  return res.json(prettiedResponse);
});

//add an img to a review based on reviewId
router.post("/:reviewId/images", requireAuth, async (req, res, next) => {
  let review = await Review.findByPk(req.params.reviewId);

  if (!review) {
    res.status(404);
    const responseObj = { message: "Review couldn't be found" };
    return res.json(responseObj);
  }
  if (review.userId !== parseInt(req.user.id, 10)) {
    res.status(403);
    const responseObj = { message: "Forbidden" };
    return res.json(responseObj);
  }

  const imageCheck = await ReviewImage.findAll({
    where: { reviewId: req.params.reviewId },
  });

  if (imageCheck.length >= 10) {
    res.status(403);
    const responseObj = {
      message: "Maximum number of images for this resource was reached",
    };
    return res.json(responseObj);
  }
  const newImg = await ReviewImage.create({
    reviewId: review.id,
    ...req.body,
  });

  const prettiedResponse = {
    id: newImg.id,
    url: newImg.url,
  };
  return res.json(prettiedResponse);
});

//edit a review
router.put("/:reviewId", requireAuth, validateReview, async (req, res) => {
  const review = await Review.findByPk(req.params.reviewId);

  if (!review) {
    res.status(404);
    const responseObj = { message: "Review couldn't be found" };
    return res.json(responseObj);
  }
  if (review.userId !== parseInt(req.user.id, 10)) {
    res.status(403);
    const responseObj = { message: "Forbidden" };
    return res.json(responseObj);
  }

  await review.update({
    ...req.body,
  });

  return res.json(review);
});

//delete review
router.delete("/:reviewId", requireAuth, async (req, res) => {
    let review = await Review.findByPk(req.params.reviewId);

    if (!review) {
      res.status(404);
      const responseObj = { message: "Review couldn't be found" };
      return res.json(responseObj);
    };

    if (review.userId !== parseInt(req.user.id, 10)) {
      res.status(403);
      const responseObj = { message: "Forbidden" };
      return res.json(responseObj);
    };

    await review.destroy();

    return res.json({message: 'Successfully deleted'});
  });
module.exports = router;
