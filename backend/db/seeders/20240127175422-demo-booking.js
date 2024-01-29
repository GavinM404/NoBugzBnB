'use strict';

const Booking = require('../models');

let options = {};
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {

    await Booking.bulkCreate([
      {
        userId:1,
        spotId: 3,
        startDate: 2025-12-17,
        endDate:2026-12-17,
      },
      {
        userId:2,
        spotId: 1,
        startDate: 2025-12-18,
        endDate:2026-12-18,
      },
      {
        userId:3,
        spotId: 2,
        startDate: 2025-12-19,
        endDate:2026-12-19,
      },
    ],{ validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Bookings';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      userId: { [Op.in]: [1, 2, 3] }
    }, {});
  }
};
