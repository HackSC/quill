const angular = require('angular');
const SettingsService = require('./services/SettingsService.js');
const UserService = require('./services/UserService.js');
const FileService = require('./services/FileService.js');
const MailService = require('./services/MailService.js');
const ReviewService = require('./services/ReviewService.js');
const JudgeService = require('./services/JudgeService.js');
const AdminCtrl = require('../views/admin/adminCtrl.js');
const AdminSettingsCtrl = require('../views/admin/settings/adminSettingsCtrl.js');
const AdminStatsCtrl = require('../views/admin/stats/adminStatsCtrl.js');
const AdminUserCtrl = require('../views/admin/user/adminUserCtrl.js');
const AdminUsersCtrl = require('../views/admin/users/adminUsersCtrl.js');
const AdminReviewCtrl = require('../views/admin/review/adminReviewCtrl.js');
const AdminMailerCtrl = require('../views/admin/mailer/adminMailerCtrl.js');
const ApplicationCtrl = require('../views/application/applicationCtrl.js');
const ConfirmationCtrl = require('../views/confirmation/confirmationCtrl.js');
const DashboardCtrl = require('../views/dashboard/dashboardCtrl.js');
const LoginCtrl = require('../views/login/loginCtrl.js');
const ResetCtrl = require('../views/reset/resetCtrl.js');
const SidebarCtrl = require('../views/sidebar/sidebarCtrl.js');
const TeamCtrl = require('../views/team/teamCtrl.js');
const JudgeCtrl = require('../views/judge/judgeCtrl.js');
const VerifyCtrl = require('../views/verify/verifyCtrl.js');
const SponsorsCtrl = require('../views/sponsorsPortal/sponsorsPortalCtrl.js');
const SponsorsStatsCtrl = require('../views/sponsorsPortal/stats/statsCtrl.js');
const SponsorsUsersCtrl = require('../views/sponsorsPortal/users/usersCtrl.js');

