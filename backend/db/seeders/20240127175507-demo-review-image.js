'use strict';
const ReviewImage = require('../models');

let options = {};
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await ReviewImage.bulkcreate([
      {
        reviewId: 1,
        url: 'imagehost.come/img1'
      },
      {
        reviewId: 2,
        url: 'imagehost.come/img2'
      },
      {
        reviewId: 3,
        url: 'imagehost.come/img3'
      }
    ],{ validate: true })
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'ReviewImages';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      reviewId: { [Op.in]: [1, 2, 3] }
    }, {});
  }
};
