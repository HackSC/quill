require('dotenv').load();
var mongoose = require('mongoose');
var database = process.env.PROD_DATABASE || "mongodb://localhost:27017";
var jwt = require('jsonwebtoken');
mongoose.connect(database);

var User = require('../app/server/models/User');

var fs = require('fs');

// Pull user info into a csv
User.find({
  verified: true,
  admin: false,
  'status.submitted': true,
}, function(err, users){
  if(err){
    console.log(err);
  }
  //adds quotes
  let aq = function(str){
    if(str !== undefined && str !== '')
      return '\"' + str + '\"';
    return '';
  };
  console.log(users.length);
  var stream = fs.createWriteStream('scripts/data/HackSCData.csv');
  stream.once('open', fd => {
    stream.write('Email,Name,Gender,Ethnicity,School,Year,Major,Resume,Skills,Links,Role\n');
    users.forEach(user => {
      let rolesl = [];
      if(user.profile.role.developer) rolesl.push("Developer");
      if(user.profile.role.designer) rolesl.push("Designer");
      if(user.profile.role.productManager) rolesl.push("Product Manager");
      let roles = rolesl.join(',');
      let info = [user.email, user.profile.name, user.profile.gender, user.profile.ethnicity, user.profile.school, user.profile.year, user.profile.major, user.profile.resume.link, user.profile.skills, roles];
      info = info.map(val => aq(val));
      stream.write(info.join(',') + '\n');
    });
    stream.close();
    console.log('finished');
  });
});

// Pull user info into a csv
User.find({
  verified: true,
  admin: false,
  'status.submitted': true,
  'status.confirmed': true,
  'status.declined': false,
}, function(err, users){
  if(err){
    console.log(err);
  }
  //adds quotes
  let aq = function(str){
    if(str !== undefined && str !== '')
      return '\"' + str + '\"';
    return '';
  };
  console.log(users.length);
  var stream = fs.createWriteStream('scripts/data/RegistrationData.csv');
  stream.once('open', fd => {
    stream.write('First Name,Last Name,Email,Phone Number,School\n');
    users.forEach(user => {
      let info = [user.profile.firstName, user.profile.lastName, user.email, user.confirmation.phoneNumber.replace(/\D/g, ''), user.profile.school];
      info = info.map(val => aq(val));
      stream.write(info.join(',') + '\n');
    });
    stream.close();
    console.log('finished');
  });
});
