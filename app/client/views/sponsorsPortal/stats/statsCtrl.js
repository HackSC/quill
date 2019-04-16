const moment = require('moment');

angular.module('reg')
  .controller('SponsorsStatsCtrl', [
    '$scope',
    'UserService',
    function($scope, UserService) {
      UserService
        .getStats()
        .then(stats => {
          $scope.stats = stats.data;
          $scope.loading = false;
        })

      $scope.fromNow = function(date) {
        return moment(date).fromNow();
      }
    }]);
