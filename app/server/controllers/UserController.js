var _ = require('underscore');
var User = require('../models/User');
var Settings = require('../models/Settings');
var Mailer = require('../services/email');
var Stats = require('../services/stats');

var validator = require('validator');
var moment = require('moment');

var UserController = {};

var maxTeamSize = process.env.TEAM_MAX_SIZE || 4;
var adminEmail = process.env.ADMIN_EMAIL;

// Tests a string if it ends with target s
function endsWith(s, test) {
  return test.indexOf(s, test.length - s.length) !== -1;
}

/**
 * Determine whether or not a user can register.
 * @param  {String}   email    Email of the user
 * @param  {Function} callback args(err, true, false)
 * @return {[type]}            [description]
 */
function canRegister(email, password, callback) {

  if (!password || password.length < 6) {
    return callback({message: "Password must be 6 or more characters."}, false);
  }

  // Check if its within the registration window.
  Settings.getRegistrationTimes(function (err, times) {
    if (err) {
      callback(err);
    }

    var now = Date.now();

    if (now < times.timeOpen) {
      return callback({
        message: "Registration opens in " + moment(times.timeOpen).fromNow() + "!"
      });
    }

    if (now > Math.max(times.timeClose, times.timeCloseUSC)) {
      return callback({
        message: "Sorry, registration is closed."
      });
    }

    // Check for emails.
    Settings.getWhitelistedEmails(function (err, emails) {
      if (err || !emails) {
        return callback(err);
      }
      for (var i = 0; i < emails.length; i++) {
        if (validator.isEmail(email) && endsWith(emails[i], email)) {
          return callback(null, true);
        }
      }
      return callback({
        message: "Not a valid educational email."
      }, false);
    });

  });
}

/**
 * Login a user given a token
 * @param  {String}   token    auth token
 * @param  {Function} callback args(err, token, user)
 */
UserController.loginWithToken = function (token, callback) {
  User.getByToken(token, function (err, user) {
    return callback(err, token, user);
  });
};

/**
 * Login a user given an email and password.
 * @param  {String}   email    Email address
 * @param  {String}   password Password
 * @param  {Function} callback args(err, token, user)
 */
UserController.loginWithPassword = function (email, password, callback) {

  if (!password || password.length === 0) {
    return callback({
      message: 'Please enter a password'
    });
  }

  if (!validator.isEmail(email)) {
    return callback({
      message: 'Invalid email'
    });
  }

  User
      .findOneByEmail(email)
      .select('+password')
      .exec(function (err, user) {
        if (err) {
          return callback(err);
        }
        if (!user) {
          return callback({
            message: "We couldn't find you!"
          });
        }
        if (!user.checkPassword(password)) {
          return callback({
            message: "That's not the right password."
          });
        }

        // yo dope nice login here's a token for your troubles
        var token = user.generateAuthToken();

        var u = user.toJSON();

        delete u.password;

        return callback(null, token, u);
      });
};

/**
 * Create a new user given an email and a password.
 * @param  {String}   email    User's email.
 * @param  {String}   password [description]
 * @param  {Function} callback args(err, user)
 */
UserController.createUser = function (email, password, callback) {

  if (typeof email !== "string") {
    return callback({
      message: "Email must be a string."
    });
  }

  email = email.toLowerCase();

  // Check that there isn't a user with this email already.
  canRegister(email, password, function (err, valid) {

    if (err || !valid) {
      return callback(err);
    }

    var u = new User();
    u.email = email;
    u.password = User.generateHash(password);
    u.save(function (err) {
      if (err) {
        // Duplicate key error codes
        if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
          return callback({
            message: 'An account for this email already exists.'
          });
        }

        return callback(err);
      } else {
        // yay! success.
        var token = u.generateAuthToken();

        // Send over a verification email
        var verificationToken = u.generateEmailVerificationToken();
        Mailer.sendVerificationEmail(email, verificationToken);

        return callback(
            null,
            {
              token: token,
              user: u
            }
        );
      }

    });
  });
};

UserController.getByToken = function (token, callback) {
  User.getByToken(token, callback);
};

/**
 * Get all users.
 * It's going to be a lot of data, so make sure you want to do this.
 * @param  {Function} callback args(err, user)
 */
UserController.getAll = function (callback) {
  User.find({}, callback);
};

