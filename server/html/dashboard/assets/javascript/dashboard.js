
sankey.Application = Class.extend(
{
    NAME: "Application",

    /**
     */
    init: function () {
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
                    '{{#files}}' +
                    '<div class="col-lg-3 col-md-4 col-xs-6 thumb">'+
                    '  <a class="thumbnail" href="../editor#diagram={{id}}">'+
                    '    <img class="img-responsive" src="{{base64Image}}" alt="">'+
                    '  </a>'+
                    '</div>'+
                    '{{/files}}'
                );


                var output = compiled.render({
                    files: files
                });
                $("#container > .row").html($(output));
            }
        });
    }
});