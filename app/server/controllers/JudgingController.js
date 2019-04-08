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
 * Creates a csv of all the table assignments
 * @param callback
 */
JudgingController.exportTableAssignments = function (callback) {

};

/**
 * Creates a csv of all the Judging Data
 */
JudgingController.exportJudgingData = function (callback) {

};

/**
 * Clears the Project Table and stores the new file
 * Assigns table number while saving data
 * @param file
 * @param callback
 */
JudgingController.parseSubmissionData = function (file, callback) {

};

/**
 * Assigns the judges to the projects
 * @param callback
 */
JudgingController.assignJudging = function (callback) {

};

/**
 * Gets the projects to judge queue
 * @param user
 * @param callback
 */
JudgingController.getQueue = function (user, callback) {

};

/**
 *
 * @param projectId
 * @param judgeUser
 * @param scores
 * @param comments
 * @param callback
 */
JudgingController.updateJudging = function (projectId, judgeUser, scores, comments, callback) {

};

/**
 * Sets the role of the judge
 * @param userId
 * @param callback
 */
JudgingController.setRole = function (userId, callback) {

};

/**
 * Set the group of the judge
 * @param userId
 * @param callback
 */
JudgingController.setGroup = function (userId, callback) {

};

/**
 * Assigns user for review. Will not reassign, or assign more than allowed
 * @param userId
 * @param callback
 */
ReviewController.assignReview = function (userId, callback) {
    rankCount(false, function (err, adminUsers) {
        if (err || !adminUsers) {
            return callback(err);
        }

        User.findById(userId).exec(function (err, user) {
            if (err) {
                return callback(err);
            }

            // Get number of reviewers
            Settings.getReview(function (err, settings) {
                var reviewers = (settings.reviewers - user.review.reviewers.length); // remaining reviewers need to assign

                // assign to remaining reviewers. Will not assign if already fulfilled
                for (var i = 0; i < reviewers && i < adminUsers.length; i++) {
                    // assign user to reviewer
                    User.findOneAndUpdate({
                        _id: adminUsers[i].id,
                        verified: true
                    }, {
                        $push: {
                            'review.reviewQueue': userId,
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
                        _id: userId,
                        verified: true
                    }, {
                        $push: {
                            'review.reviewers': {
                                email: adminUsers[i].email,
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
                }
                callback();
            });
        });
    });
};

/**
 * Assigns all submitted users for review
 * @param id
 * @param callback
 */
ReviewController.assignReviews = function (callback) {
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
 * Gets the user queue for the specific admin id
 * @param user
 * @param callback
 */
ReviewController.getQueue = function (user, callback) {
    User.findById(user.id).exec(function (err, user) {
        if (err) {
            return callback(err);
        }
        callback(err, user.review.reviewQueue);
    });
};

/**
 * Updates a user's review
 * @param userId
 * @param adminUser
 * @param ratings
 * @param comments
 * @param callback
 */
ReviewController.updateReview = function (userId, adminUser, ratings, comments, callback) {
    var ratingSum = ratings.reduce(function (sum, val) {
        return sum + val
    });

    // update review
    User.findOneAndUpdate({
        _id: userId,
        verified: true,
        'review.reviewers.email': adminUser.email
    }, {
        $set: {
            'review.reviewers.$.ratings': ratings,
            'review.reviewers.$.comments': comments
        },
        $inc: {
            'review.overallRating' : ratingSum
        }
    }, {
        new: true
    }, function (err, user) {
        // pop the user from the admin's queue
        User.findOneAndUpdate({
            _id: adminUser.id,
            verified: true,
            admin: true
        }, {
            $pull: {
                'review.reviewQueue': userId,
            }
        }, callback);
    });
};

module.exports = JudgingController;