/**
 * Get a page of users.
 * @param query
 * @param admin
 * @param  {Function} callback args(err, {users, page, totalPages})
 */
UserController.getPage = function (query, admin, callback) {
  var page = query.page;
  var size = parseInt(query.size);
  var searchText = query.text;
  var findQuery = {};
  var sortQuery = {};

  var buffer = new Buffer(query.filter, 'base64');
  var filter = JSON.parse(buffer.toString('ascii'));

  if (query.sponsor) {
    // Used by the sponsor portal
    // No need to show any admins or other sponsors
    // Only show submitted apps
    findQuery['admin'] = false;
    findQuery['sponsor'] = { "$in": [null, false]};
    findQuery['status.submitted'] = true;
  }

  // APPLY FILTERS
  if (filter !== undefined) {
      // Experience
      var experience = []

      if (filter.experience.beginner) { experience.push('Beginner') }
      if (filter.experience.intermediate) { experience.push('Intermediate') }
      if (filter.experience.advanced) { experience.push('Advanced') }

      if (experience.length >  0) {
        findQuery['profile.experience'] = { "$in": experience };
      }

      // Gender
      var gender = []

      if (filter.gender.male) { gender.push('Male') }
      if (filter.gender.female) { gender.push('Female') }

      if (gender.length >  0) {
        findQuery['profile.gender'] = { "$in": gender };
      }

      // Year
      var year = []

      if (filter.year.yr2019) { year.push('2019') }
      if (filter.year.yr2020) { year.push('2020') }
      if (filter.year.yr2021) { year.push('2021') }
      if (filter.year.yr2022) { year.push('2022') }
      if (filter.year.yrGraduate) { year.push('Graduate')}

      if (year.length > 0) {
        findQuery['profile.year'] = { "$in": year }
      }

      // Ethnicity
      var ethnicity = []

      if (filter.ethnicity.whiteCaucasian) { ethnicity.push("White / Caucasian") }
      if (filter.ethnicity.blackOrAfricanAmerican) { ethnicity.push("Black or African American") }
      if (filter.ethnicity.nativeAmerican) { ethnicity.push("Native American or Alaska Native") }
      if (filter.ethnicity.asianPacificIslander) { ethnicity.push("Asian / Pacific Islander") }
      if (filter.ethnicity.hispanic) { ethnicity.push("Hispanic / Latinx") }
      if (filter.ethnicity.multiracial) { ethnicity.push("Multiracial / Other") }

      if (ethnicity.length > 0) {
        findQuery['profile.ethnicity'] = { "$in": ethnicity }
      }

      // Status
      var status = []
      if (filter.status.submitted) { findQuery['status.submitted'] = true; }
      if (filter.status.admitted) { findQuery['status.admitted'] = true; }
      if (filter.status.waitlisted) { findQuery['status.waitlisted'] = true; }
      if (filter.status.confirmed) { findQuery['status.confirmed'] = true; }
      if (filter.status.checkedIn) { findQuery['status.checkedIn'] = true; }

      // Role
      var role = []
      if (filter.role.developer) { findQuery['profile.role.developer'] = true; }
      if (filter.role.designer) { findQuery['profile.role.designer'] = true; }
      if (filter.role.productManager) { findQuery['profile.role.productManager'] = true; }
  }

  if (query.sort === undefined || query.sort === '') {
    sortQuery['timestamp'] = 'asc';
  } else {
    // for some reason name virtual doesn't work
    var squery = query.sort.split(':')[0];
    var order = query.sort.split(':')[1];
    if (squery === 'profile.name') {
      sortQuery = {
        'profile.firstName': order,
        'profile.lastName': order,
      }
    } else if (squery === 'admin') {
      sortQuery['timestamp'] = 'asc';
      findQuery['admin'] = true;
    } else if (squery === 'review') {
      findQuery['review.reviewers'] = {
        $elemMatch: {
          email: admin.email,
        }
      };
      // sort in decreasing order
      sortQuery['review.overallRating'] = 'desc';
    } else {
      sortQuery[squery] = order;
    }
  }

  if (searchText.length > 0) {
    var queries = [];
    var re = new RegExp(searchText, 'i');
    queries.push({email: re});
    queries.push({'profile.name': re});
    queries.push({'teamCode': re});
    queries.push({'profile.school': re});
    queries.push({'profile.year': re});

    findQuery["$or"] = queries
  }

  // Search by skills
  if (filter.skills !== "") {
    var skillQueries = filter.skills.split(",");
    skillQueries = skillQueries.map((skill) => {
      return skill.toLowerCase().trim();
    })

    var skillQueriesRegEx = [];
    skillQueries.forEach((skill) => {
      var re = new RegExp(skill, 'i');
      skillQueriesRegEx.push({'profile.skills': re});
    })

    findQuery["$and"] = skillQueriesRegEx;
  }

  var getStatus = function (user) {

    if(user.status.checkedIn) {
      return 'checked in';
    }

    if (user.status.declined) {
      return "declined";
    }

    if (user.status.confirmed) {
      return "confirmed";
    }

    if (user.status.admitted) {
      return "admitted";
    }

    if (user.status.rejected) {
      return "rejected";
    }

    if (user.status.waitlisted) {
      return "waitlisted";
    }

    if (user.status.submitted) {
      return "submitted";
    }

    if (!user.verified) {
      return "unverified";
    }

    return "incomplete";

  };

  User
      .aggregate()
      .addFields({
        "profile.name": {$concat: ["$profile.firstName", " ", "$profile.lastName"]},
      })
      .match(findQuery)
      .sort(sortQuery)
      .skip(page * size)
      .limit(size)
      .exec(function (err, users) {
        if (err || !users) {
          return callback(err);
        }

        User.count(findQuery).exec(function (err, count) {

          if (err) {
            return callback(err);
          }

          users.forEach(user => {
            user.status.name = getStatus(user);
          });

          return callback(null, {
            users: users,
            page: page,
            size: size,
            totalPages: Math.ceil(count / size)
          });
        });

      });
};

