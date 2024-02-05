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
/*
//edit booking
router.put("/:bookingId", requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const bookingId = req.params.bookingId;
  let { startDate, endDate } = req.body;

  const errArr = [];

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  const booking = await Booking.findByPk(bookingId);

  if (!booking) {
    res.status(404);
    const responseObj = { message: "Booking couldn't be found" };
    return res.json(responseObj);
  }

  if (booking.userId !== parseInt(userId, 10)) {
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

  const conflictingBooking = await Booking.findAll({
    where: {
      spotId: booking.spotId,
      [Op.and]: [
        {
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
        {
          id: {
            [Op.not]: bookingId,
          },
        },
      ],
    },
  });

  if (conflictingBooking) {
    if (
      conflictingBooking.startDate <= startDate &&
      conflictingBooking.endDate >= endDate
    ) {
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


  await booking.update({
    startDate: startDate,
    endDate: endDate,
  });

  return res.json(booking);
});
*/
router.put("/:bookingId", requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const bookingId = req.params.bookingId;
  let { startDate, endDate } = req.body;

  const errArr = [];

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  const booking = await Booking.findByPk(bookingId);

  if (!booking) {
    res.status(404);
    const responseObj = { message: "Booking couldn't be found" };
    return res.json(responseObj);
  }

  if (booking.userId !== parseInt(userId, 10)) {
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

  const existingBooking = await Booking.findOne({
    where: {
      spotId: booking.spotId,
      id: { [Op.not]: bookingId },
    },
  });

  // Check for conflicting bookings
  const conflictingBooking = await Booking.findOne({
    where: {
      spotId: booking.spotId,
      [Op.or]: [
        // Existing booking entirely encapsulates new booking
        {
          startDate: { [Op.lte]: startDate },
          endDate: { [Op.gte]: endDate },
        },
        // New booking entirely encapsulates existing booking
        {
          startDate: { [Op.gte]: startDate },
          endDate: { [Op.lte]: endDate },
        },
        // Existing booking starts inside new booking
        {
          startDate: { [Op.gte]: startDate },
          startDate: { [Op.lte]: endDate },
          endDate: { [Op.gte]: endDate },
        },
        // Existing booking starts and ends within the range of new booking
        {
          startDate: { [Op.gte]: startDate },
          endDate: { [Op.lte]: endDate },
        },
        // Existing booking overlaps with new booking's start
        {
          startDate: { [Op.lte]: startDate },
          endDate: { [Op.gte]: startDate },
        },
        // Existing booking overlaps with new booking's end
        {
          startDate: { [Op.lte]: endDate },
          endDate: { [Op.gte]: endDate },
        },
      ],
    },
  });

  if (conflictingBooking) {
    errArr.push({
      field: "startDate",
      message: "Start date conflicts with an existing booking",
    });
    errArr.push({
      field: "endDate",
      message: "End date conflicts with an existing booking",
    });
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

  if (existingBooking) {
    // Check if the new booking entirely encapsulates an existing booking
    if (
      startDate <= existingBooking.startDate &&
      endDate >= existingBooking.endDate
    ) {
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


  await booking.update({
    startDate: startDate,
    endDate: endDate,
  });

  return res.json(booking);
});
router.delete("/:bookingId", requireAuth, async (req, res, next) => {
  const bookingId = req.params.bookingId;
  const userId = req.user.id;

  const booking = await Booking.findByPk(bookingId);

  if (!booking) {
    res.status(404);
    const responseObj = { message: "Booking couldn't be found" };
    return res.json(responseObj);
  }

  if (booking.userId !== parseInt(userId, 10)) {
    res.status(403);
    const responseObj = { message: "Forbidden" };
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
