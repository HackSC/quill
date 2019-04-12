angular.module('reg')
    .factory('JudgeService', [
      '$http',
      function($http){
        var base = '/api/judging/';

        return {

          // ----------------------
          // Admin Actions
          // ----------------------

          getProject: function(id){
            return $http.get(base + 'project/' + id);
          },

          getProjects: function(projects){
            return $http.put(base + 'projects', {
              projects: projects
            });
          },

          getProjectsList: function(){
            return $http.get(base + 'list/projects');
          },

          getJudgesList: function(){
            return $http.get(base + 'list/judges');
          },

          upload: function(data){
            return $http.put(base + 'upload', {
              data: data
            });
          },

          exportTableAssignments: function(){
            return $http.get(base + 'export/tableAssignments');
          },

          exportJudgingData: function(){
            return $http.get(base + 'export/judgingData')
          },

          assign: function(){
            return $http.get(base + 'assign');
          },

          // ----------------------
          // Judge or Admin Actions
          // ----------------------

          getQueue: function(){
            return $http.get(base + 'queue');
          },

          updateJudging: function(projectId, scores, comments){
            return $http.put(base + 'update', {
              projectId: projectId,
              scores: scores,
              comments: comments
            });
          },

          setRole: function(role){
            return $http.put(base + 'set/role', {
              role: role
            });
          },

          setGroup: function(group){
            return $http.put(base + 'set/group', {
              group: group
            });
          },

          setCategories: function(categories){
            return $http.put(base + 'set/categories', {
              categories: categories
            });
          },

          addAward: function(projectId, award){
            return $http.put(base + 'award/add', {
              projectId: projectId,
              award: award
            });
          },

          removeAward: function(award){
            return $http.put(base + 'award/remove', {
              projectId: projectId,
              award: award
            });
          },

        };
      }
    ]);
