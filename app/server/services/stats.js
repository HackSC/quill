var _ = require('underscore');
var async = require('async');
var User = require('../models/User');

// In memory stats.
var stats = {};
function calculateStats(){
  console.log('Calculating stats...');
  var newStats = {
    lastUpdated: 0,

    total: 0,
    demo: {
      gender: {
        'Male': 0,
        'Female': 0,
        'Other': 0,
        'Prefer not to answer': 0
      },
      ethnicity: {
        'White / Caucasian': 0,
        'Black or African American': 0,
        'Native American or Alaska Native': 0,
        'Asian / Pacific Islander': 0,
        'Hispanic / Latinx': 0,
        'Multiracial / Other': 0,
        'Prefer not to answer': 0
      },
      schools: {},
      year: {
        '2019': 0,
        '2020': 0,
        '2021': 0,
        '2022': 0,
        'High School': 0,
        'Graduate': 0,
        'Other': 0
      },
      major: {},
      experience: {
        'Beginner': 0,
        'Intermediate': 0,
        'Advanced': 0
      },
    },

    teams: {},
    verified: 0,
    submitted: 0,
    admitted: 0,
    rejected: 0,
    waitlisted: 0,
    confirmed: 0,
    confirmedAdmitted: 0,
    confirmedWaitlisted: 0,
    confirmedUSC: 0,
    declined: 0,

    transportationTotal: 0,
    transportation: {},

    confirmedTransportationTotal: 0,
    confirmedTransportation: {},

    confirmedFemale: 0,
    confirmedMale: 0,
    confirmedOther: 0,
    confirmedNone: 0,

    shirtSizes: {
      'XS': 0,
      'S': 0,
      'M': 0,
      'L': 0,
      'XL': 0,
      'XXL': 0,
      'WXS': 0,
      'WS': 0,
      'WM': 0,
      'WL': 0,
      'WXL': 0,
      'WXXL': 0,
      'None': 0
    },

    dietaryRestrictions: {},
    dietaryRestrictionCombinations: {},

    wantsHardware: 0,

    checkedIn: 0
  };

  User
    .find({})
    .exec(function(err, users){
      if (err || !users){
        throw err;
      }

      newStats.total = users.length;

      async.each(users, function(user, callback){
        // IGNORE STATS FOR ADMINS AND SPONSORS
        if (user.admin || user.sponsor) {
          callback();
          return;
        }

        // Grab the email extension
        var email = user.email.split('@')[1];

        // Add to the gender
        newStats.demo.gender[user.profile.gender] += 1;

        // Add to ethnicity
        newStats.demo.ethnicity[user.profile.ethnicity] += 1;

        // Add to year
        newStats.demo.year[user.profile.year] += 1;

        // Add to experience
        newStats.demo.experience[user.profile.experience] += 1;

        // Count verified
        newStats.verified += user.verified ? 1 : 0;

        // Count submitted
        newStats.submitted += user.status.submitted ? 1 : 0;

        // Count accepted
        newStats.admitted += user.status.admitted ? 1 : 0;

        // Count rejected
        newStats.rejected += user.status.rejected ? 1 : 0;

        // Count waitlisted
        newStats.waitlisted += user.status.waitlisted ? 1 : 0;

        // Count confirmed
        newStats.confirmed += user.status.confirmed ? 1 : 0;

        // Count confirmed admits
        newStats.confirmedAdmitted += (user.status.admitted && user.status.confirmed) ? 1 : 0;

        // Count confirmed waitlisted
        newStats.confirmedWaitlisted += (user.status.waitlisted && user.status.confirmed) ? 1 : 0;

        // Count confirmed that are USC
        newStats.confirmedUSC += user.status.confirmed && email === "usc.edu" ? 1 : 0;

        newStats.confirmedFemale += user.status.confirmed && user.profile.gender === "Female" ? 1 : 0;
        newStats.confirmedMale += user.status.confirmed && user.profile.gender === "Male" ? 1 : 0;
        newStats.confirmedOther += user.status.confirmed && user.profile.gender === "Other" ? 1 : 0;
        newStats.confirmedNone += user.status.confirmed && user.profile.gender === "Prefer not to answer" ? 1 : 0;

        // Count declined
        newStats.declined += user.status.declined ? 1 : 0;

        // Count the number of people who need transportation
        newStats.transportationTotal += user.profile.transportation ? 1 : 0;
        if(user.profile.transportation){
          if(!newStats.transportation[user.profile.school]){
            newStats.transportation[user.profile.school] = 0;
          }
          newStats.transportation[user.profile.school]++;
        }

        // Count schools, label by email
        if (!newStats.demo.schools[email]){
          newStats.demo.schools[email] = {
            name: '',
            verified: 0,
            submitted: 0,
            admitted: 0,
            rejected: 0,
            waitlisted: 0,
            confirmed: 0,
            declined: 0,
          };
        }
        newStats.demo.schools[email].name = user.profile.school;
        newStats.demo.schools[email].submitted += user.status.submitted ? 1 : 0;
        newStats.demo.schools[email].admitted += user.status.admitted ? 1 : 0;
        newStats.demo.schools[email].rejected += user.status.rejected ? 1: 0;
        newStats.demo.schools[email].waitlisted += user.status.waitlisted ? 1: 0;
        newStats.demo.schools[email].confirmed += user.status.confirmed ? 1 : 0;
        newStats.demo.schools[email].declined += user.status.declined ? 1 : 0;

        // Count the number of people who have confirmed transportation
        newStats.confirmedTransportationTotal += user.confirmation.needsTransportation ? 1 : 0;
        if (user.confirmation.needsTransportation) {
          if(!newStats.confirmedTransportation[user.confirmation.busStop]){
            newStats.confirmedTransportation[user.confirmation.busStop] = 0;
          }

          newStats.confirmedTransportation[user.confirmation.busStop]++;
        }

        // Account created and verified but not submitted
        newStats.demo.schools[email].verified += (!user.status.submitted && user.verified) ? 1 : 0;

        // Grab the team name if there is one
        if (user.teamCode && user.teamCode.length > 0){
          if (!newStats.teams[user.teamCode]){
            newStats.teams[user.teamCode] = [];
          }
          newStats.teams[user.teamCode].push(user.profile.name);
        }

        // Count shirt sizes
        if (user.confirmation.shirtSize in newStats.shirtSizes){
          newStats.shirtSizes[user.confirmation.shirtSize] += 1;
        }

        // Dietary restrictions
        if (user.confirmation.dietaryRestrictions){
          var combination = ''
          user.confirmation.dietaryRestrictions.forEach(function(restriction){
            if (!newStats.dietaryRestrictions[restriction]){
              newStats.dietaryRestrictions[restriction] = 0;
            }
            newStats.dietaryRestrictions[restriction] += 1;
            combination += restriction + ' ';
          });

          if (combination !== '') {
            if (!newStats.dietaryRestrictionCombinations[combination]) {
              newStats.dietaryRestrictionCombinations[combination] = 0
            }

            newStats.dietaryRestrictionCombinations[combination]++
          }
        }

        // Count checked in
        newStats.checkedIn += user.status.checkedIn ? 1 : 0;

        callback(); // let async know we've finished
      }, function() {
        // Transform dietary restrictions into a series of objects
        var restrictions = [];
        _.keys(newStats.dietaryRestrictions)
          .forEach(function(key){
            restrictions.push({
              name: key,
              count: newStats.dietaryRestrictions[key],
            });
          });
        newStats.dietaryRestrictions = restrictions;

        // Transform dietary restriction combinations into a series of objects
        var restrictionCombinations = [];
        _.keys(newStats.dietaryRestrictionCombinations)
          .forEach(function(key){
            restrictionCombinations.push({
              name: key,
              count: newStats.dietaryRestrictionCombinations[key],
            });
          });
        newStats.dietaryRestrictionCombinations = restrictionCombinations;

        // Transform transportation into an array of objects
        var transportation = [];
        _.keys(newStats.transportation)
            .forEach(function(key){
              transportation.push({
                school: key,
                count: newStats.transportation[key]
              });
            });
        newStats.transportation = transportation;

        // Transform confirmed transportation into an array of objects
        var confirmedTransportation = [];
        _.keys(newStats.confirmedTransportation)
            .forEach(function(key){
              confirmedTransportation.push({
                school: key,
                count: newStats.confirmedTransportation[key]
              });
            });
        newStats.confirmedTransportation = confirmedTransportation;

        // Transform schools into an array of objects
        var schools = [];
        _.keys(newStats.demo.schools)
          .forEach(function(key){
            schools.push({
              email: key,
              name: newStats.demo.schools[key].name,
              count: newStats.demo.schools[key].submitted,
              countWithVerified: newStats.demo.schools[key].submitted + newStats.demo.schools[key].verified,
              stats: newStats.demo.schools[key]
            });
          });
        newStats.demo.schools = schools;

        // Likewise, transform the teams into an array of objects
        var teams = [];
        _.keys(newStats.teams)
          .forEach(function(key){
            teams.push({
              name: key,
              users: newStats.teams[key]
            });
          });
        newStats.teams = teams;

        console.log('Stats updated!');
        newStats.lastUpdated = new Date();
        stats = newStats;
      });
    });

}

// Calculate once every five minutes.
calculateStats();
setInterval(calculateStats, 300000);

var Stats = {};

Stats.getUserStats = function(){
  return stats;
};

module.exports = Stats;
