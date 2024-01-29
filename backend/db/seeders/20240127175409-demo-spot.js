'use strict';

const { Spot } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Spot.bulkCreate([
      {
        ownerId: 1,
        address:'123 What Road',
        city: 'Whatson',
        state:'CA',
        country:'USA',
        lat: 1.2,
        lng: 3.4,
        name:'Cool Spot',
        description:'The most hip spot',
        price: 10.10,
      },
      {
        ownerId: 2,
        address:'ABC WOW Lane',
        city: 'Thatplace',
        state:'TX',
        country:'USA',
        lat: 4.2,
        lng: 2.4,
        name:'Wow a spot',
        description:'The most pog of spots',
        price: 9.99,
      },
      {
        ownerId: 3,
        address:'456 IAMTERRIBLEATNAMES Street',
        city: 'Huh',
        state:'WA',
        country:'USA',
        lat: 5.2,
        lng: 10.4,
        name:'Terrible Spot',
        description:'The worst spot spot',
        price: 0.10,
      }
    ],{ validate: true })
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Spots';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      ownerId: { [Op.in]: [1, 2, 3] }
    }, {});
  }
};
