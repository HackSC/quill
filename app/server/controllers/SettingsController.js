var Settings = require('../models/Settings');

var SettingsController = {};

/**
 * Update any field in the settings.
 * @param  {String}   field    Name of the field
 * @param  {Any}      value    Value to replace it to
 * @param  {Function} callback args(err, settings)
 */
SettingsController.updateField = function (field, value, callback) {
  var update = {};
  update[field] = value;
  Settings
      .findOneAndUpdate({}, {
        $set: update
      }, {new: true}, callback);
};

SettingsController.getReview = function (callback) {
  Settings.getReview(callback);
};

SettingsController.updateReview = function (reviewers, reviewCriteria, callback) {
  Settings
      .findOneAndUpdate({}, {
        $set: {
          reviewers: reviewers,
          reviewCriteria: reviewCriteria
        }
      }, {new: true})
      .select('reviewers reviewCriteria')
      .exec(callback);
};


SettingsController.getJudging = function(callback){
  Settings.getJudging(callback);
};

SettingsController.updateJudging = function(generalJudges, sponsorJudges, generalJudgingCategories, sponsorJudgingCategories, judgingCriteria, judgeGroups, judgeDisableEditing, callback){
  Settings
      .findOneAndUpdate({}, {
        $set: {
          generalJudges: generalJudges,
          sponsorJudges: sponsorJudges,
          generalJudgingCategories: generalJudgingCategories,
          sponsorJudgingCategories: sponsorJudgingCategories,
          judgingCriteria: judgingCriteria,
          judgeGroups: judgeGroups,
          judgeDisableEditing: judgeDisableEditing,
        }
      }, {new: true})
      .select('generalJudges sponsorJudges generalJudgingCategories sponsorJudgingCategories judgingCriteria judgeGroups judgeDisableEditing')
      .exec(callback);
};

/**
 * Update the list of whitelisted emails and email extensions.
 * @param  {[type]}   emails   [description]
 * @param  {Function} callback args(err, settings)
 */
SettingsController.updateWhitelistedEmails = function (emails, callback) {
  Settings
      .findOneAndUpdate({}, {
        $set: {
          whitelistedEmails: emails
        }
      }, {new: true})
      .select('whitelistedEmails')
      .exec(callback);
};

/**
 * Get the list of whitelisted emails.
 * Whitelist emails are by default not included in settings.
 * @param  {Function} callback args(err, emails)
 */
SettingsController.getWhitelistedEmails = function (callback) {
  Settings.getWhitelistedEmails(callback);
};

/**
 * Set the time window for registrations.
 * If either open or close are null, do not change that time.
 * @param  {Number}   open     Open time in ms
 * @param  {Number}   close    Close time in ms
 * @param  {Function} callback args(err, settings)
 */
SettingsController.updateRegistrationTimes = function (open, close, closeUSC, callback) {
  var updatedTimes = {};

  if (close <= open || closeUSC <= open) {
    return callback({
      message: "Registration cannot close before or at exactly the same time it opens."
    });
  }

  if (open) {
    updatedTimes.timeOpen = open;
  }

  if (close) {
    updatedTimes.timeClose = close;
  }

  if (closeUSC) {
    updatedTimes.timeCloseUSC = closeUSC;
  }

  Settings
      .findOneAndUpdate({}, {
        $set: updatedTimes
      }, {new: true}, callback);
};

/**
 * Get the open and close time for registration.
 * @param  {Function} callback args(err, times : {timeOpen, timeClose})
 */
SettingsController.getRegistrationTimes = function (callback) {
  Settings.getRegistrationTimes(callback);
};

SettingsController.updateAutoDecide = function (autoDecide, callback) {
  Settings
      .findOneAndUpdate({}, {
        $set: {
          autoDecide: autoDecide
        }
      }, {new: true})
      .exec(callback);
};

/**
 * Get all public settings.
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
SettingsController.getPublicSettings = function (callback) {
  Settings.getPublicSettings(callback);
};

module.exports = SettingsController;