/**
 * Get a CSV of user data with filters applied
 * @param query
 * @param admin
 * @param req
 * @param res
 */
UserController.getCSV = function (query, admin, req, res) {
  var searchText = query.text;
  var findQuery = {
    'admin': false,
    'sponsor': {
      '$in': [null, false]
    },
    'status.submitted': true
  };

  var sortQuery = {};

  var buffer = new Buffer(query.filter, 'base64');
  var filter = JSON.parse(buffer.toString('ascii'));

  // APPLY FILTERS
  if (filter !== undefined) {
      // Experience
      var experience = []

      if (filter.experience.beginner) { experience.push('Beginner') }
      if (filter.experience.intermediate) { experience.push('Intermediate') }
      if (filter.experience.advanced) { experience.push('Advanced') }

      if (experience.length >  0) {
        findQuery['profile.experience'] = { "$in": experience };
      }

      // Gender
      var gender = []

      if (filter.gender.male) { gender.push('Male') }
      if (filter.gender.female) { gender.push('Female') }

      if (gender.length >  0) {
        findQuery['profile.gender'] = { "$in": gender };
      }

      // Year
      var year = []

      if (filter.year.yr2019) { year.push('2019') }
      if (filter.year.yr2020) { year.push('2020') }
      if (filter.year.yr2021) { year.push('2021') }
      if (filter.year.yr2022) { year.push('2022') }
      if (filter.year.yrGraduate) { year.push('Graduate')}

      if (year.length > 0) {
        findQuery['profile.year'] = { "$in": year }
      }

      // Ethnicity
      var ethnicity = []

      if (filter.ethnicity.whiteCaucasian) { ethnicity.push("White / Caucasian") }
      if (filter.ethnicity.blackOrAfricanAmerican) { ethnicity.push("Black or African American") }
      if (filter.ethnicity.nativeAmerican) { ethnicity.push("Native American or Alaska Native") }
      if (filter.ethnicity.asianPacificIslander) { ethnicity.push("Asian / Pacific Islander") }
      if (filter.ethnicity.hispanic) { ethnicity.push("Hispanic / Latinx") }
      if (filter.ethnicity.multiracial) { ethnicity.push("Multiracial / Other") }

      if (ethnicity.length > 0) {
        findQuery['profile.ethnicity'] = { "$in": ethnicity }
      }

      // Status
      var status = []
      if (filter.status.submitted) { findQuery['status.submitted'] = true; }
      if (filter.status.admitted) { findQuery['status.admitted'] = true; }
      if (filter.status.waitlisted) { findQuery['status.waitlisted'] = true; }
      if (filter.status.confirmed) { findQuery['status.confirmed'] = true; }
      if (filter.status.checkedIn) { findQuery['status.checkedIn'] = true; }

      // Role
      var role = []
      if (filter.role.developer) { findQuery['profile.role.developer'] = true; }
      if (filter.role.designer) { findQuery['profile.role.designer'] = true; }
      if (filter.role.productManager) { findQuery['profile.role.productManager'] = true; }
  }

  if (query.sort === undefined || query.sort === '') {
    sortQuery['timestamp'] = 'asc';
  } else {
    // for some reason name virtual doesn't work
    var squery = query.sort.split(':')[0];
    var order = query.sort.split(':')[1];
    if (squery === 'profile.name') {
      sortQuery = {
        'profile.firstName': order,
        'profile.lastName': order,
      }
    } else if (squery === 'admin') {
      sortQuery['timestamp'] = 'asc';
      findQuery['admin'] = true;
    } else if (squery === 'review') {
      findQuery['review.reviewers'] = {
        $elemMatch: {
          email: admin.email,
        }
      };
      // sort in decreasing order
      sortQuery['review.overallRating'] = 'desc';
    } else {
      sortQuery[squery] = order;
    }
  }

  if (searchText.length > 0) {
    var queries = [];
    var re = new RegExp(searchText, 'i');
    queries.push({email: re});
    queries.push({'profile.name': re});
    queries.push({'teamCode': re});
    queries.push({'profile.school': re});
    queries.push({'profile.year': re});

    findQuery["$or"] = queries
  }

  // Search by skills
  if (filter.skills !== "") {
    var skillQueries = filter.skills.split(",");
    skillQueries = skillQueries.map((skill) => {
      return skill.toLowerCase().trim();
    })

    var skillQueriesRegEx = [];
    skillQueries.forEach((skill) => {
      var re = new RegExp(skill, 'i');
      skillQueriesRegEx.push({'profile.skills': re});
    })

    findQuery["$and"] = skillQueriesRegEx;
  }

  User
      .aggregate()
      .addFields({
        "profile.name": {$concat: ["$profile.firstName", " ", "$profile.lastName"]},
      })
      .match(findQuery)
      .sort(sortQuery)
      .exec(function (err, users) {
        if (err || !users) {
          return res.json({error: err});
        }

        var csvResponse = "";

        // Return CSV to user
        csvResponse += 'Email,Name,Gender,Ethnicity,School,Year,Major,Experience,Resume,Skills,Role,LinkedIn,GitHub,Other Links,Submitted,Admitted,Waitlisted,Confirmed,Checked In\n';

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
            user.profile.other,
            user.status.submitted ? (1) : (0),
            user.status.admitted ? (1) : (0),
            user.status.waitlisted ? (1) : (0),
            user.status.confirmed ? (1) : (0),
            user.status.checkedIn ? (1) : (0)
          ];

          info = info.map(val => {
            if(val !== undefined && val !== '')
              return '\"' + val + '\"';
            return '';
          });
          csvResponse += info.join(',') + '\n';
        });

        res.setHeader('Content-disposition', 'attachment; filename=hacksc-data.csv');
        res.set('Content-Type', 'text/csv');
        return res.status(200).send(csvResponse);
      });
}

