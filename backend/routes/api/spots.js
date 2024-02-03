const express = require("express");
const { check } = require("express-validator");

const {
  setTokenCookie,
  restoreUser,
  requireAuth,
} = require("../../utils/auth");
const { Spot, Review, SpotImage, User, ReviewImage, sequelize } = require("../../db/models");

const { handleValidationErrors } = require("../../utils/validation");

const router = express.Router();

//Validations
const validateSpot = [
  check("address").notEmpty().withMessage("Address is required"),
  check("city").notEmpty().withMessage("City is required"),
  check("state").notEmpty().withMessage("State is required"),
  check("country").notEmpty().withMessage("Country is required"),
  check("lat").notEmpty().withMessage("Lat is required"),
  check("lng").notEmpty().withMessage("Lng is required"),
  check("name").notEmpty().withMessage("Name is required"),
  check("description").notEmpty().withMessage("Description is required"),
  check("price").notEmpty().withMessage("Price is required"),
  handleValidationErrors,
];

const validateReview =[
  check('review').notEmpty().withMessage("Review text is required"),
  check('stars').notEmpty().isInt({min: 1, max: 5}).withMessage("Stars must be an integer from 1 to 5"),
  handleValidationErrors,
];

//Get all spots
router.get("/", async (req, res) => {
  try {
    const spots = await Spot.findAll({
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
        "description",
        "price",
        "createdAt",
        "updatedAt",
        [
          Spot.sequelize.fn("AVG", Spot.sequelize.col("Reviews.stars")),
          "avgRating",
        ],
      ],
      include: [
        {
          model: Review,
          attributes: [],
        },
        {
          model: SpotImage,
          where: {
            preview: true,
          },
          attributes: ["url"],
          required: false,
        },
      ],
      group: ["Spot.id"],
    });

    const prettiedResponse = {
      Spots: spots.map((spot) => ({
        id: spot.id,
        ownerId: spot.ownerId,
        address: spot.address,
        city: spot.city,
        state: spot.state,
        country: spot.country,
        lat: spot.lat,
        lng: spot.lng,
        name: spot.name,
        description: spot.description,
        price: spot.price,
        createdAt: spot.createdAt,
        updatedAt: spot.updatedAt,
        avgRating: spot.getDataValue("avgRating"),
        previewImage:
          spot.SpotImages.length > 0 ? spot.SpotImages[0].url : null,
      })),
    };

    res.json(prettiedResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something broke bad!" });
  }
});

//we need to validate whether the user is logged in

//Create a spot
router.post("/", requireAuth, validateSpot, async (req, res, next) => {
  const newSpot = await Spot.create({
    ownerId: req.user.id,
    ...req.body,
  });

  return res.status(201).json(newSpot);
});

//add an img to a spot based on spotId
router.post("/:spotId/images", requireAuth, async (req, res, next) => {
  let spot = await Spot.findByPk(req.params.spotId);

  if (!spot) {
    res.status(404);
    //return a message with the error
    const responseObj = { message: "Spot couldn't be found" };
    return res.json(responseObj);
  }
  if (spot.ownerId !== parseInt(req.user.id, 10)) {
    res.status(403);
    const responseObj = { message: "Forbidden" };
    return res.json(responseObj);
  }
  const newImg = await SpotImage.create({
    spotId: spot.id,
    ...req.body,
  });

  const prettiedResponse = {
    id: newImg.id,
    url: newImg.url,
    preview: newImg.preview,
  };
  return res.status(201).json(prettiedResponse);
});

//get all spots owned by current user
router.get("/current", requireAuth, async (req, res) => {
  const user = req.user.id;
  const spots = await Spot.findAll({
    where: {
      ownerId: user,
    },
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
      "description",
      "price",
      "createdAt",
      "updatedAt",
      [
        Spot.sequelize.fn("AVG", Spot.sequelize.col("Reviews.stars")),
        "avgRating",
      ],
    ],
    include: [
      {
        model: Review,
        attributes: [],
      },
      {
        model: SpotImage,
        where: {
          preview: true,
        },
        attributes: ["url"],
        required: false,
      },
    ],
    group: ["Spot.id"],
  });

  const prettiedResponse = {
    Spots: spots.map((spot) => ({
      id: spot.id,
      ownerId: spot.ownerId,
      address: spot.address,
      city: spot.city,
      state: spot.state,
      country: spot.country,
      lat: spot.lat,
      lng: spot.lng,
      name: spot.name,
      description: spot.description,
      price: spot.price,
      createdAt: spot.createdAt,
      updatedAt: spot.updatedAt,
      avgRating: spot.getDataValue("avgRating"),
      previewImage: spot.SpotImages.length > 0 ? spot.SpotImages[0].url : null,
    })),
  };

  return res.json(prettiedResponse);
});

