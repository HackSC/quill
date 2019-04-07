const moment = require('moment');
const swal = require('sweetalert');

angular.module('reg')
  .controller('SponsorsUsersCtrl', [
    '$scope',
    '$state',
    '$stateParams',
    'UserService',
    function($scope, $state, $stateParams, UserService){
      // Persistent Options
      $scope.sortOption = $stateParams.sort || 'timestamp:asc';
      $scope.queryText = $stateParams.query || '';

      $scope.showFilter = false;

      if ($stateParams.filter) {
        $scope.filter = JSON.parse(window.atob($stateParams.filter));
      } else {
        $scope.filter = {
          experience: {
            beginner: false,
            intermediate: false,
            advanced: false
          },
          gender: {
            male: false,
            female: false
          },
          year: {
            'yr2022': false,
            'yr2021': false,
            'yr2020': false,
            'yr2019': false,
            'yrGraduate': false
          },
          ethnicity: {
            whiteCaucasian: false,
            blackOrAfricanAmerican: false,
            nativeAmerican: false,
            asianPacificIslander: false,
            hispanic: false,
            multiracial: false
          },
          status: {
            submitted: false,
            admitted: false,
            waitlisted: false,
            confirmed: false,
            checkedIn: false
          },
          skills: []
        }
      }

      $scope.pages = [];
      $scope.users = [];
      $scope.sortOptions = [{
        name: 'Default',
        value: 'timestamp',
        order: 'asc'
      },{
        name: 'Name',
        value: 'profile.name',
        order: 'asc'
      },{
        name: 'Review Rating',
        value: 'review.overallRating',
        order: 'desc'
      },{
        name: 'Admin',
        value: 'admin',
        order: 'true'
      },{
        name: 'My Reviews',
        value: 'review',
        order: 'true',
      }];

      // Semantic-UI moves modal content into a dimmer at the top level.
      // While this is usually nice, it means that with our routing will generate
      // multiple modals if you change state. Kill the top level dimmer node on initial load
      // to prevent this.
      $('.ui.dimmer').remove();

      // Populate the size of the modal for when it appears, with an arbitrary user.
      $scope.selectedUser = {};
      $scope.selectedUser.sections = generateSections({
        status: '',
        review: '',
        confirmation: {
            dietaryRestrictions: []
        },
        profile: ''});

      function updatePage(data){
        $scope.users = data.users;
        $scope.currentPage = data.page;
        $scope.pageSize = data.size;

        var p = [];
        for (var i = 0; i < data.totalPages; i++){
          p.push(i);
        }
        $scope.pages = p;
      }

      UserService
        .getPageSponsors($stateParams.page, $stateParams.size, $stateParams.sort, $stateParams.query, window.btoa(JSON.stringify($scope.filter)))
        .then(response => {
          updatePage(response.data);
        });

      $scope.sortBy = function(sortOption){
        $stateParams.sort = sortOption;
        UserService
            .getPageSponsors($stateParams.page, $stateParams.size, sortOption, $stateParams.query, window.btoa(JSON.stringify($scope.filter)))
            .then(response => {
              updatePage(response.data);
            });
      };

      $scope.$watch('queryText', function(queryText){
        $stateParams.queryText = queryText;

        UserService
          .getPageSponsors($stateParams.page, $stateParams.size, $stateParams.sort, queryText, window.btoa(JSON.stringify($scope.filter)))
          .then(response => {
            updatePage(response.data);
          });
      });

      $scope.$watch('filter', function(filter) {
        console.log(filter);

        UserService
          .getPageSponsors($stateParams.page, $stateParams.size, $stateParams.sort, $stateParams.queryText, window.btoa(JSON.stringify(filter)))
          .then(response => {
            updatePage(response.data);
          });
      }, true);

      $scope.goToPage = function(page){
        $state.go('app.sponsors.users', {
          page: page,
          size: $stateParams.size || 50,
          sort: $scope.sortOption || $stateParams.sort,
          query: $scope.queryText || $stateParams.query,
          filter: window.btoa(JSON.stringify($scope.filter))
        });
      };

      $scope.goUser = function($event, user){
        console.log(user);
        $event.stopPropagation();

        $state.go('app.sponsors.user', {
          id: user.id
        });
      };

      function formatTime(time){
        if (time) {
          return moment(time).format('MMMM Do YYYY, h:mm:ss a');
        }
      }

      $scope.rowClass = function(user) {
        if (user.admin){
          return 'admin';
        }
        if (user.status.confirmed) {
          return 'positive';
        }
        if (user.status.admitted && !user.status.confirmed) {
          return 'warning';
        }
      };

      function selectUser(user){
        $scope.selectedUser = user;
        $scope.selectedUser.sections = generateSections(user);
        $('.long.user.modal')
          .modal('show');
      }

      function generateSections(user){
        return [
          {
            name: 'Basic Info',
            fields: [
              {
                name: 'Checked In',
                value: formatTime(user.status.checkInTime) || 'N/A'
              },{
                name: 'Email',
                value: user.email
              }
            ]
          },{
            name: 'Profile',
            fields: [{
                name: 'First Name',
                value: user.profile.firstName
              },{
                name: 'Last Name',
                value: user.profile.lastName
              },{
                name: 'Gender',
                value: user.profile.gender
              },{
                name: 'Ethnicity',
                value: user.profile.ethnicity
              },{
                name: 'School',
                value: user.profile.school
              },{
                name: 'Year',
                value: user.profile.year
              },{
                name: 'Major',
                value: user.profile.major
              },{
                name: 'Experience',
                value: user.profile.experience
              },{
                name: 'Resume',
                title: (user.profile.resume ? user.profile.resume.name : ''),
                value: (user.profile.resume ? user.profile.resume.link : ''),
                type: 'link'
              },{
                name: 'Skills',
                value: user.profile.skills
              },{
                name: 'LinkedIn',
                value: user.profile.linkedin
              },{
                name: 'Github',
                value: user.profile.github
              },{
                name: 'Other',
                value: user.profile.other
              },{
                name: 'Role',
                value: (user.profile.role ?
                          ((user.profile.role.developer ? 'Developer, ' : '')
                          + (user.profile.role.designer ? 'Designer, ' : '')
                          + (user.profile.role.productManager ? 'Product Manager, ' : '')
                          + (user.profile.role.other ? user.profile.other : '')) : '')
              }
            ]
          }
        ];
      }

      $scope.selectUser = selectUser;
    }]);