angular.module('reg')
  .config([
    '$stateProvider',
    '$urlRouterProvider',
    '$locationProvider',
    function(
      $stateProvider,
      $urlRouterProvider,
      $locationProvider) {

    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise("/404");

    // Set up de states
    $stateProvider
      .state('login', {
        url: "/login",
        templateUrl: "views/login/login.html",
        controller: 'LoginCtrl',
        data: {
          requireLogin: false
        },
        resolve: {
          'settings': function(SettingsService){
            return SettingsService.getPublicSettings();
          }
        }
      })
      .state('app', {
        views: {
          '': {
            templateUrl: "views/base.html"
          },
          'sidebar@app': {
            templateUrl: "views/sidebar/sidebar.html",
            controller: 'SidebarCtrl',
            resolve: {
              settings: function(SettingsService) {
                return SettingsService.getPublicSettings();
              }
            }
          }
        },
        data: {
          requireLogin: true
        }
      })
      .state('app.dashboard', {
        url: "/",
        templateUrl: "views/dashboard/dashboard.html",
        controller: 'DashboardCtrl',
        resolve: {
          currentUser: function(UserService){
            return UserService.getCurrentUser();
          },
          settings: function(SettingsService){
            return SettingsService.getPublicSettings();
          }
        },
      })
      .state('app.application', {
        url: "/application",
        templateUrl: "views/application/application.html",
        controller: 'ApplicationCtrl',
        data: {
          requireVerified: true
        },
        resolve: {
          currentUser: function(UserService){
            return UserService.getCurrentUser();
          },
          settings: function(SettingsService){
            return SettingsService.getPublicSettings();
          }
        }
      })
      .state('app.confirmation', {
        url: "/confirmation",
        templateUrl: "views/confirmation/confirmation.html",
        controller: 'ConfirmationCtrl',
        data: {
          requireAdmittedOrWaitlisted: true
        },
        resolve: {
          currentUser: function(UserService){
            return UserService.getCurrentUser();
          }
        }
      })
      .state('app.team', {
        url: "/team",
        templateUrl: "views/team/team.html",
        controller: 'TeamCtrl',
        data: {
          requireVerified: true
        },
        resolve: {
          currentUser: function(UserService){
            return UserService.getCurrentUser();
          },
          settings: function(SettingsService){
            return SettingsService.getPublicSettings();
          }
        }
      })
      .state('app.sponsors', {
        views: {
          '': {
            templateUrl: "views/sponsorsPortal/sponsorsPortal.html",
            controller: 'SponsorsCtrl'
          }
        }
      })
      .state('app.sponsors.stats', {
        url: "/sponsors",
        templateUrl: "views/sponsorsPortal/stats/stats.html",
        controller: 'SponsorsStatsCtrl'
      })
      .state('app.sponsors.users', {
        url: "/sponsors/users?" +
          '&page' +
          '&size' +
          '&sort' +
          '&query' +
          '&filter',
        templateUrl: "views/sponsorsPortal/users/users.html",
        controller: 'SponsorsUsersCtrl'
      })
      .state('app.admin', {
        views: {
          '': {
            templateUrl: "views/admin/admin.html",
            controller: 'AdminCtrl'
          }
        },
        data: {
          requireAdmin: true
        }
      })
      .state('app.admin.stats', {
        url: "/admin",
        templateUrl: "views/admin/stats/stats.html",
        controller: 'AdminStatsCtrl'
      })
      .state('app.admin.users', {
        url: "/admin/users?" +
          '&page' +
          '&size' +
          '&sort' +
          '&query',
        templateUrl: "views/admin/users/users.html",
        controller: 'AdminUsersCtrl'
      })
      .state('app.admin.user', {
        url: "/admin/users/:id",
        templateUrl: "views/admin/user/user.html",
        controller: 'AdminUserCtrl',
        resolve: {
          'user': function($stateParams, UserService){
            return UserService.get($stateParams.id);
          }
        }
      })
      .state('app.admin.review', {
        url: "/admin/review",
        templateUrl: "views/admin/review/review.html",
        controller: 'AdminReviewCtrl',
      })
      .state('app.admin.mailer', {
        url: "/admin/mailer",
        templateUrl: "views/admin/mailer/mailer.html",
        controller: 'AdminMailerCtrl',
      })
      .state('app.admin.settings', {
        url: "/admin/settings",
        templateUrl: "views/admin/settings/settings.html",
        controller: 'AdminSettingsCtrl',
      })
      .state('app.judge', {
        url: "/judge",
        templateUrl: "views/judge/judge.html",
        controller: 'JudgeCtrl',
        resolve: {
          currentUser: function(UserService){
            return UserService.getCurrentUser();
          },
          settings: function(SettingsService){
            return SettingsService.getJudging();
          }
        },
      })
      .state('reset', {
        url: "/reset/:token",
        templateUrl: "views/reset/reset.html",
        controller: 'ResetCtrl',
        data: {
          requireLogin: false
        }
      })
      .state('verify', {
        url: "/verify/:token",
        templateUrl: "views/verify/verify.html",
        controller: 'VerifyCtrl',
        data: {
          requireLogin: false
        }
      })
      .state('404', {
        url: "/404",
        templateUrl: "views/404.html",
        data: {
          requireLogin: false
        }
      });

    $locationProvider.html5Mode({
      enabled: true,
    });

  }])
  .run($transitions => {
    $transitions.onStart({}, transition => {
      const Session = transition.injector().get("Session");

      var requireLogin = transition.to().data.requireLogin;
      var requireAdmin = transition.to().data.requireAdmin;
      var requireVerified = transition.to().data.requireVerified;
      var requireAdmitted = transition.to().data.requireAdmitted;
      var requireAdmittedOrWaitlisted = transition.to().data.requireAdmittedOrWaitlisted;

      if (requireLogin && !Session.getToken()) {
        return transition.router.stateService.target("login");
      }

      if (requireAdmin && !Session.getUser().admin) {
        return transition.router.stateService.target("app.dashboard");
      }

      if (requireVerified && !Session.getUser().verified) {
        return transition.router.stateService.target("app.dashboard");
      }

      if (requireAdmitted && !Session.getUser().status.admitted) {
        return transition.router.stateService.target("app.dashboard");
      }

      if(requireAdmittedOrWaitlisted && !(Session.getUser().status.admitted || Session.getUser().status.waitlisted)){
        return transition.router.stateService.target("app.dashboard");
      }
    });

    $transitions.onSuccess({}, transition => {
      document.body.scrollTop = document.documentElement.scrollTop = 0;
    });
  });
