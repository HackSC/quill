const angular = require('angular');
const moment = require('moment');

angular.module('reg')
  .factory('Utils', [
    function(){
      return {
        isRegOpen: function (settings, email) {
          var usc = email.split('@')[1] === 'usc.edu';
          return Date.now() > settings.timeOpen && Date.now() < (!usc ? settings.timeClose : settings.timeCloseUSC);
        },
        isAnyRegOpen: function (settings) {
          return Date.now() > settings.timeOpen && Date.now() < Math.max(settings.timeClose, settings.timeCloseUSC);
        },
        isAfter: function (time) {
          return Date.now() > time;
        },
        formatTimeShort: function (time) {
          if (!time) {
            return "Invalid Date";
          }
          date = new Date(time);
          // Hack for timezone
          return moment(date).format('h:mm a');
        },
        formatTime: function (time) {

          if (!time) {
            return "Invalid Date";
          }

          date = new Date(time);
          // Hack for timezone
          return moment(date).format('dddd, MMMM Do YYYY, h:mm a') +
              " " + date.toTimeString().split(' ').slice(2).join(' ')

        },
      }
    }]);
