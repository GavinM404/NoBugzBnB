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

const router = express.Router();

router.delete('/review-images/:imageId', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const imageId = req.params.imageId;

    const reviewImage = await ReviewImage.findOne({
        where: {
            id: imageId,
        },
        include: {
            model: Review,
            where: {
                userId: userId,
            },
        },
    });

    if (!reviewImage) {
        res.status(404);
        const responseObj = { message: "Review Image couldn't be found" };
        return res.json(responseObj);
      }

      await reviewImage.destroy();

      return res.json({ message: "Successfully deleted" });
})

module.exports = router;
