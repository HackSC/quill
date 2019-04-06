require('dotenv').load();

// Organizer E-mails
var organizers = [
  "anushka@usc.edu",
  "lharper@usc.edu",
  "lianwang@usc.edu",
  "aamarnat@usc.edu",
  "hsiaotuh@usc.edu",
  "chun960@usc.edu",
  "bentonye@usc.edu",
  "celebic@usc.edu",
  "diyameht@usc.edu",
  "ariellws@usc.edu",
  "sacksm@usc.edu",
  "wongkh@usc.edu",
  "bigger@usc.edu",
  "devikaku@usc.edu",
  "fdunlap@usc.edu",
  "margarrb@usc.edu",
  "rapolu@usc.edu",
  "emilyeli@usc.edu",
  "calebtho@usc.edu",
  "zeiders@usc.edu",
  "hmangalj@usc.edu",
  "ralphsun@usc.edu",
  "kushell@usc.edu",
  "alexanek@usc.edu",
  "deleur@usc.edu",
  "arjunvis@usc.edu",
  "wwillie@usc.edu"
]
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

var drive = google.drive({
  version: 'v3',
  auth: jwtClient
});

// File system
var fs = require('fs');

// Stat tracking
var downloadCount = 0;
var errorCount = 0;
var overallCount = 0;

// Delay Promise
function delay(duration) {
	return new Promise(function(resolve, reject){
		setTimeout(function(){
			resolve();
		}, duration)
	});
};

// Get all users and download resumes
User.find({}, (err, users) => {
  // Download resume for user if they have submitted
  overallCount = users.length;

  users.forEach((user, index) => {
    if (user.status.submitted) {
      var resume = user.profile.resume;
      var admitted = user.status.admitted;

      // Download resume to resumes folder
      delay(index * 1000).then(() => {
        var path = (admitted) ? ('admitted/') : ('other/');

        if (organizers.includes(user.email)) {
          path = 'organizers/';
        }
        
        var dest = fs.createWriteStream('./resumes/' + path + user.email + '.pdf');
        drive.files.get({
          auth: jwtClient,
          fileId: resume.id,
          alt: 'media'
        }, {
          responseType: 'stream'
        }, function(err, res) {
          if (err) {
            console.log('---------------------');
            console.log(err);

            errorCount++;
            console.log(`Error (${errorCount}/${overallCount})`);
            return;
          }

          res.data
            .on('end', () => {
              downloadCount++;
               console.log(`Done (${downloadCount}/${overallCount})`);
            })
            .on('error', err => {
              console.log('Error', err);
            })
            .pipe(dest);
        });
      })
    }
  })
});
