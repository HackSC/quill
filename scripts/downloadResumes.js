require('dotenv').load();

// Connect to MongoDB
var mongoose = require('mongoose');
var database = process.env.DATABASE || "mongodb://localhost:27017";
mongoose.connect(database);

// Import User model
var User = require('../app/server/models/User');

// Google Drive set up
var {google} = require('googleapis');

var CLIENT_EMAIL = process.env.CLIENT_EMAIL;
var PRIVATE_KEY = (process.env.NODE_ENV === 'production') ? JSON.parse(process.env.PRIVATE_KEY) : process.env.PRIVATE_KEY;

var scopes = [
    'https://www.googleapis.com/auth/drive.file'
];

const jwtClient = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    PRIVATE_KEY,
    scopes);

google.options({
    auth: jwtClient
});

var drive = google.drive('v3');

// File system
var fs = require('fs');

// Get all users and download resumes
User.find({}, (err, users) => {
  // Download resume for user if they have submitted
  users.forEach((user) => {
    if (user.status.submitted) {
      var resume = user.profile.resume;

      // Skip test resumes
      if (resume.id === '1') {
        return;
      }

      // Download resume to resumes folder
      var dest = fs.createWriteStream('./resumes/' + user.email + '.pdf');
      drive.files.get({
        fileId: resume.id,
        alt: 'media'
      }, {
        responseType: 'stream'
      }, function(err, res) {
       res.data
         .on('end', () => {
            console.log('Done');
         })
         .on('error', err => {
            console.log('Error', err);
         })
         .pipe(dest);
      });
    }
  })
});
