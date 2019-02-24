angular.module('reg')
  .controller('SponsorsUsersCtrl', [
    '$scope',
    function($scope) {
      $scope.filter = {
        experience: {
          beginner: true,
          intermediate: true,
          advanced: false
        },
        gender: {
          male: true,
          female: true
        },
        year: {
          '2022': false,
          '2021': false,
          '2020': false,
          '2019': false,
          'Graduate': false
        },
        skills: []
      }
    }]);
