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

router.delete("/:imageId", requireAuth, async (req, res, next) => {
  const userId = req.user.id;
  const imageId = req.params.imageId;

  const spotImage = await SpotImage.findOne({
    where: {
      id: imageId,
    },
    include: {
      model: Spot,
    },
  });

  if (!spotImage) {
    res.status(404);
    const responseObj = { message: "Spot Image couldn't be found" };
    return res.json(responseObj);
  }

  if (spotImage.Spot.ownerId!== parseInt(userId, 10)) {
    res.status(403);
    const responseObj = { message: "Forbidden" };
    return res.json(responseObj);
  }

  await spotImage.destroy();

  return res.json({ message: "Successfully deleted" });
});

module.exports = router;
