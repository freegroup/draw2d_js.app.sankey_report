module.exports = function (grunt) {

    //Initializing the configuration object
    grunt.initConfig({

        // get the configuration info from package.json ----------------------------
        // this way we can use things like name and version (pkg.name)
        pkg: grunt.file.readJSON('package.json'),

        clean: ['dist/', 'server/'],
        // Task configuration
        concat: {
            options: {
                separator: ';\n'
            },
            libs: {
                src: [
                    './bower_components/shifty/dist/shifty.min.js',
                    './bower_components/draw2d/dist/patched_raphael.js',
                    './bower_components/jquery/dist/jquery.min.js',
                    './bower_components/jquery-ui/jquery-ui.min.js',
                    './bower_components/jquery-ui-layout/source/stable/jquery.layout.min.js',
                    './bower_components/draw2d/dist/jquery.autoresize.js',
                    './bower_components/draw2d/dist/jquery-touch_punch.js',
                    './bower_components/draw2d/dist/jquery.contextmenu.js',
                    './bower_components/draw2d/dist/rgbcolor.js',
                    './bower_components/draw2d/dist/patched_canvg.js',
                    './bower_components/draw2d/dist/patched_Class.js',
                    './bower_components/draw2d/dist/json2.js',
                    './bower_components/draw2d/dist/pathfinding-browser.min.js',
                    './bower_components/draw2d/dist/draw2d.js',
                    './bower_components/hogan/web/1.0.0/hogan.min.js',
                    './bower_components/devbridge-autocomplete/dist/jquery.autocomplete.min.js'
                ],
                dest: './server/html/editor/assets/javascript/dependencies.js'
            },
            application: {
                src: [
                    './src/server/html/assets/javascript/**/*.js'
                ],
                dest: './server/html/editor/assets/javascript/app.js'
            }
        },

        copy: {
            application: {
                expand: true,
                cwd: 'src/editor/',
                src: '**/*.html',
                dest: 'server/html/editor/'
            },
            ionicons:{
                expand: true,
                cwd: 'bower_components/Ionicons/',
                src: ['./css/*', "./fonts/*"],
                dest: './server/html/editor/lib/ionicons'
            },
            img: {
                expand: true,
                cwd: 'src/editor/assets/img',
                src: '*.*',
                dest: './server/html/editor/assets/img'
            },
            bootstrap:{
                expand: true,
                cwd: 'bower_components/bootstrap/dist/',
                src: ['**/*'],
                dest: './server/html/editor/lib/bootstrap'
            },
            serverjs:{
                expand: true,
                cwd: 'src/server/',
                src: ['**/*.js'],
                dest: './server/'
            },
            ghpages:{
                expand: true,
                cwd: 'src/gh-pages/',
                src: ['**/*'],
                dest: './dist/'
            }
        },

        less: {
            development: {
                options: {
                    compress: false
                },
                files: {
                    "./server/html/editor/assets/css/main.css": "./src/editor/assets/less/*.less"
                }
            }
        },

        // configure jshint to validate js files -----------------------------------
        jshint: {
            options: {
                reporter: require('jshint-stylish') // use jshint-stylish to make our errors look and read good
            },

            // when this task is run, lint the Gruntfile and all js files in src
            build: ['Grunfile.js', 'src/editor/**/*.js']
        },

        watch: {
            all: {
                files: [
                    "./src/**/*"
                ],
                tasks: ['default']
            }
        },
        'gh-pages': {
            options: {
                base: 'dist'
            },
            src: ['**']
        }
    });

    // Plugin loading
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-gh-pages');
    grunt.loadNpmTasks('grunt-contrib-rename');
    grunt.loadNpmTasks('grunt-contrib-clean');

    // Task definition
    grunt.registerTask('default', [
        'clean',
        'jshint',
        'concat',
        'less',
        'copy:application','copy:img','copy:bootstrap' , 'copy:ionicons', 'copy:serverjs'
     ]);

    grunt.registerTask('publish', [ 'copy:ghpages','gh-pages']);

};

