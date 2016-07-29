sankey.dialog.FileSelect = Class.extend({

    /**
     * @constructor
     *
     */
    init:function()
    {
    },

    /**
     * @method
     *
     * Open the file picker and load the selected file.<br>
     *
     * @param {Function} successCallback callback method if the user select a file and the content is loaded
     * @param {Function} errorCallback method to call if any error happens
     *
     * @since 4.0.0
     */
    show: function(successCallback)
    {
        $('#githubFileSelectDialog').modal('show');

        this.fetchPathContent( successCallback);
    },

    fetchPathContent: function( successCallback )
    {
         $.ajax({
                url:conf.backend.file.list ,
                xhrFields: {
                    withCredentials: true
                },
                success:function(response) {
                    var files = response.files;
                    // sort the result
                    // Directories are always on top
                    //
                    files.sort(function (a, b) {
                        if (a.type === b.type) {
                            if (a.id.toLowerCase() < b.id.toLowerCase())
                                return -1;
                            if (a.id.toLowerCase() > b.id.toLowerCase())
                                return 1;
                            return 0;
                        }
                        return 1;
                    });

                    var compiled = Hogan.compile(
                        '         {{#files}}' +
                        '           <a href="#" data-draw2d="{{draw2d}}" class="list-group-item githubPath text-nowrap" data-id="{{id}}">' +
                        '              <span class="fa fa-file-o"></span>' +
                        '              {{{id}}}' +
                        '           </a>' +
                        '         {{/files}}'
                    );
                    var output = compiled.render({
                        files: files,
                        draw2d: function () {
                            return this.id.endsWith(conf.fileSuffix);
                        }
                    });

                    $("#githubFileSelectDialog .githubNavigation").html($(output));
                    $("#githubFileSelectDialog .githubNavigation").scrollTop(0);


                    $('.githubPath[data-draw2d="true"]').off("click").on("click", function () {
                        var id   = $(this).data("id");
                        $('#githubFileSelectDialog').modal('hide');
                        successCallback(id);
                    });
                }
        });
    }
});