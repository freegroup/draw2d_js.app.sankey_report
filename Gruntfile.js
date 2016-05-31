module.exports = function (grunt) {

    //Initializing the configuration object
    grunt.initConfig({

        // get the configuration info from package.json ----------------------------
        // this way we can use things like name and version (pkg.name)
        pkg: grunt.file.readJSON('package.json'),

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
                    './bower_components/hogan/web/1.0.0/hogan.min.js'
                ],
                dest: './dist/assets/javascript/dependencies.js'
            },
            application: {
                src: [
                    './src/assets/javascript/**/*.js'
                ],
                dest: './dist/assets/javascript/app.js'
            }
        },

        copy: {
            application: {
                expand: true,
                cwd: 'src/',
                src: '**/*.html',
                dest: 'dist/'
            },
            ionicons:{
                expand: true,
                cwd: 'bower_components/Ionicons/',
                src: ['./css/*', "./fonts/*"],
                dest: './dist/lib/ionicons'
            },
            img: {
                expand: true,
                cwd: 'src/assets/img',
                src: '*.*',
                dest: 'dist/assets/img'
            },
            bootstrap:{
                expand: true,
                cwd: 'bower_components/bootstrap/dist/',
                src: ['**/*'],
                dest: './dist/lib/bootstrap'
            },
            // copies the build result from the "dist" directory to the server subdirectory
            // for "npm publish"
            server:{
                expand: true,
                cwd: 'dist/',
                src: ['**/*'],
                dest: 'server/html'
            }

        },

        less: {
            development: {
                options: {
                    compress: false
                },
                files: {
                    "./dist/assets/css/main.css": "./src/assets/less/*.less"
                }
            }
        },

        // configure jshint to validate js files -----------------------------------
        jshint: {
            options: {
                reporter: require('jshint-stylish') // use jshint-stylish to make our errors look and read good
            },

            // when this task is run, lint the Gruntfile and all js files in src
            build: ['Grunfile.js', 'src/**/*.js']
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

    // Task definition
    grunt.registerTask('default', [
        'jshint',
        'concat',
        'less',
        'copy:application','copy:img','copy:bootstrap' , 'copy:ionicons',
        'copy:server'
    ]);

    grunt.registerTask('publish', ['default', 'gh-pages']);
};