/**
 * Get a user by id.
 * @param  {String}   id       User id
 * @param  {Function} callback args(err, user)
 */
UserController.getById = function (id, callback) {
  User.findById(id).exec(callback);
};

/**
 * Update a user's profile object, given an id and a profile.
 *
 * @param  {String}   id       Id of the user
 * @param  {Object}   profile  Profile object
 * @param  {Function} callback Callback with args (err, user)
 */
UserController.updateProfileById = function (id, profile, callback) {

  // Update without validation
  // Check if its within the registration window.
  Settings.getRegistrationTimes(function (err, times) {
    if (err) {
      callback(err);
    }

    var now = Date.now();

    if (now < times.timeOpen) {
      return callback({
        message: "Registration opens in " + moment(times.timeOpen).fromNow() + "!"
      });
    }

    if (now > Math.max(times.timeClose, times.timeCloseUSC)) {
      return callback({
        message: "Sorry, registration is closed."
      });
    }
  });

  User.findOneAndUpdate({
        _id: id,
        verified: true,
        'status.submitted': false
      },
      {
        $set: {
          'lastUpdated': Date.now(),
          'profile': profile
        }
      },
      {
        new: true
      },
      callback);
};

/**
 * Submits a user's profile object, given an id and a profile.
 * Also automatically adds them to be reviewed
 *
 * @param  {String}   id       Id of the user
 * @param  {Object}   profile  Profile object
 * @param  {Function} callback Callback with args (err, user)
 */
