var User = require('../models/User');
var Project = require('../models/Project');
var Settings = require('../models/Settings');

var JudgingController = {};

/**
 * Returns a promise that fulfills judging settings
 * @returns {Promise<any>}
 */
var getSettings = function () {
  return new Promise(function (resolve, reject) {
    Settings.getJudging(function (err, settings) {
      if (err) {
        reject(err);
      } else {
        resolve(settings);
      }
    });
  });
};

/**
 * Returns a promise that fulfills a list of judges
 * @returns {Promise<any>}
 */
var getJudges = function () {
  return new Promise(function (resolve, reject) {
    User.find({
      verified: true,
      judge: true,
    }, function (err, users) {
      if (err) {
        reject(err);
      } else {
        resolve(users);
      }
    })
  });
};

/**
 * Returns a promise that fulfills projects
 * @returns {Promise<any>}
 */
var getProjects = function () {
  return new Promise(function (resolve, reject) {
    Projects.find({}, function (err, projects) {
      if (err) {
        reject(err);
      } else {
        resolve(projects);
      }
    })
  });
};

/**
 * Returns entire project list sorted by their rank
 * @param callback
 */
JudgingController.getProjectsList = function (callback) {
  Project.find({}).sort({
    'judging.overallScores': -1
  }).exec(callback);
};

/**
 * Returns entire judges list sorted by their total judge count
 * @param callback
 */
JudgingController.getJudgesList = function (callback) {
  User.find({
    verified: true,
    judge: true,
  }).sort({
    'judging.count': 1
  }).exec(callback);
};

/**
 * Clears the Project Table and stores the new file
 * Assigns table number while saving data
 * @param data
 * @param callback
 */
JudgingController.uploadSubmissionsData = function (data, callback) {
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
  var assign = function (settings, judges, projects, callback) {
    // Get judge groups by user picked groups and individual groups
    var judgeGroups = new Map(settings.judgeGroups.map(e => [e.name, []]));
    var sponsorJudges = [];
    judges.forEach(function (judge) {
      if (judge.judging.role === 'General' && judge.judging.group !== '') {
        // Grouped
        if (judgeGroups.has(judge.judging.group)) {
          judgeGroups.get(judge.judging.group).push(judge);
        }
      } else if (judge.judging.role === 'Sponsor') {
        // No Group
        sponsorJudges.push(judge);
      }
    });

    // Get judge groups by category
    var categoryGroups = new Map(settings.generalJudgingCategories.map(e => [e, []]));
    settings.judgeGroups.forEach(function (group) {
      if (categoryGroups.has(group.category)) {
        categoryGroups.get(group.category).push({
          name: group.name,
          judges: judgeGroups.get(group.name)
        });
      }
    });

    // Assign Group Judging
    categoryGroups.forEach(function (judgeGroups, category) {
      // Find projects in each category
      Project.find({
        vertical: category
      }, function (err, projects) {
        if (err) {
          return callback(err);
        }

        var groupIndex = 0;
        for (let i = 0; i < projects.length; i++) {
          // combine them in to appropriate judges format
          let judges = judgeGroups[groupIndex].judges;

          // Update Project
          Project.findOneAndUpdate({
            _id: projects[i]._id,
          }, {
            $push: {
              'judging.judges': {
                $each: judges.map(e => ({email: e.email, scores: [], comments: ''}))
              }
            }
          }, {
            new: true
          }, function (err) {
            if (err) {
              return callback(err);
            }
          });

          // Update Judge queue
          judges.forEach(function (judge) {
            User.findOneAndUpdate({
              _id: judge._id
            }, {
              $push: {
                'judging.queue': projects[i]._id,
              },
              $inc: {
                'judging.count': 1,
              }
            }, {
              new: true
            }, function (err) {
              if (err) {
                return callback(err);
              }
            });
          });

          // Increase the groupIndex
          groupIndex++;
          if (groupIndex >= judgeGroups.length) {
            groupIndex = 0;
          }
        }
      });
    });

    // Assign Individual Judging
    sponsorJudges.forEach(function (judge) {
      // Update Project
      Project.find({
        desiredPrizes: {
          $in: judge.judging.categories
        }
      }, function (err, projects) {
        projects.forEach(function (project) {
          // Only update if need more judges
          if (project.judging.judges.length < settings.sponsorJudges) {
            // Update Project
            Project.findOneAndUpdate({
              _id: project._id
            }, {
              $push: {
                'judging.judges': {
                  email: judge.email,
                  scores: [],
                  comments: ''
                }
              }
            }, {
              new: true,
            }, function (err) {
              if (err) {
                return callback(err);
              }
            });

            // Update Judge
            User.findOneAndUpdate({
              _id: judge._id
            }, {
              $push: {
                'judging.queue': project._id,
              },
              $inc: {
                'judging.count': 1,
              }
            }, {
              new: true,
            }, function (err) {
              if (err) {
                return callback(err);
              }
            });
          }
        });
      });
    });
    callback();
  };

  getSettings().then(function (settings) {
    getJudges().then(function (judges) {
      getProjects().then(function (projects) {
        assign(settings, judges, projects, callback);
      }, function (err) {
        return callback(err)
      });
    }, function (err) {
      return callback(err);
    });
  }, function (err) {
    return callback(err);
  });

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
};

/**
 * Gets the projects to judge queue
 * @param id
 * @param callback
 */
JudgingController.getQueue = function (id, callback) {
  User.find({
    _id: id,
  }, function (err, user) {
    if (err) {
      return callback(err);
    }
    callback(err, user.judging.queue);
  });
};

/**
 * Updates the score of a project
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
  }, function (err, judgeUser) {
    if (err) {
      return callback(err);
    }

    // Update the Project
    Project.findOneAndUpdate({
      _id: projectId,
      'judging.judges.email': judgeUser.email,
    }, {
      $set: {
        'judging.judges.$.scores': scores,
        'judging.judges.$.comments': comments
      },
      $inc: {
        'judging.overallRating': scoreSum
      }
    }, {
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
JudgingController.addAward = function (projectId, award) {
  Project.findOneAndUpdate({
    _id: projectId
  }, {
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
JudgingController.removeAward = function (projectId, award) {
  Project.findOneAndUpdate({
    _id: projectId
  }, {
    $pull: {
      awards: award
    }
  });
};

module.exports = JudgingController;
