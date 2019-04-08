var User = require('../models/User');
var Project = require('../models/Project');
var Settings = require('../models/Settings');

var JudgingController = {};

/**
 * Returns sorted descending list of submitted projects by their rating
 */
var rankScore = function (callback) {
  Project.find({}).sort({
    'judging.overallScores': -1
  }).exec(callback);
};

/**
 * Returns sorted ascending list of judges by their judge count
 */
var rankCount = function (callback) {
  User.find({
    verified: true,
    judge: true,
  }).sort({
    'judging.count': 1
  }).exec(callback);
};

/**
 * Returns entire project list sorted by their rank
 * @param callback
 */
JudgingController.getProjectsList = function (callback) {
  rankScore(callback);
};

/**
 * Returns entire judges list sorted by their total judge count
 * @param callback
 */
JudgingController.getJudgesList = function (callback) {
  rankCount(callback);
};

/**
 * Clears the Project Table and stores the new file
 * Assigns table number while saving data
 * @param file
 * @param callback
 */
JudgingController.parseSubmissionData = function (file, callback) {
  // TODO
};

/**
 * Creates a csv of all the table assignments
 * @param callback
 */
JudgingController.exportTableAssignments = function (callback) {
  // TODO
};

/**
 * Creates a csv of all the Judging Data
 */
JudgingController.exportJudgingData = function (callback) {
  // TODO
};

/**
 * Assigns the judges to the projects
 * @param callback
 */
JudgingController.assignJudging = function (callback) {
  // Assign General Judging
  // Get list of General Judges
  // Group them based on the category and group
  // For each category, evenly assign each submission to one group

  // Assign Sponsor Judging
  // Get list of Sponsor Judges
  // Assign all projects that include that sponsor prize
  Settings.getReview(function (err, settings) {
    if (err) {
      return callback(err);
    }

    // get the ascending list of admins
    rankCount(false, function (err, admins) {
      if (err) {
        return callback(err);
      }

      // find all users that need to be assigned
      User.find({
        verified: true,
        admin: false,
        'status.submitted': true,
      }, function (err, users) {
        if (err) {
          return callback(err)
        }

        // assign all users to admins for review
        var adminIndex = 0;
        for (let i = 0; i < users.length; i++) {
          // assign only up to settings.reviewers
          var reviewers = settings.reviewers - users[i].review.reviewers.length;
          for (let j = 0; j < reviewers; j++) {
            // adminIndex loop and distribution
            if (adminIndex >= admins.length) {
              adminIndex = 0;
            } else if (adminIndex < admins.length - 1 && admins[adminIndex].review.reviewCount < admins[adminIndex + 1].review.reviewCount) {
              // assign to admins with lower reviewCounts
              // when this happens, you've reached the next level of review counts, so go back to the start and iterate again
              adminIndex = 0;
            }
            // assign user to reviewer
            User.findOneAndUpdate({
              _id: admins[adminIndex].id,
              verified: true
            }, {
              $push: {
                'review.reviewQueue': users[i].id,
              },
              $inc: {
                'review.reviewCount': 1,
              }
            }, {
              new: true
            }, function (err) {
              if (err) {
                return callback(err);
              }
            });

            // assign reviewer to user
            User.findOneAndUpdate({
              _id: users[i].id,
              verified: true
            }, {
              $push: {
                'review.reviewers': {
                  email: admins[adminIndex].email,
                  ratings: [],
                  comments: ''
                }
              }
            }, {
              new: true
            }, function (err) {
              if (err) {
                return callback(err);
              }
            });
            adminIndex++;
          }
        }
      });
    });
  });
  callback();
};

/**
 * Gets the projects to judge queue
 * @param id
 * @param callback
 */
JudgingController.getQueue = function (id, callback) {
  User.find({
    _id: id,
  }, function(err, user){
    if(err){
      return callback(err);
    }
    callback(err, user.judging.queue);
  });
};

/**
 *
 * @param projectId
 * @param judgeId
 * @param scores
 * @param comments
 * @param callback
 */
JudgingController.updateJudging = function (projectId, judgeId, scores, comments, callback) {
  var scoreSum = scores.reduce(function (sum, val) {
    return sum + val
  });

  // Get the Judge Profile
  User.findOne({
    verified: true,
    judge: true,
    _id: judgeId
  }, function(err, judgeUser){
    if(err){
      return callback(err);
    }

    // Update the Project
    Project.findOneAndUpdate({
      _id: projectId,
      'judging.judges.email': judgeUser.email,
    },{
      $set: {
        'judging.judges.$.scores': scores,
        'judging.judges.$.comments': comments
      },
      $inc: {
        'judging.overallRating': scoreSum
      }
    },{
      new: true
    }, callback);

  });
};

/**
 * Sets the role of the judge
 * @param id
 * @param role
 * @param callback
 */
JudgingController.setRole = function (id, role, callback) {
  User.findOneAndUpdate({
        verified: true,
        judge: true,
        _id: id,
      },
      {
        $set: {
          'judging.role': role,
        }
      },
      {
        new: true,
      },
      callback);
};

/**
 * Set the group of the judge
 * @param id
 * @param callback
 */
JudgingController.setGroup = function (id, callback) {
  User.findOneAndUpdate({
        verified: true,
        judge: true,
        _id: userId,
      },
      {
        $set: {
          'judging.group': role,
        }
      },
      {
        new: true,
      },
      callback);
};

/**
 * Adds an award from a project
 * @param projectId
 * @param award
 */
JudgingController.addAward = function (projectId, award){
  Project.findOneAndUpdate({
    _id: projectId
  },{
    $push: {
      awards: award
    }
  });
};

/**
 * Removes an award from a project
 * @param projectId
 * @param award
 */
JudgingController.removeAward = function (projectId, award){
  Project.findOneAndUpdate({
    _id: projectId
  },{
    $pull: {
      awards: award
    }
  });
};

module.exports = JudgingController;