UserController.submitById = function (id, profile, callback) {

  // Validate the user profile, and mark the user as profile completed
  // when successful.
  User.validateProfile(profile, function (err) {

    if (err) {
      return callback({message: 'invalid profile'});
    }

    // Check if its within the registration window.
    Settings.getRegistrationTimes(function (err, times) {
      if (err) {
        callback(err);
      }

      var now = Date.now();

      if (now < times.timeOpen) {
        return callback({
          message: "Registration opens in " + moment(times.timeOpen).fromNow() + "!"
        });
      }

      if (now > Math.max(times.timeClose, times.timeCloseUSC)) {
        return callback({
          message: "Sorry, registration is closed."
        });
      }
    });

    User.findOneAndUpdate({
          _id: id,
          verified: true,
          'status.submitted': false
        },
        {
          $set: {
            'lastUpdated': Date.now(),
            'profile': profile,
            'status.submitted': true
          }
        },
        {
          new: true
        }, function(err, user){
          if(err){
            return callback(err);
          }
          // check for auto decide
          Settings.getPublicSettings(function(err, settings){
            if(err){
              return callback(err);
            }

            var adminUser = {email: adminEmail};

            if(settings.autoDecide === 'Accept'){
              UserController.admitUser(user._id, adminUser, callback);
            }else if(settings.autoDecide === 'Waitlist'){
              UserController.waitlistUser(user._id, adminUser, callback);
            }else if(settings.autoDecide === 'Reject'){
              UserController.rejectUser(user._id, adminUser, callback);
            }else{
              callback(err, user);
            }
          });
        });

  });
};

/**
 * Update a user's confirmation object, given an id and a confirmation.
 *
 * @param  {String}   id            Id of the user
 * @param  {Object}   confirmation  Confirmation object
 * @param  {Function} callback      Callback with args (err, user)
 */
UserController.updateConfirmationById = function (id, confirmation, callback) {

  User.findById(id).exec(function (err, user) {

    if (err || !user) {
      return callback(err);
    }

    // Make sure that the user followed the deadline, but if they're already confirmed
    // that's okay.
    if (Date.now() >= user.status.confirmBy && !user.status.confirmed) {
      return callback({
        message: "You've missed the confirmation deadline."
      });
    }

    // You can only confirm if you're admitted or waitlisted and haven't declined.
    User.findOneAndUpdate({
          '_id': id,
          'verified': true,
          'status.declined': {$ne: true},
          $or: [{
            'status.admitted': true,
          }, {
            'status.waitlisted': true,
          }]
        },
        {
          $set: {
            'lastUpdated': Date.now(),
            'confirmation': confirmation,
            'status.confirmed': true,
          }
        }, {
          new: true
        },
        callback);

  });
};

/**
 * Decline an acceptance, given an id.
 *
 * @param  {String}   id            Id of the user
 * @param  {Function} callback      Callback with args (err, user)
 */
UserController.declineById = function (id, callback) {

  // You can only decline if you've been accepted or waitlisted
  User.findOneAndUpdate({
        '_id': id,
        'verified': true,
        'status.declined': false,
        $or: [{
          'status.admitted': true,
        }, {
          'status.waitlisted': true,
        }]
      },
      {
        $set: {
          'lastUpdated': Date.now(),
          'status.confirmed': false,
          'status.declined': true
        }
      }, {
        new: true
      },
      callback);
};

/**
 * Verify a user's email based on an email verification token.
 * @param  {[type]}   token    token
 * @param  {Function} callback args(err, user)
 */
UserController.verifyByToken = function (token, callback) {
  User.verifyEmailVerificationToken(token, function (err, email) {
    User.findOneAndUpdate({
          email: email.toLowerCase()
        }, {
          $set: {
            'verified': true
          }
        }, {
          new: true
        },
        callback);
  });
};

/**
 * Get a specific user's teammates. NAMES ONLY.
 * @param  {String}   id       id of the user we're looking for.
 * @param  {Function} callback args(err, users)
 */
