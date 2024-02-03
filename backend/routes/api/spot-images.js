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

router.delete('/spot-images/:imageId', requireAuth, async (req, res, next) => {
    const userId = req.user.id;
    const imageId = req.params.imageId;

    const spotImage = await SpotImage.findOne({
        where: {
            id: imageId,
        },
        include: {
            model: Spot,
           /* where: {
                ownerId: userId,
            }, */
        },
    });

    if (!spotImage) {
        res.status(404);
        const responseObj = { message: "Spot Image couldn't be found" };
        return res.json(responseObj);
      }

      await spotImage.destroy();

      return res.json({ message: "Successfully deleted" });
})

module.exports = router;
