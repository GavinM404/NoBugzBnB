const express = require("express");
const { check } = require("express-validator");
const { Op } = require("sequelize");

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
  Booking,
  sequelize,
} = require("../../db/models");

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

const validateReview = [
  check("review").notEmpty().withMessage("Review text is required"),
  check("stars")
    .notEmpty()
    .isInt({ min: 1, max: 5 })
    .withMessage("Stars must be an integer from 1 to 5"),
  handleValidationErrors,
];

const validateGet = [
  check("page")
    .default(1)
    .isInt({ min: 1, max: 10 })
    .withMessage("Page must be greater than or equal to 1"),
  check("size")
    .default(1)
    .isInt({ min: 1, max: 20 })
    .withMessage("Size must be greater than or equal to 1"),
  check("maxLat")
    .optional()
    .isFloat()
    .withMessage("Maximum latitude is invalid"),
  check("minLat")
    .optional()
    .isFloat()
    .withMessage("Minimum latitude is invalid"),
  check("maxLng")
    .optional()
    .isFloat()
    .withMessage("Maximum longitude is invalid"),
  check("minLng")
    .optional()
    .isFloat()
    .withMessage("Minimum longitude is invalid"),
  check("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be greater than or equal to 0"),
  check("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be greater than or equal to 0"),
  handleValidationErrors,
];

//Get all spots
router.get("/", validateGet, async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      minLat,
      maxLat,
      minLng,
      maxLng,
      minPrice,
      maxPrice,
    } = req.query;

    const filterOps = {
      where: {
        lat: {
          [Op.between]: [minLat || -90, maxLat || 90],
        },
        lng: {
          [Op.between]: [minLng || -180, maxLng || 180],
        },
        price: {
          [Op.between]: [minPrice || 0, maxPrice || 999999],
        },
      },
    };

    const spots = await Spot.findAll({
      ...filterOps,
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
        /* [
          sequelize.literal('(SELECT AVG(stars) FROM "Reviews" WHERE "Reviews"."spotId" = "Spot"."id")'),
          'avgRating',
        ], */
        [sequelize.fn("AVG", sequelize.col("Reviews.stars")), "avgRating"],
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
      group: ["Spot.id", "SpotImages.id"],
      offset: (parseInt(page) - 1) * parseInt(size),
      limit: parseInt(size),
      subQuery: false,
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
        avgRating: spot.dataValues.avgRating,
        previewImage:
          spot.SpotImages.length > 0 ? spot.SpotImages[0].url : null,
      })),
      page: parseInt(page, 10),
      size: parseInt(size, 10),
    };

    res.json(prettiedResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something broke bad!" });
  }
});

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
  return res.status(200).json(prettiedResponse);
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
      [sequelize.fn("AVG", sequelize.col("Reviews.stars")), "avgRating"],
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
    group: ["Spot.id", "SpotImages.id"],
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
    group: ["Spot.id", "Owner.id", "SpotImages.id"],
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
router.delete("/:spotId", requireAuth, async (req, res) => {
  let spot = await Spot.findByPk(req.params.spotId);

  if (!spot) {
    res.status(404);
    const responseObj = { message: "Spot couldn't be found" };
    return res.json(responseObj);
  }

  if (spot.ownerId !== parseInt(req.user.id, 10)) {
    res.status(403);
    const responseObj = { message: "Forbidden" };
    return res.json(responseObj);
  }

  await spot.destroy();

  return res.json({ message: "Successfully deleted" });
});

//get all reviews by a spotId
router.get("/:spotId/reviews", async (req, res) => {
  const spotId = req.params.spotId;
  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    res.status(404);
    const responseObj = { message: "Spot couldn't be found" };
    return res.json(responseObj);
  }

  const reviews = await Review.findAll({
    where: {
      spotId: spotId,
    },
    include: [
      {
        model: User,
        attributes: ["id", "firstName", "lastName"],
      },
      {
        model: ReviewImage,
        attributes: ["id", "url"],
      },
    ],
  });

  return res.json({ Reviews: reviews });
});

//create a review for a spot based on the spotId
router.post(
  "/:spotId/reviews",
  requireAuth,
  validateReview,
  async (req, res) => {
    const spotId = parseInt(req.params.spotId, 10);
    const userId = req.user.id;

    const spot = await Spot.findByPk(spotId);

    if (!spot) {
      res.status(404);
      const responseObj = { message: "Spot couldn't be found" };
      return res.json(responseObj);
    }

    const userReviewCheck = await Review.findOne({
      where: {
        spotId: spotId,
        userId: userId,
      },
    });

    if (userReviewCheck) {
      res.status(500);
      const responseObj = {
        message: "User already has a review for this spot",
      };
      return res.json(responseObj);
    }

    const newReview = await Review.create({
      spotId: spotId,
      userId: userId,
      ...req.body,
    });

    return res.status(201).json(newReview);
  }
);

