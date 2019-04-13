var mongoose = require('mongoose');

var judgeGroup = {
  name: String,
  category: String,
};

/**
 * Settings Schema!
 *
 * Fields with select: false are not public.
 * These can be retrieved in controller methods.
 *
 * @type {mongoose}
 */
var schema = new mongoose.Schema({
  status: String,
  timeOpen: {
    type: Number,
    default: Date.now()
  },
  timeClose: {
    type: Number,
    default: Date.now() + 31104000000 // Add a year from now.
  },
  timeCloseUSC: {
    type: Number,
    default: Date.now() + 31104000000 // Add a year from now.
  },
  timeConfirm: {
    type: Number,
    default: Date.now() + (2 * 31104000000) // Date of confirmation
  },
  autoDecide: {
    type: String,
    enum: {
      values: [
          '',
          'Admit',
          'Waitlist',
          'Reject'
      ]
    },
    default: ''
  },
  whitelistedEmails: {
    type: [String],
    select: false,
    default: ['.edu'],
  },
  acceptanceText: {
    type: String
  },
  rejectionText: {
    type: String
  },
  waitlistText: {
    type: String
  },
  confirmationText: {
    type: String
  },
  allowMinors: {
    type: Boolean
  },
  reviewers: {
    type: Number,
    select: false,
    default: 3
  },
  reviewCriteria: {
    type: [String],
    select: false,
    default: ['Skill', 'Culture', 'Passion']
  },
  admissions: {
    type: Number,
    default: 800
  },
  timeJudge: {
    type: Number,
    default: Date.now()
  },
  generalJudges: {
    type: Number,
    select: false,
    default: 1
  },
  sponsorJudges: {
    type: Number,
    select: false,
    default: 1
  },
  generalJudgingCategories: {
    type: [String],
    select: false,
    default: ['Entrepreneurship', 'Entertainment', 'Transportation']
  },
  sponsorJudgingCategories: {
    type: [String],
    select: false,
    default: [
      '[Facebook] Facebook\'s Favorite Product',
      '[AWS] Best Mobile or Web App - First Place',
      '[AWS] Best Mobile or Web App - Second Place',
      '[AWS] Best Mobile or Web App - Third Place',
      '[iTradeNetwork] The Freshest Hack Challenge',
      '[OmniSci] OmniSci\'s Favorite Hack',
      '[Tailored Brands] Best use of Tailored Brand\'s data',
      '[Totle] Totle\'s Favorite Hack',
      '[Polarr] Polarr\'s Favorite Hack',
      '[Transposit] The Best Use of Transposit',
      '[Crowdstrike] Crowdstrike\'s Favorite Hack',
      '[Cloudflare] Best use of Serverless',
      '[GCP] Best Use of Google Cloud Platform',
      '[Blockstack] Blockstack\'s Favorite Hack',
      '[MLH] Best Use of Snap Kit',
      '[MLH] Best Domain Registered with Domain.com',
      '[MLH] Best IoT Hack using a Qualcomm Device',
    ]
  },
  judgingCriteria: {
    type: [String],
    select: false,
    default: [
        'Relevant',
        'Technical Complexity',
        '"Wow" Factor',
        'Functionality',
        'Passion',
        'Vertical Criteria #1',
        'Vertical Criteria #2',
        'Vertical Criteria #3'
    ]
  },
  judgeGroups: {
    type: [judgeGroup],
    select: false,
    default: [
      {name: 'Malibu', category: 'Entrepreneurship'},
      {name: 'Zuma', category: 'Entrepreneurship'},
      {name: 'Hermosa', category: 'Entrepreneurship'},
      {name: 'Manhattan', category: 'Entertainment'},
      {name: 'Paradise Cove', category: 'Entertainment'},
      {name: 'Santa Monica', category: 'Entertainment'},
      {name: 'Dockweiler', category: 'Transportation'},
      {name: 'Venice', category: 'Transportation'},
      {name: 'Redondo', category: 'Transportation'},
      {name: 'El Matador', category: 'Flexible'},
      {name: 'Huntington', category: 'Flexible'},
    ],
  },
  transportation: [{ // TODO: implement this
    school: String,
    coordinators: [{
      name: String,
      email: String,
    }],
    location: String,
    time: Number,
    select: false,
  }],
});

/**
 * Get the list of review criteria
 * Review criteria are by default not included in settings.
 * @param  {Function} callback args(err, reviewCriteria)
 */
schema.statics.getReview = function (callback) {
  this
      .findOne({})
      .select('reviewers reviewCriteria admissions')
      .exec(function (err, settings) {
        return callback(err, settings);
      });
};

/**
 * Get the list of judging criteria
 * Judging criteria are by default not included in settings.
 * @param  {Function} callback args(err, reviewCriteria)
 */
schema.statics.getJudging = function (callback) {
  this
      .findOne({})
      .select('timeJudge generalJudges sponsorJudges generalJudgingCategories sponsorJudgingCategories judgingCriteria judgeGroups')
      .exec(function (err, settings) {
        return callback(err, settings);
      });
};


/**
 * Get the list of whitelisted emails.
 * Whitelist emails are by default not included in settings.
 * @param  {Function} callback args(err, emails)
 */
schema.statics.getWhitelistedEmails = function (callback) {
  this
      .findOne({})
      .select('whitelistedEmails')
      .exec(function (err, settings) {
        return callback(err, settings.whitelistedEmails);
      });
};

/**
 * Get the open and close time for registration.
 * @param  {Function} callback args(err, times : {timeOpen, timeClose, timeConfirm})
 */
schema.statics.getRegistrationTimes = function (callback) {
  this
      .findOne({})
      .select('timeOpen timeClose timeConfirm')
      .exec(function (err, settings) {
        callback(err, {
          timeOpen: settings.timeOpen,
          timeClose: settings.timeClose,
          timeCloseUSC: settings.timeCloseUSC,
          timeConfirm: settings.timeConfirm
        });
      });
};

schema.statics.getPublicSettings = function (callback) {
  this
      .findOne({})
      .exec(callback);
};

module.exports = mongoose.model('Settings', schema);
