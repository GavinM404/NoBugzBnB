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
  Booking,
  sequelize,
} = require("../../db/models");

const { handleValidationErrors } = require("../../utils/validation");
const { Op } = require("sequelize");
const router = express.Router();

router.get("/current", requireAuth, async (req, res, next) => {
  const user = req.user.id;
  const booking = await Booking.findAll({
    where: {
      userId: user,
    },
    include: [
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
            where: {
              preview: true,
            },
            attributes: ["url"],
            required: false,
          },
        ],
      },
    ],
  });

  const prettiedResponse = booking.map((booking) => ({
    id: booking.id,
    spotId: booking.spotId,
    Spot: {
      id: booking.Spot.id,
      ownerId: booking.Spot.ownerId,
      address: booking.Spot.address,
      city: booking.Spot.city,
      state: booking.Spot.state,
      country: booking.Spot.country,
      lat: booking.Spot.lat,
      lng: booking.Spot.lng,
      name: booking.Spot.name,
      price: booking.Spot.price,
      previewImage:
        booking.Spot.SpotImages.length > 0
          ? booking.Spot.SpotImages[0].url
          : null,
    },
    userId: booking.userId,
    startDate: booking.startDate,
    endDate: booking.endDate,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  }));

  return res.json({ Bookings: prettiedResponse });
});

//edit booking
router.put("/:bookingId", requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const bookingId = req.params.bookingId;
  let { startDate, endDate } = req.body;

  const errArr = [];

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  const booking = await Booking.findByPk(bookingId);

if (booking.ownerId !== parseInt(req.user.id, 10)) {
        res.status(403);
        const responseObj = { message: "Forbidden" };
        return res.json(responseObj);
      }


  if (startDate >= endDate) {
    errArr.push({
      field: "endDate",
      message: "endDate cannot come before startDate",
    });
  }

  if (booking.startDate < new Date()) {
    res.status(403);
    const responseObj = { message: "Past bookings can't be modified" };
    return res.json(responseObj);
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

  if (!booking) {
    res.status(404);
    const responseObj = { message: "Booking couldn't be found" };
    return res.json(responseObj);
  }

  const bookingExists = await Booking.findOne({
    where: {
      spotId: booking.spotId,
      [Op.or]: [
        {
          startDate: {
            [Op.between]: [startDate, endDate],
          },
        },
        {
          endDate: {
            [Op.between]: [startDate, endDate],
          },
        },
      ],
      id: {
        [Op.not]: bookingId,
      },
    },
  });

  if (bookingExists) {
    res.status(403);
    return res.json({
      message: "Sorry, this spot is already booked for the specified dates",
      errors: {
        startDate: "Start date conflicts with an existing booking",
        endDate: "End date conflicts with an existing booking",
      },
    });
  }

  await booking.update({
    startDate: startDate,
    endDate: endDate,
  });

  return res.json(booking);
});

router.delete("/:bookingId", requireAuth, async (reg, res, next) => {
  const bookingId = req.params.bookingId;

  const booking = await Booking.findByPk(bookingId);

  if (!booking) {
    res.status(404);
    const responseObj = { message: "Booking couldn't be found" };
    return res.json(responseObj);
  }

  if (booking.startDate < new Date()) {
    res.status(403);
    const responseObj = {
      message: "Bookings that have been started can't be deleted",
    };
    return res.json(responseObj);
  }

  await booking.destroy();

  return res.json({ message: "Successfully deleted" });
});

module.exports = router;