//get all bookings for a spot based the spotId
router.get("/:spotId/bookings", requireAuth, async (req, res, next) => {
  const spotId = req.params.spotId;
  const userId = req.user.id;

  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    res.status(404);
    return res.json({ message: "Spot couldn't be found" });
  }

  if (spot.ownerId === userId) {
    const bookings = await Booking.findAll({
      where: { spotId: spotId },
      include: [
        {
          model: User,
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    });

    const prettiedResponse = {
      Bookings: bookings.map((booking) => ({
        User: {
          id: booking.User.id,
          firstName: booking.User.firstName,
          lastName: booking.User.lastName,
        },
        id: booking.id,
        spotId: booking.spotId,
        userId: booking.userId,
        startDate: booking.startDate.toISOString().split("T")[0],
        endDate: booking.endDate.toISOString().split("T")[0],
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      })),
    };

    return res.json(prettiedResponse);
  } else {
    bookings = await Booking.findAll({
      where: {
        spotId: spotId,
        [Op.and]: [
          { startDate: { [Op.gte]: new Date() } },
          { endDate: { [Op.gte]: new Date() } },
        ],
      },
      attributes: ["spotId", "startDate", "endDate"],
    });

    return res.json({ Bookings: bookings });
  }
});

//create a book from a spot based the spotId
router.post("/:spotId/bookings", requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const spotId = req.params.spotId;
  let { startDate, endDate } = req.body;

  const errArr = [];

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  if (startDate >= endDate) {
    errArr.push({
      field: "endDate",
      message: "endDate cannot be on or before startDate",
    });
  }

  if (startDate.getTime() === endDate.getTime()) {
    errArr.push({
      field: "endDate",
      message: "endDate cannot be on or before startDate",
    });
  }

  if (errArr.length > 0) {
    res.status(400).json({
      message: "Bad Request",
      errors: errArr.reduce(
        (acc, cur) => ({ ...acc, [cur.field]: cur.message }),
        {}
      ),
    });
    return;
  }

  const conflictingBooking = await Booking.findOne({
    where: {
      spotId: spotId,
      [Op.or]: [
        // Existing booking entirely encapsulates new booking
        {
          [Op.and]: [
            { startDate: { [Op.gte]: startDate } },
            { endDate: { [Op.lte]: endDate } },
          ],
        },
        // New booking entirely encapsulates existing booking
        {
          [Op.and]: [
            { startDate: { [Op.lte]: startDate } },
            { endDate: { [Op.gte]: endDate } },
          ],
        },
        // Existing booking starts inside new booking
        {
          [Op.and]: [
            { startDate: { [Op.gte]: startDate } },
            { startDate: { [Op.lte]: endDate } },
            { endDate: { [Op.gte]: endDate } },
          ],
        },
        // Existing booking starts and ends within the range of new booking
        {
          [Op.and]: [
            { startDate: { [Op.gte]: startDate } },
            { endDate: { [Op.lte]: endDate } },
          ],
        },
        // Existing booking overlaps with new booking's start
        {
          [Op.and]: [
            { startDate: { [Op.lte]: startDate } },
            { endDate: { [Op.gte]: startDate } },
          ],
        },
        // Existing booking overlaps with new booking's end
        {
          [Op.and]: [
            { startDate: { [Op.lte]: endDate } },
            { endDate: { [Op.gte]: endDate } },
          ],
        },
      ],
    },
  });

  if (conflictingBooking) {
    if (conflictingBooking.startDate <= startDate && conflictingBooking.endDate >= endDate) {
      errArr.push({
        field: "startDate",
        message: "Start date conflicts with an existing booking",
      });
      errArr.push({
        field: "endDate",
        message: "End date conflicts with an existing booking",
      });
    } else {
      if (conflictingBooking.startDate <= startDate) {
        errArr.push({
          field: "startDate",
          message: "Start date conflicts with an existing booking",
        });
      }

      if (conflictingBooking.endDate >= endDate) {
        errArr.push({
          field: "endDate",
          message: "End date conflicts with an existing booking",
        });
      } else {
        errArr.push({
          field: "startDate",
          message: "Start date conflicts with an existing booking",
        });
        errArr.push({
          field: "endDate",
          message: "End date conflicts with an existing booking",
        });
      }
    }

    if (errArr.length > 0) {
      res.status(403).json({
        message: "Sorry, this spot is already booked for the specified dates",
        errors: errArr.reduce(
          (acc, cur) => ({ ...acc, [cur.field]: cur.message }),
          {}
        ),
      });
      return;
    }
  }
  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    res.status(404);
    const responseObj = { message: "Spot couldn't be found" };
    return res.json(responseObj);
  }

  if (spot.ownerId === parseInt(req.user.id, 10)) {
    res.status(403);
    const responseObj = { message: "You cannot book your own spot" };
    return res.json(responseObj);
  }

  const newBooking = await Booking.create({
    userId,
    spotId,
    startDate,
    endDate,
  });

  const prettiedResponse = {
    id: newBooking.id,
    spotId: newBooking.spotId,
    userId: newBooking.userId,
    startDate: newBooking.startDate.toISOString().split("T")[0],
    endDate: newBooking.endDate.toISOString().split("T")[0],
    createdAt: newBooking.createdAt,
    updatedAt: newBooking.updatedAt,
  };

  return res.json(prettiedResponse);
});
/*
//query for spots
*/

module.exports = router;
