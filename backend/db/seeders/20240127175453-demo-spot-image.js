'use strict';

const SpotImage = require('../models');

let options = {};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await SpotImage.bulkcreate([
      {
        spotId: 1,
        url: 'coolsite.come/img',
        preview: true,
      },
      {
        spotId: 2,
        url: 'coolsite.come/img1',
        preview: false,
      },
      {
        spotId: 2,
        url: 'coolsite.come/img3',
        preview: true,
      }
    ],{ validate: true })
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'SpotImages';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      spotId: { [Op.in]: [1, 2, 3] }
    }, {});
  }
};
