const angular = require('angular');
const moment = require('moment');
const swal = require('sweetalert');

angular.module('reg')
    .controller('JudgeCtrl', [
      '$scope',
      '$timeout',
      'currentUser',
      'settings',
      'UserService',
      'SettingsService',
      'JudgeService',
      function ($scope, $timeout, currentUser, settings, UserService, SettingsService, JudgeService) {
        // Settings and Data
        $scope.toast = false;
        $scope.loading = false;
        $scope.showAll = false;
        $scope.scoresRange = [0, 10];
        $scope.judgesList = [];
        $scope.allProjects = [];
        $scope.settings = settings.data;

        // User and Projects
        $scope.user = currentUser.data;
        $scope.projects = []; // is of object {name, id}
        $scope.currentProject = {
          judging: {},
        };
        $scope.project = {};
        var projectIndex = 0;

        // Scoring
        $scope.scores = [];
        $scope.comments = '';

        //Enable UI
        $('#categories')
            .dropdown({
              allowAdditions: true,
              values: $scope.settings.sponsorJudgingCategories
                  .map(e => ({name: e, value: e}))
            });
        $('#categories')
            .dropdown('set selected', $scope.user.judging.categories);

        $scope.showModal = function() {
          angular.element('.ui.modal')
              .modal('show');
        };

        $scope.toggleAll = function() {
          $scope.showAll = !$scope.showAll;
          nextProject();
        };

        // Populate fields
        $scope.refresh = function(){
          clearCurrentJudging();
          getProjectsList();
          getJudgesList();
          getQueue();
        };

        $scope.refresh();

        // Helper Functions

        function nextProject() {
          projectIndex = 0;
          // Find the next non-judged project
          while($scope.user.judging !== undefined && $scope.user.judging.queue.length > 0 && $scope.user.judging.queue[projectIndex].judged){
            projectIndex++;
            // Check if out of bounds
            if (projectIndex >= $scope.projects.length) {
              // you've finished, show all
              $scope.showAll = true;
              projectIndex = 0;
              return;
            }
          }

          if ($scope.projects.length > 0) {
            $scope.loading = true;
            JudgeService.getProject($scope.projects[projectIndex]._id)
                .then(response => {
                  // Set project to show
                  var project = response.data;
                  $scope.currentProject = project;
                  $scope.loading = false;
                }, err => {
                  $scope.loading = false;
                  swal('Uh oh!', 'Something went wrong.', 'error');
                });
          }
        }

        function clearCurrentJudging() {
          $scope.scores = new Array($scope.settings.judgingCriteria.length);
          $scope.scores.fill(0);
          $scope.comments = '';
        }

        function getProjectsList() {
          if ($scope.user.admin) {
            JudgeService.getProjectsList()
                .then(response => {
                  $scope.allProjects = response.data;
                }, err => {
                  console.log(err);
                });
          }
        }

        function getJudgesList() {
          if ($scope.user.admin) {
            JudgeService.getJudgesList()
                .then(response => {
                  $scope.judgesList = response.data;
                }, err => {
                  console.log(err);
                });
          }
        }

        function generateSections(project){
          return [
            {
              name: 'Project Info',
              fields: [
                {
                  name: 'Title',
                  value: project.submissionTitle,
                },{
                  name: 'Devpost URL',
                  value: project.submissionUrl,
                  type: 'link',
                },{
                  name: 'Description',
                  value: project.plainDescription,
                  type: 'markdown',
                },{
                  name: 'Video',
                  value: project.video,
                  type: 'link',
                },{
                  name: 'Website',
                  value: project.website,
                },{
                  name: 'File URL',
                  value: project.fileUrl,
                  type: 'link',
                },{
                  name: 'Prize Categories',
                  value: project.categories.join(', '),
                },{
                  name: 'Vertical',
                  value: project.vertical,
                },{
                  name: 'Built With',
                  value: project.builtWith.join(', '),
                },{
                  name: 'Schools',
                  value: project.schools,
                },{
                  name: 'Awards',
                  value: project.awards.join(', '),
                },{
                  name: 'Table Number',
                  value: project.table,
                },{
                  name: 'Call Time',
                  value: project.time,
                }
              ]
            },
          ];
        }

        $scope.upload = function (event) {
          // Check null
          if (event.files.length < 1) {
            return;
          }
          var file = event.files[0];

          // Check type
          if (file.name.split('.').pop() !== 'csv'){
            swal("Incorrect File Type", "Please select a csv file!", "error");
            return;
          }

          var reader = new FileReader();

          // Read the file and attempt to upload
          reader.onloadend = function () {
            // upload
            JudgeService.upload(reader.result)
                .then(response => {
                      // refresh
                      getProjectsList();
                      getJudgesList();
                      getQueue();
                      swal("Success!", "Projects have been uploaded.", "success");
                    }, err => {
                      swal("Uh oh!", "Something went wrong.", "error");
                    }
                );
          };

          reader.onerror = function(){
            swal("Error reading file", "Please select a different file.", "error")
          };

          reader.readAsText(file);
        };

        $scope.exportTableAssignments = function () {
          JudgeService.exportTableAssignments()
              .then(response => {
                var csvContent = "data:text/csv;charset=utf-8," + response.data;
                var encodedUri = encodeURI(csvContent);
                var downloadLink = document.createElement("a");
                downloadLink.href = encodedUri;
                downloadLink.download = "table-assignments.csv";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
              });
        };

        $scope.exportJudgingData = function () {
          JudgeService.exportJudgingData()
              .then(response => {
                var csvContent = "data:text/csv;charset=utf-8," + response.data;
                var encodedUri = encodeURI(csvContent);
                var downloadLink = document.createElement("a");
                downloadLink.href = encodedUri;
                downloadLink.download = "judging-data.csv";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
              });
        };

        $scope.assign = function () {
          JudgeService.assign()
              .then(response => {
                swal('Success!', 'Projects are assigned!', 'success');
              }, err => {
                swal('Uh oh!', 'something went wrong, try again?', 'error');
              });
        };

        function getQueue() {
          $scope.loading = true;
          JudgeService.getProjects($scope.user.judging.queue.map(e => e.id))
              .then(response => {
                var projects = response.data;
                $scope.projects = projects;

                // set metadata
                $scope.projects.forEach(project => {
                  project.award = '';
                  project.lastAward = '';
                  let intersect = project.awards.filter(value => $scope.user.judging.categories.includes(value));
                  if(intersect.length > 0){
                    project.award = intersect[0];
                  }
                });

                nextProject();
                $scope.loading = false;
              }, err => {
                $scope.loading = false;
                swal('Uh oh!', 'something went wrong, refresh to try again!', 'error');
              });
        }

        $scope.updateJudging = function () {
          // check in range
          var lowestscore = true;
          for(var i = 0; i < $scope.scores.length; i++){
            if($scope.scores[i] === undefined || $scope.scores[i] < $scope.scoresRange[0] || $scope.scores[i] > $scope.scoresRange[1]){
              swal('Oops', 'Scores must be between ' + $scope.scoresRange[0] + ' and ' + $scope.scoresRange[1], 'error');
              return;
            }
            if($scope.scores[i] !== $scope.scoresRange[0]){
              lowestscore = false;
              break;
            }
          }
          if(lowestscore){
            swal({
              buttons: {
                cancel: {
                  text: "Cancel",
                  value: null,
                  visible: true
                },
                accept: {
                  className: "danger-button",
                  closeModal: false,
                  text: "Submit",
                  value: true,
                  visible: true
                }
              },
              dangerMode: true,
              icon: "warning",
              text: "You are submitting all " + $scope.scoresRange[0] + "'s. Did you accidentally press submit, or are you actually giving that score?",
              title: "Whoa!"
            }).then(value => {
              if (!value) {
                return;
              }
              $scope.updating = true;
              JudgeService.updateJudging($scope.project._id, $scope.scores, $scope.comments)
                  .then(response => {
                    // set local
                    $scope.user.judging.queue[projectIndex].judged = true;
                    // clear for next user
                    clearCurrentJudging();
                    // get next project
                    nextProject();
                    $scope.toast = true;
                    $timeout(function(){
                      $scope.toast = false;
                    }, 3000);
                    swal.close();
                    $scope.updating = false;
                  }, err => {
                    swal('Oops!', 'Something went wrong', 'error');
                    $scope.updating = false;
                  });
            });
          }else{
            // update otherwise
            $scope.updating = true;
            JudgeService.updateJudging($scope.project._id, $scope.scores, $scope.comments)
                .then(response => {
                  // set local
                  $scope.user.judging.queue[projectIndex].judged = true;
                  // clear for next user
                  clearCurrentJudging();
                  // get next project
                  nextProject();
                  $scope.toast = true;
                  $timeout(function(){
                    $scope.toast = false;
                  }, 3000);
                  $scope.updating = false;
                }, err => {
                  swal('Oops!', 'Something went wrong', 'error');
                  $scope.updating = false;
                });
          }
        };

        $scope.setRole = function () {
          JudgeService.setRole($scope.user.judging.role);
        };

        $scope.setGroup = function () {
          JudgeService.setGroup($scope.user.judging.group);
        };

        $scope.setCategories = function () {
          $scope.user.judging.categories = $('#categories').dropdown('get value');
          JudgeService.setCategories($scope.user.judging.categories)
              .then(response => {
                // success
              }, err => {
                swal('Uh oh!', 'Something went wrong.', 'error');
              });
        };

        $scope.setAward = function (index) {
          var project = $scope.projects[index];

          // remove previous
          if(project.lastAward !== undefined && project.lastAward !== ''){
            JudgeService.removeAward(project.id, project.lastAward)
                .then(response => {
                  // success
                }, err => {
                  console.log(err);
                });
          }

          // add next
          if(project.award !== undefined && project.award !== ''){
            JudgeService.addAward(project.id, project.award)
                .then(response => {
                  // success
                }, err => {
                  console.log(err);
                });
          }
          // set the last award
          $scope.projects[index].lastAward = project.award
        };
      }]);