UserController.getTeammates = function (id, callback) {
  User.findById(id).exec(function (err, user) {
    if (err || !user) {
      return callback(err, user);
    }

    var code = user.teamCode;

    if (!code) {
      return callback({
        message: "You're not on a team."
      });
    }

    User
        .find({
          teamCode: code
        })
        .select(['profile.firstName', 'profile.lastName'])
        .exec(callback);
  });
};

/**
 * Given a team code and id, join a team.
 * @param  {String}   id       Id of the user joining/creating
 * @param  {String}   code     Code of the proposed team
 * @param  {Function} callback args(err, users)
 */
UserController.createOrJoinTeam = function (id, code, callback) {

  if (!code) {
    return callback({
      message: "Please enter a team name."
    });
  }

  if (typeof code !== 'string') {
    return callback({
      message: "Get outta here, punk!"
    });
  }

  User.find({
    teamCode: code
  })
      .select('profile.name')
      .exec(function (err, users) {
        // Check to see if this team is joinable (< team max size)
        if (users.length >= maxTeamSize) {
          return callback({
            message: "Team is full."
          });
        }

        // Otherwise, we can add that person to the team.
        User.findOneAndUpdate({
              _id: id,
              verified: true
            }, {
              $set: {
                teamCode: code
              }
            }, {
              new: true
            },
            callback);

      });
};

/**
 * Given an id, remove them from any teams.
 * @param  {[type]}   id       Id of the user leaving
 * @param  {Function} callback args(err, user)
 */
UserController.leaveTeam = function (id, callback) {
  User.findOneAndUpdate({
        _id: id
      }, {
        $set: {
          teamCode: null
        }
      }, {
        new: true
      },
      callback);
};

/**
 * Resend an email verification email given a user id.
 */
UserController.sendVerificationEmailById = function (id, callback) {
  User.findOne(
      {
        _id: id,
        verified: false
      },
      function (err, user) {
        if (err || !user) {
          return callback(err);
        }
        var token = user.generateEmailVerificationToken();
        Mailer.sendVerificationEmail(user.email, token);
        return callback(err, user);
      });
};

/**
 * Password reset email
 * @param  {[type]}   email    [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
UserController.sendPasswordResetEmail = function (email, callback) {
  User
      .findOneByEmail(email)
      .exec(function (err, user) {
        if (err || !user) {
          return callback(err);
        }

        var token = user.generateTempAuthToken();
        Mailer.sendPasswordResetEmail(email, token, callback);
      });
};

/**
 * UNUSED
 *
 * Change a user's password, given their old password.
 * @param  {[type]}   id          User id
 * @param  {[type]}   oldPassword old password
 * @param  {[type]}   newPassword new password
 * @param  {Function} callback    args(err, user)
 */
UserController.changePassword = function (id, oldPassword, newPassword, callback) {
  if (!id || !oldPassword || !newPassword) {
    return callback({
      message: 'Bad arguments.'
    });
  }

  User
      .findById(id)
      .select('password')
      .exec(function (err, user) {
        if (user.checkPassword(oldPassword)) {
          User.findOneAndUpdate({
                _id: id
              }, {
                $set: {
                  password: User.generateHash(newPassword)
                }
              }, {
                new: true
              },
              callback);
        } else {
          return callback({
            message: 'Incorrect password'
          });
        }
      });
};

/**
 * Reset a user's password to a given password, given a authentication token.
 * @param  {String}   token       Authentication token
 * @param  {String}   password    New Password
 * @param  {Function} callback    args(err, user)
 */
UserController.resetPassword = function (token, password, callback) {
  if (!password || !token) {
    return callback({
      message: 'Bad arguments'
    });
  }

  if (password.length < 6) {
    return callback({
      message: 'Password must be 6 or more characters.'
    });
  }

  User.verifyTempAuthToken(token, function (err, id) {

    if (err || !id) {
      return callback(err);
    }

    User
        .findOneAndUpdate({
          _id: id
        }, {
          $set: {
            password: User.generateHash(password)
          }
        }, function (err, user) {
          if (err || !user) {
            return callback(err);
          }

          Mailer.sendPasswordChangedEmail(user.email);
          return callback(null, {
            message: 'Password successfully reset!'
          });
        });
  });
};

/**
 * [ADMIN ONLY]
 *
 * Changes the user's overall rating. This can mean automatic accept or reject
 * @param id
 * @param user
 * @param rating
 * @param callback
 */
