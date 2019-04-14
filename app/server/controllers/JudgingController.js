var User = require('../models/User');
var Project = require('../models/Project');
var Settings = require('../models/Settings');

var moment = require('moment');
var parse = require('csv-parse');
var stringify = require('csv-stringify');

var JudgingController = {};

/**
 * Formats the time in h:mm a
 * @param time
 * @returns {string}
 */
var formatTime = function (time) {
  if (!time || time <= 0) {
    return 'N/A'
  }
  let date = new Date(time);
  // Hack for timezone
  return moment(date).utcOffset("-08:00").format('h:mm a');
};

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
    Project.find({}, function (err, projects) {
      if (err) {
        reject(err);
      } else {
        resolve(projects);
      }
    })
  });
};

/**
 * Returns one project
 * @param id
 * @param callback
 */
JudgingController.getProject = function (id, callback) {
  Project.findOne({
    _id: id,
  }, callback);
};

/**
 * Returns list of projects
 * @param projects
 * @param callback
 */
JudgingController.getProjects = function (projects, callback) {
  if (projects === undefined || projects.length <= 0) {
    return callback();
  } else {
    var idArray = projects.map(e => ({_id: e}));
    Project.find({
      $or: idArray
    }, callback);
  }
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
  // Clear all judging and projects
  var delProjects = new Promise(function (resolve, reject) {
    Project.deleteMany({}, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
  var delJudging = new Promise(function (resolve, reject) {
    User.updateMany({
      verified: true,
      judge: true,
    }, {
      $set: {
        'judging.queue': [],
        'judging.count': 0,
      }
    }, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve();
      }
    });
  });

  Promise.all([delProjects, delJudging]).then(function () {
    parseCSV(data, function (err, output) {
      if (err) {
        console.log(err);
      }
      // remove first item the header
      output.shift();
      // Add into projects
      let tableCounter = 0;
      let vrTableCounter = 0;
      while(tableCounter + vrTableCounter < output.length){
        let val = output[tableCounter+vrTableCounter];
        let p = new Project();
        p.submissionTitle = val[0];
        p.submissionUrl = val[1];
        p.plainDescription = val[2];
        p.video = val[3];
        p.website = val[4];
        p.fileUrl = val[5];
        p.desiredPrizes = val[6].split(',').map(v => v.trim()).slice(0, 6);
        p.builtWith = val[7].split(',').map(v => v.trim());
        p.vertical = val[8];
        p.vr = val[9] === 'Yes';
        // 10-12 is MLH
        p.submitter = {
          screenName: val[13],
          firstName: val[14],
          lastName: val[15],
          email: val[16],
        };
        p.schools = val[17].split(',').map(v => v.trim());
        p.teammates = [];
        p.judging = {
          judges: [],
          overallScore: 0,
          group: '',
        };
        p.awards = [];
        p.time = 0;

        if(!p.vr){
          let tableNum = tableCounter + 1 + 53;
          if(tableNum === 78){
            tableNum = 144;
          }else if(tableNum === 86){
            tableNum = 145
          }else if(tableNum === 99){
            tableNum = 146
          }else if(tableNum === 102){
            tableNum = 147
          }
          p.table = tableNum; // offset emergency
          tableCounter++;
        }else{
          p.table = 'V' + (vrTableCounter + 1);
          vrTableCounter++;
        }

        // add teammates
        let numTeammates = val[18];
        for (let j = 0; j < numTeammates; j++) {
          let index = 4 * j;
          p.teammates.push({
            screenName: val[18 + index + 1],
            firstName: val[18 + index + 2],
            lastName: val[18 + index + 3],
            email: val[18 + index + 4],
          });
        }

        p.save(function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
      callback();
    });
  });


  // Parse all the data and add as project
  var parseCSV = function (data, callback) {
    var output = [];
    // Create the parser
    var parser = parse({
      delimiter: ",",
      relax_column_count: true,
    });
    // Use the readable stream api
    parser.on('readable', function () {
      let record;
      while (record = parser.read()) {
        output.push(record)
      }
    });
    // Catch any error
    parser.on('error', function (err) {
      callback(err.message);
    });
    // When we are done, test that the parsed output matched what expected
    parser.on('end', function () {
      // can use output
      callback(null, output);
    });
    // Write to the parser
    parser.write(data.trim());
    // Close the readable stream
    parser.end()
  }
};

/**
 * Creates a csv of all the table assignments
 * @param callback
 */
JudgingController.exportTableAssignments = function (callback) {
  Project.find({}, function (err, projects) {
    exportCSV(projects, function (err, data) {
      if (err) {
        return callback(err);
      }
      callback(null, data.join(''));
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
    stringifier.write([
      'Project Name',
      'Submission Email',
      'Vertical',
      'Group',
      'Call Time',
      'Table Number']);
    stringifier.on('finish', function () {
      callback(null, data);
    });
    projects.forEach(function (project) {
      stringifier.write([
        project.submissionTitle,
        project.submitter.email,
        project.vertical,
        project.judging.group,
        formatTime(project.time),
        project.table]);
    });
    stringifier.end()
  };
};

/**
 * Creates a csv of all the Judging Data
 */
JudgingController.exportJudgingData = function (callback) {
  Project.find({}, function (err, projects) {
    exportCSV(projects, function (err, data) {
      if (err) {
        return callback(err);
      }
      callback(null, data.join(''));
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
    stringifier.write([
      'Project Name',
      'Devpost Link',
      'Submitter',
      'Vertical',
      'Group',
      'Time',
      'Table',
      'Prize Categories',
      'Awards']);
    projects.forEach(function (project) {
      stringifier.write([
        project.submissionTitle,
        project.submissionUrl,
        project.submitter.email,
        project.vertical,
        project.judging.group,
        formatTime(project.time),
        project.table,
        project.desiredPrizes.join(','),
        project.awards.join(',')]);
    });
    stringifier.end()
  };
};

/**
 * Assigns the judges to the projects
 * @param callback
 */
JudgingController.assignJudging = function (callback) {
  // Interval in ms
  var presentationTime = 7 * (60 * 1000);

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
    // Category Groups looks like category => {name, judges[]}
    var categoryGroups = new Map(settings.generalJudgingCategories.map(e => [e, []]));
    settings.judgeGroups.forEach(function (group) {
      if (categoryGroups.has(group.category)) {
        categoryGroups.get(group.category).push({
          name: group.name,
          judges: judgeGroups.get(group.name),
          queue: [],
        });
      }
    });

    // Assign Group Judging
    categoryGroups.forEach(function (judgeGroups, category) {
      Project.find({
        vertical: category
      }, function (err, projects) {
        // sort projects by vr
        projects.sort(function(p1, p2){
          return p1.vr - p2.vr;
        });
        if (err) {
          return callback(err);
        }

        let groupIndex = 0;
        var callTime = settings.timeJudge;
        for (let i = 0; i < projects.length; i++) {
          console.log(callTime);
          // combine them in to appropriate judges format

          // Update Project
          Project.findOneAndUpdate({
            _id: projects[i]._id,
          }, {
            $push: {
              'judging.judges': {
                $each: judgeGroups[groupIndex].judges.map(e => ({email: e.email, scores: [], comments: ''}))
              }
            },
            $set: {
              'judging.group': judgeGroups[groupIndex].name,
              'time': callTime,
            }
          }, {
            new: true
          }, function (err) {
            if (err) {
              return callback(err);
            }
          });

          // Update Judge queue
          judgeGroups[groupIndex].queue.push({id: projects[i]._id, judged: false});

          // Increase the groupIndex
          groupIndex++;
          if (groupIndex >= judgeGroups.length) {
            groupIndex = 0;
            // increase the calltime
            callTime += presentationTime;
          }
        }

        // judgeGroup queue properly populated -- can set for judges now
        judgeGroups.forEach(group => {
          User.updateMany({
            $or: group.judges.map(e => ({_id: e._id})),
          }, {
            $set: {
              'judging.queue': group.queue,
            }
          }, function (err, res) {
            // do nothing
          });
        })
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
        // todo: Only update if need more judges in settings.sponsorJudges

        // Update Judge
        User.findOneAndUpdate({
          _id: judge._id
        }, {
          $set: {
            'judging.queue': projects.map(e => ({id: e._id, judged: false})),
            'judging.count': projects.length
          }
        }, {
          new: true,
        }, function (err) {
          if (err) {
            return callback(err);
          }
        });

        // Update projects
        projects.forEach(function (project) {
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
        });
      });
    });
    callback();
  };

  getSettings().then(function (settings) {
    if (!settings) {
      return callback();
    }
    getJudges().then(function (judges) {
      if (!judges) {
        return callback();
      }
      getProjects().then(function (projects) {
        if (!projects) {
          return callback();
        }
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
};

/**
 * Gets the projects or judge queue
 * Returns a list of {name, id}
 * @param id
 * @param callback
 */
JudgingController.getQueue = function (id, callback) {
  User.findOne({
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

  // Get the Judge Profile and update judged or not
  User.findOneAndUpdate({
    verified: true,
    judge: true,
    _id: judgeId,
    'judging.queue.id': projectId
  }, {
    $set: {
      'judging.queue.$.judged': true,
    }
  }, {
    new: true,
  }, function (err, judgeUser) {
    if (err) {
      return callback(err);
    }

    if (!judgeUser) {
      return callback(err);
    }

    if (judgeUser.judging.role === 'General') {
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
          'judging.overallScore': scoreSum,
        }
      }, {
        new: true
      }, callback);
    } else if (judgeUser.judging.role === 'Sponsor') {
      // Update the Project
      Project.findOneAndUpdate({
        _id: projectId,
        'judging.judges.email': judgeUser.email,
      }, {
        $set: {
          'judging.judges.$.scores': scores,
          'judging.judges.$.comments': comments
        }
      }, {
        new: true
      }, callback);
    } else {
      callback();
    }


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
 * @param group
 * @param callback
 */
JudgingController.setGroup = function (id, group, callback) {
  User.findOneAndUpdate({
        verified: true,
        judge: true,
        _id: id,
      },
      {
        $set: {
          'judging.group': group,
        }
      },
      {
        new: true,
      },
      callback);
};

/**
 * Set the categories of the judge
 * @param id
 * @param categories
 * @param callback
 */
JudgingController.setCategories = function (id, categories, callback) {
  User.findOneAndUpdate({
        verified: true,
        judge: true,
        _id: id,
      },
      {
        $set: {
          'judging.categories': categories,
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
 * @param callback
 */
JudgingController.addAward = function (projectId, award, callback) {
  Project.findOneAndUpdate({
    _id: projectId
  }, {
    $push: {
      awards: award
    }
  }, {
    new: true
  }, callback);
};

/**
 * Removes an award from a project
 * @param projectId
 * @param award
 * @param callback
 */
JudgingController.removeAward = function (projectId, award, callback) {
  Project.findOneAndUpdate({
    _id: projectId
  }, {
    $pull: {
      awards: award
    }
  }, {
    new: true
  }, callback);
};

module.exports = JudgingController;
