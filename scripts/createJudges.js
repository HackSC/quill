require('dotenv').config();
// Connect to mongodb
var mongoose = require('mongoose');
var database = process.env.DATABASE || "mongodb://localhost:27017";
mongoose.connect(database, {useNewUrlParser: true});

var User = require('../app/server/models/User');
var Settings = require('../app/server/models/Settings');
var stringify = require('csv-stringify');
var fs = require('fs');

Settings.getJudging(function(err, settings){
  create(settings);
  generateData(settings);
});

var create = function (settings) {
  var groups = settings.judgeGroups;
  var categories = settings.sponsorJudgingCategories;
  var users = 50;
  var username = 'judge';
  var sponsors = 10;
  for (let i = 0; i < users; i++) {
    console.log('creating: ' + username + i);
    let email = username + i + '@school.edu';
    let password = 'foobar';

    let role = (i < users - sponsors) ? 'General' : 'Sponsor';
    let group = groups[i % groups.length].name;
    let category = categories[i % categories.length];

    // create new user
    var u = new User();
    u.email = email;
    u.password = User.generateHash(password);
    u.verified = true;
    u.judge = true;
    u.status.submitted = true;
    u.profile = {
      firstName: username,
      lastName: i,
      gender: "Male",

      ethnicity: 'White / Caucasian',

      school: "School",

      year: '2020',

      major: 'Computer Science',

      experience: 'Beginner',

      resume: {
        name: 'test',
        id: '1',
        link: 'https://google.com'
      },

      essay1: 'Test essay 1',

      essay2: 'Test essay 2',

      essay3: 'Test essay 3',

      skills: 'Hacking',

      linkedin: 'linkedin',
      github: 'github',
      other: 'other',

      role: {
        developer: true,
        designer: false,
        productManager: false,
        other: ''
      },

      transportation: true,

      adult: true,

      mlh: true

    };
    u.judging = {
      role: role,
      group: group,
      categories: [category]
    };
    u.save(function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log(username + i + ' created');
      }
    });
  }
};

// create csv
var generateData = function (settings) {
  var verticals = settings.generalJudgingCategories;
  var categories = settings.sponsorJudgingCategories;
  let stream = fs.createWriteStream('scripts/data/devpost-test.csv');
  stream.once('open', fd => {
    stream.write('Submission Title,Submission Url,Plain Description,Video,Website,File Url,Desired Prizes,Built With,Select Vertical Prize Category,Submitter Screen Name,Submitter First Name,Submitter Last Name,Submitter Email,College/Universities Of Team Members,Additional Team Member Count,...\n');
    var projects = [];
    for (let i = 1; i <= 300; i++) {
      let vertical = verticals[i % verticals.length];
      let category = categories[i % categories.length];
      projects.push([
        'Project' + i,
        'https://hacksc.com',
        'Submission Title,Submission Url,Plain Description,Video,Website,File Url,Vertical,Desired Prizes,Built With,Submitter Screen Name,Submitter First Name,Submitter Last Name,Submitter Email,College/Universities Of Team Members,Additional Team Member Count\nSubmission Title,Submission Url,Plain Description,Video,Website,File Url,Vertical,Desired Prizes,Built With,Submitter Screen Name,Submitter First Name,Submitter Last Name,Submitter Email,College/Universities Of Team Members,Additional Team Member Count\nSubmission Title,Submission Url,Plain Description,Video,Website,File Url,Vertical,Desired Prizes,Built With,Submitter Screen Name,Submitter First Name,Submitter Last Name,Submitter Email,College/Universities Of Team Members,Additional Team Member Count\nSubmission Title,Submission Url,Plain Description,Video,Website,File Url,Vertical,Desired Prizes,Built With,Submitter Screen Name,Submitter First Name,Submitter Last Name,Submitter Email,College/Universities Of Team Members,Additional Team Member Count\nSubmission Title,Submission Url,Plain Description,Video,Website,File Url,Vertical,Desired Prizes,Built With,Submitter Screen Name,Submitter First Name,Submitter Last Name,Submitter Email,College/Universities Of Team Members,Additional Team Member Count\n',
        'video',
        'https://apply.hacksc.com',
        '',
        category,
        'Node.js',
        vertical,
        'submitter' + i,
        'Submitter' + i,
        'Last Name',
        'submitter' + i + '@school.edu',
        'USC',
        '0',
      ]);
    }
    exportCSV(projects, function (err, data) {
      if (err) {
        console.log(err);
      }
      stream.write(data.join(''));
      console.log('done writing');
      stream.close();
    });
  });

  var exportCSV = function (projects, callback) {
    let data = [];
    let stringifier = stringify({
      delimiter: ','
    });
    stringifier.on('readable', function () {
      let row;
      while (row = stringifier.read()) {
        data.push(row)
      }
    });
    stringifier.on('error', function (err) {
      callback(err);
    });
    stringifier.on('finish', function () {
      callback(null, data);
    });
    projects.forEach(function (project) {
      stringifier.write(project)
    });
    stringifier.end()
  };
};
