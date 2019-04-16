// My playground file for testing out Node.js code for converting user search to CSV
require('dotenv').config();

// Connect to mongodb
var mongoose        = require('mongoose');
var database        = process.env.DATABASE || "mongodb://localhost:27017";
mongoose.connect(database, {useNewUrlParser: true});

var fs = require('fs');

var User = require('../app/server/models/User');

// Helper method to convert strings appropriately for CSV
var quotesCSV = function(str) {
  if(str !== undefined && str !== '')
    return '\"' + str + '\"';
  return '';
};

// CSV arguments
var findQuery = {
  'admin': false,
  'sponsor': { '$in': [null, false] },
  'status.submitted': true,
  'profile.experience': { '$in': ['Beginner']},
  'profile.year': { '$in': ['2020', '2021'] }
}

var sortQuery = {
  'timestamp': 'asc'
}

// Used for timing CSV
var startTime, endTime;

console.log("Starting CSV generation");
var startTime = new Date().valueOf();

User
  .aggregate()
  .addFields({
    "profile.name": {$concat: ["$profile.firstName", " ", "$profile.lastName"]},
  })
  .match(findQuery)
  .sort(sortQuery)
  .exec(function (err, users) {
    if (err || !users) {
      console.log("Error :(");
      console.log(err);
      return;
    }

    var stream = fs.createWriteStream('scripts/data/hacksc-filtered.csv');
    stream.once('open', fd => {
      stream.write('Email,Name,Gender,Ethnicity,School,Year,Major,Experience,Resume,Skills,Role,LinkedIn,GitHub,Other Links\n');
      users.forEach(user => {
        var rolesl = [];
        var roles = '';

        if (user.profile.role) {
          if(user.profile.role.developer) rolesl.push("Developer");
          if(user.profile.role.designer) rolesl.push("Designer");
          if(user.profile.role.productManager) rolesl.push("Product Manager");
          var roles = rolesl.join(',');
        }

        var info = [
          user.email,
          user.profile.name,
          user.profile.gender,
          user.profile.ethnicity,
          user.profile.school,
          user.profile.year,
          user.profile.major,
          user.profile.experience,
          user.profile.resume.link,
          user.profile.skills,
          roles,
          user.profile.linkedin,
          user.profile.github,
          user.profile.other
        ];

        info = info.map(val => quotesCSV(val));
        stream.write(info.join(',') + '\n');
      });

      var endTime = new Date().valueOf();
      console.log(`Finished CSV generation! (${(endTime - startTime)} ms)`);
      stream.close();
    });
  });