UserController.setOverallRating = function (id, user, rating, callback) {
  User.findOneAndUpdate({
    _id: id,
    verified: true
  }, {
    $set: {
      'review.overallRating': rating,
    }
  }, callback);
};

/**
 * [ADMIN ONLY]
 *
 * Admit a user.
 * @param  {String}   userId   User id of the admit
 * @param  {String}   user     User doing the admitting
 * @param  {Function} callback args(err, user)
 */
UserController.admitUser = function (id, user, callback) {
  Settings.getRegistrationTimes(function (err, times) {
    User
        .findOneAndUpdate({
              _id: id,
              verified: true
            }, {
              $set: {
                'status.admitted': true,
                'status.rejected': false,
                'status.waitlisted': false,
                'status.reviewedBy': user.email,
                'status.confirmBy': times.timeConfirm
              }
            }, {
              new: true
            },
            function (err, user) {
              if (err) {
                return callback(err);
              }
              // send mail
              Mailer.sendStatusChangeEmail(user.email);

              callback(err, user);
            });
  });
};

/**
 * [ADMIN ONLY]
 *
 * Admit a user by email.
 * @param  {String}   email   User email of the admit
 * @param  {String}   user     User doing the admitting
 * @param  {Function} callback args(err, user)
 */
UserController.admitUserByEmail = function (email, user, callback) {
  Settings.getRegistrationTimes(function (err, times) {
    User
        .findOneAndUpdate({
              email: email,
              verified: true
            }, {
              $set: {
                'status.admitted': true,
                'status.rejected': false,
                'status.waitlisted': false,
                'status.reviewedBy': user.email,
                'status.confirmBy': times.timeConfirm
              }
            }, {
              new: true
            },
            function (err, newUser) {
              if (err) {
                return callback(err);
              }
              Mailer.sendStatusChangeEmail(newUser.email);

              callback(err, newUser);
            });
  });
};

/**
 * [ADMIN ONLY]
 *
 * Reject a user.
 * @param  {String}   userId   User id of the reject
 * @param  {String}   user     User doing the rejecting
 * @param  {Function} callback args(err, user)
 */
UserController.rejectUser = function (id, user, callback) {
  Settings.getRegistrationTimes(function (err, times) {
    User
        .findOneAndUpdate({
              _id: id,
              verified: true
            }, {
              $set: {
                'status.admitted': false,
                'status.rejected': true,
                'status.waitlisted': false,
                'status.reviewedBy': user.email,
              }
            }, {
              new: true
            },
            function (err, newUser) {
              if (err) {
                return callback(err);
              }
              // send mail
              Mailer.sendStatusChangeEmail(newUser.email);

              callback(err, newUser);
            });
  });
};

/**
 * [ADMIN ONLY]
 *
 * Reject a user by email.
 * @param  {String}   email   User email of the admit
 * @param  {String}   user     User doing the admitting
 * @param  {Function} callback args(err, user)
 */
UserController.rejectUserByEmail = function (email, user, callback) {
  Settings.getRegistrationTimes(function (err, times) {
    User
        .findOneAndUpdate({
              email: email,
              verified: true
            }, {
              $set: {
                'status.admitted': false,
                'status.rejected': true,
                'status.waitlisted': false,
                'status.reviewedBy': user.email,
              }
            }, {
              new: true
            },
            function (err, user) {
              if (err) {
                return callback(err);
              }
              // send mail
              Mailer.sendStatusChangeEmail(user.email);

              callback(err, user);
            });
  });
};

/**
 * [ADMIN ONLY]
 *
 * Waitlist a user.
 * @param  {String}   userId   User id of the waitlist
 * @param  {String}   user     User doing the waitlisting
 * @param  {Function} callback args(err, user)
 */
UserController.waitlistUser = function (id, user, callback) {
  Settings.getRegistrationTimes(function (err, times) {
    User
        .findOneAndUpdate({
              _id: id,
              verified: true
            }, {
              $set: {
                'status.admitted': false,
                'status.rejected': false,
                'status.waitlisted': true,
                'status.reviewedBy': user.email,
                'status.confirmBy': times.timeConfirm
              }
            }, {
              new: true
            },
            function (err, user) {
              if (err) {
                return callback(err);
              }
              // send mail
              Mailer.sendStatusChangeEmail(user.email);

              callback(err, user);
            });
  });
};

