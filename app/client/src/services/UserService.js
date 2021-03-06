angular.module('reg')
  .factory('UserService', [
  '$http',
  'Session',
  function($http, Session){

    var users = '/api/users';
    var base = users + '/';

    return {

      // ----------------------
      // Basic Actions
      // ----------------------
      getCurrentUser: function(){
        return $http.get(base + Session.getUserId());
      },

      get: function(id){
        return $http.get(base + id);
      },

      getAll: function(){
        return $http.get(base);
      },

      getPage: function(page, size, sort, text){
        return $http.get(users + '?' + $.param(
          {
            sort: sort,
            text: text,
            page: page ? page : 0,
            size: size ? size : 50
          })
        );
      },

      // SPONSORS
      getAllSponsors: function() {
        return $http.get(base + '?sponsor=true')
      },

      getPageSponsors: function(page, size, sort, text, filter){
        return $http.get(users + '?' + $.param(
          {
            sort: sort,
            text: text,
            page: page ? page : 0,
            size: size ? size : 50,
            filter: filter,
            sponsor: true
          })
        );
      },

      updateProfile: function(id, profile){
        return $http.put(base + id + '/profile', {
          profile: profile
        });
      },

      submitApp: function(id, profile){
        return $http.put(base + id + '/submit', {
          profile: profile
        });
      },

      updateConfirmation: function(id, confirmation){
        return $http.put(base + id + '/confirm', {
          confirmation: confirmation
        });
      },

      declineAdmission: function(id){
        return $http.post(base + id + '/decline');
      },

      // ------------------------
      // Team
      // ------------------------
      joinOrCreateTeam: function(code){
        return $http.put(base + Session.getUserId() + '/team', {
          code: code
        });
      },

      leaveTeam: function(){
        return $http.delete(base + Session.getUserId() + '/team');
      },

      getMyTeammates: function(){
        return $http.get(base + Session.getUserId() + '/team');
      },

      // -------------------------
      // Admin Only
      // -------------------------

      getStats: function(){
        return $http.get(base + 'stats');
      },

      setOverallRating: function(id, rating){
        return $http.post(base + id + '/setOverallRating', {
          rating: rating,
        });
      },

      admitUser: function(id){
        return $http.post(base + id + '/admit');
      },

      rejectUser: function(id){
        return $http.post(base + id + '/reject');
      },

      waitlistUser: function(id){
        return $http.post(base + id+ '/waitlist');
      },

      checkIn: function(id){
        return $http.post(base + id + '/checkin');
      },

      checkOut: function(id){
        return $http.post(base + id + '/checkout');
      },

      makeAdmin: function(id){
        return $http.post(base + id + '/makeadmin');
      },

      removeAdmin: function(id){
        return $http.post(base + id + '/removeadmin');
      },

      makeJudge: function(id){
        return $http.post(base + id + '/makejudge');
      },

      removeJudge: function(id){
        return $http.post(base + id + '/removejudge');
      },
    };
  }
  ]);