//get details for a spot from an id
router.get("/:spotId", async (req, res, next) => {
  const spotId = req.params.spotId;
  const spot = await Spot.findByPk(spotId, {
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
      "description",
      "price",
      "createdAt",
      "updatedAt",
      [sequelize.fn("COUNT", sequelize.col("Reviews.id")), "numReviews"],
      [sequelize.fn("AVG", sequelize.col("Reviews.stars")), "avgStarRating"],
    ],
    include: [
      {
        model: SpotImage,
        attributes: ["id", "url", "preview"],
      },
      {
        model: User,
        attributes: ["id", "firstName", "lastName"],
        as: "Owner",
      },
      {
        model: Review,
        attributes: [],
      },
    ],
    group: ["Spot.id", "Owner.id"],
  });

  if (!spot) {
    res.status(404);
    return res.json({ message: "Spot couldn't be found" });
  }

  const spotImages = await SpotImage.findAll({
    where: { spotId: spotId },
    attributes: ["id", "url", "preview"],
  });

  const prettiedResponse = {
    id: spot.id,
    ownerId: spot.ownerId,
    address: spot.address,
    city: spot.city,
    state: spot.state,
    country: spot.country,
    lat: spot.lat,
    lng: spot.lng,
    name: spot.name,
    description: spot.description,
    price: spot.price,
    createdAt: spot.createdAt,
    updatedAt: spot.updatedAt,
    numReviews: spot.getDataValue("numReviews"),
    avgStarRating: spot.getDataValue("avgStarRating"),
    SpotImages: spotImages.map((image) => ({
      id: image.id,
      url: image.url,
      preview: image.preview,
    })),
    Owner: {
      id: spot.Owner.id,
      firstName: spot.Owner.firstName,
      lastName: spot.Owner.lastName,
    },
  };

  return res.json(prettiedResponse);
});

//edit a spot
router.put("/:spotId", requireAuth, validateSpot, async (req, res) => {
  let spot = await Spot.findByPk(req.params.spotId);

  if (!spot) {
    res.status(404);
    return res.json({ message: "Spot couldn't be found" });
  }

  if (spot.ownerId !== parseInt(req.user.id, 10)) {
    res.status(403);
    const responseObj = { message: "Forbidden" };
    return res.json(responseObj);
  }

  await spot.update({ ...req.body });

  return res.json(spot);
});

//delete a spot
router.delete("/:spotId", requireAuth, async (res, req) => {
  let spot = await Spot.findByPk(req.params.spotId);

  if (!spot) {
    res.status(404);
    const responseObj = { message: "Spot couldn't be found" };
    return res.json(responseObj);
  };

  if (spot.ownerId !== parseInt(req.user.id, 10)) {
    res.status(403);
    const responseObj = { message: "Forbidden" };
    return res.json(responseObj);
  };

  await spot.destroy();

  return res.json({message: 'Successfully deleted'});
});

//get all reviews by a spotId
router.get('/:spotId/reviews', async(res, req) => {
  const spotId = req.params.spotId;
  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    res.status(404);
    const responseObj = { message: "Spot couldn't be found" };
    return res.json(responseObj);
  };

  const reviews = await Review.findAll({
    where:{
      spotId: spotId
    },
    include:[
      {
      model: User,
      attributes: ['id', 'firstName', 'lastName']
    },
    {
      model: ReviewImage,
      attributes: ['id', 'url']
    }
  ]
  });

  return res.json({Reviews: reviews})
});

//create a review for a spot based on the spotId
router.post('/:spotId/reviews', requireAuth, validateReview, async(req, res) => {
  const spotId = parseInt(req.params.spotId, 10);
  const userId = req.user.id

  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    res.status(404);
    const responseObj = { message: "Spot couldn't be found" };
    return res.json(responseObj);
  };

  const userReviewCheck = await Review.findOne({
    where: {
      spotId: spotId,
      userId: userId
    }
  })

  if (userReviewCheck){
    res.status(500);
    const responseObj = { message: "User already has a review for this spot" };
    return res.json(responseObj);
  }

  const newReview = await Review.create({
    spotId: spotId,
    userId: userId,
    ...req.body
  })
});
/*
//get all bookings for a spot based the spotId
router.get()

//create a book from a spot based the spotId
router.post();

//query for spots
*/

module.exports = router;
