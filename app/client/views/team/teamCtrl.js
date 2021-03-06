angular.module('reg')
  .controller('TeamCtrl', [
    '$scope',
    'currentUser',
    'settings',
    'Utils',
    'UserService',
    'TEAM',
    function($scope, currentUser, settings, Utils, UserService, TEAM){
      // Get the current user's most recent data.
      var Settings = settings.data;

      $scope.regIsOpen = Utils.isRegOpen(Settings, currentUser.data.email);

      $scope.user = currentUser.data;

      $scope.TEAM = TEAM;

      function _populateTeammates() {
        UserService
          .getMyTeammates()
          .then(response => {
            $scope.error = null;
            $scope.teammates = response.data;
          })
      }

      if ($scope.user.teamCode){
        _populateTeammates();
      }

      $scope.joinTeam = function(){
        var code = $scope.code;

        if (code === undefined || code === '') {
          $scope.error = 'Please enter a team name.';
          return;
        }

        UserService
          .joinOrCreateTeam($scope.code)
          .then(response => {
            $scope.error = null;
            $scope.user = response.data;
            _populateTeammates();
          }, response => {
            $scope.error = response.data.message;
          });
      };

      $scope.leaveTeam = function(){
        UserService
          .leaveTeam()
          .then(response => {
            $scope.error = null;
            $scope.user = response.data;
            $scope.teammates = [];
          }, response => {
            $scope.error = response.data.message;
          });
      };

    }]);