/**
 * [ADMIN ONLY]
 *
 * Admit a user by email.
 * @param  {String}   email   User email of the admit
 * @param  {String}   user     User doing the admitting
 * @param  {Function} callback args(err, user)
 */
UserController.waitlistUserByEmail = function (email, user, callback) {
  Settings.getRegistrationTimes(function (err, times) {
    User
        .findOneAndUpdate({
              email: email,
              verified: true
            }, {
              $set: {
                'status.admitted': false,
                'status.rejected': false,
                'status.waitlisted': true,
                'status.reviewedBy': user.email,
                'status.confirmBy': times.timeConfirm
              }
            }, {
              new: true
            },
            function (err, user) {
              if (err) {
                return callback(err);
              }
              // send mail
              Mailer.sendStatusChangeEmail(user.email);

              callback(err, user);
            });
  });
};

/**
 * [ADMIN ONLY]
 *
 * Check in a user.
 * @param  {String}   userId   User id of the user getting checked in.
 * @param  {String}   user     User checking in this person.
 * @param  {Function} callback args(err, user)
 */
UserController.checkInById = function (id, user, callback) {
  User.findOneAndUpdate({
        _id: id,
        verified: true
      }, {
        $set: {
          'status.checkedIn': true,
          'status.checkInTime': Date.now()
        }
      }, {
        new: true
      },
      callback);
};

/**
 * [ADMIN ONLY]
 *
 * Check out a user.
 * @param  {String}   userId   User id of the user getting checked out.
 * @param  {String}   user     User checking in this person.
 * @param  {Function} callback args(err, user)
 */
UserController.checkOutById = function (id, user, callback) {
  User.findOneAndUpdate({
        _id: id,
        verified: true
      }, {
        $set: {
          'status.checkedIn': false
        }
      }, {
        new: true
      },
      callback);
};

/**
 * [ADMIN ONLY]
 *
 * Make user an admin
 * @param  {String}   userId   User id of the user being made admin
 * @param  {String}   user     User making this person admin
 * @param  {Function} callback args(err, user)
 */
UserController.makeAdminById = function (id, user, callback) {
  User.findOneAndUpdate({
        _id: id,
        verified: true
      }, {
        $set: {
          'admin': true
        }
      }, {
        new: true
      },
      callback);
};

/**
 * [ADMIN ONLY]
 *
 * Make user a sponsor
 * @param  {String}   userId   User id of the user being made admin
 * @param  {String}   user     User making this person admin
 * @param  {Function} callback args(err, user)
 */
UserController.makeSponsorById = function(id, user, callback){
  User.findOneAndUpdate({
    _id: id,
    verified: true
  },{
    $set: {
      'sponsor': true
    }
  }, {
    new: true
  },
  callback);
};

/**
 * [ADMIN ONLY]
 *
 * Remove user as admin
 * @param  {String}   userId   User id of the user removed as admin
 * @param  {String}   user     User removing this person as admin
 * @param  {Function} callback args(err, user)
 */
UserController.removeAdminById = function (id, user, callback) {
  User.findOneAndUpdate({
        _id: id,
        verified: true
      }, {
        $set: {
          'admin': false
        }
      }, {
        new: true
      },
      callback);
};

/**
 * [ADMIN ONLY]
 *
 * Make user a judge
 * @param  {String}   userId   User id of the user being made judge
 * @param  {String}   user     User making this person judge
 * @param  {Function} callback args(err, user)
 */
UserController.makeJudgeById = function (id, user, callback) {
  User.find({
    verified: true,
    _id: id,
  }, function (err, user){
    var set = {
      'judge': true,
    };
    if(user.judging === undefined){
      set['judging'] = {};
    }
    User.findOneAndUpdate({
      _id: id,
      verified: true
    }, {
      $set: set
    }, {
      new: true
    }, callback);
  });
};

/**
 * [ADMIN ONLY]
 *
 * Remove user as judge
 * @param  {String}   userId   User id of the user removed as judge
 * @param  {String}   user     User removing this person as judge
 * @param  {Function} callback args(err, user)
 */
UserController.removeJudgeById = function (id, user, callback) {
  User.findOneAndUpdate({
        _id: id,
        verified: true
      }, {
        $set: {
          'judge': false
        }
      }, {
        new: true
      },
      callback);
};

/**
 * [ADMIN ONLY]
 */

UserController.getStats = function (callback) {
  return callback(null, Stats.getUserStats());
};

module.exports = UserController;
