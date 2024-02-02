'use strict';
const { Review }= require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Review.bulkCreate([
      {
        userId: 1,
        spotId: 3,
        review: 'Was great, really loved it',
        stars: 5,
      },
      {
        userId: 2,
        spotId: 1,
        review: 'Sucked',
        stars: 1,
      },
      {
        userId: 3,
        spotId: 2,
        review: 'Medicore',
        stars: 3,
      },
    ],{ validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Reviews';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      userId: { [Op.in]: [1, 2, 3] }
    }, {});
  }
};
