const showdown = require('showdown');
const swal = require('sweetalert');

angular.module('reg')
    .controller('AdminMailerCtrl',[
        '$scope',
        '$sce',
        'MailService',
        function($scope, $sce, MailService){

            $scope.recipient= 'verified';
            $scope.mailTitle= '';
            $scope.mailText = '';

            var converter = new showdown.Converter();
            $scope.markdownPreview = function(text){
                return $sce.trustAsHtml(converter.makeHtml(text));
            };

            $scope.sendMail = function(title, text){
                // Check email
                if(title == null || title === ''){
                    swal('Title is empty', 'Please fill out the title!', 'warning');
                    return;
                }else if(text == null || text === ''){
                    swal('Body is empty', 'Please fill out the body!', 'warning');
                    return;
                }

                MailService.sendMail(title, text, $scope.recipient)
                    .then(response => {
                        swal('Success', 'Mail has been queued and are being sent out', 'success');
                    }, err => {
                        swal('Error', err, 'error');
                    });
            }

        }]);
