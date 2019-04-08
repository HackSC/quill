import * as validator from "validator";

var mongoose = require('mongoose');

/**
 * Project Schema!
 * These are populated by uploading the devpost CSV
 *
 * @type {mongoose}
 */

var profile = {

  screenName: String,

  firstName: String,

  lastName: String,

  email: String,

};

var judging = {
  judges: [{
    email: {
      type: String,
      validate: [
        validator.isEmail,
        'Invalid Email',
      ],
    },
    scores: [Number],
    comments: String
  }],

  overallScore: {
    type: Number,
    default: 0,
  },

  prizes: [String]

};

var schema = new mongoose.Schema({

  submissionTitle: String,

  submissionUrl: String,

  plainDescription: String,

  video: String,

  website: String,

  fileUrl : String,

  desiredPrizes : [String],

  builtWith : [String],

  submitter : profile,

  schools: [String],

  teammates: [profile],

  // for judging
  judging: judging,
});

module.exports = mongoose.model('Projects', schema);
