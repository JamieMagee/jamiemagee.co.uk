'use strict';

module.exports = function (grunt) {
    // Show elapsed time after tasks run
    require('time-grunt')(grunt);
    // Load all Grunt tasks
    require('jit-grunt')(grunt);

    grunt.initConfig({
        app: {
            source: 'blog',
            dist: '_site'
        },
        watch: {
            scripts: {
                files: ['<%= app.source %>/_assets/js/**/*.{js}'],
                tasks: ['uglify']
            },
            jekyll: {
                files: ['<%= app.source %>/**/*.{html,yml,md,mkd,markdown}'],
                tasks: ['jekyll:server']
            },
            images: {
                files: ['<%= app.source %>/_assets/img/**/*.{gif,jpg,jpeg,png,svg,webp}'],
                tasks: ['copy:server']
            },
            livereload: {
                options: {
                    livereload: '<%= connect.options.livereload %>'
                },
                files: [
                    '.jekyll/**/*.{html,yml,md,mkd,markdown}',
                    '.tmp/css/*.css',
                    '.tmp/js/*.js',
                    '.tmp/img/**/*.{gif,jpg,jpeg,png,svg,webp}'
                ]
            }
        },
        connect: {
            options: {
                port: 9000,
                livereload: 35729,
                hostname: '0.0.0.0'
            },
            livereload: {
                options: {
                    open: {
                        target: 'http://localhost:9000'
                    },
                    base: [
                        '.jekyll',
                        '.tmp',
                        '<%= app.source %>'
                    ]
                }
            },
            dist: {
                options: {
                    open: {
                        target: 'http://localhost:9000'
                    },
                    base: [
                        '<%= app.dist %>',
                        '.tmp'
                    ]
                }
            }
        },
        clean: {
            server: [
                '.jekyll',
                '.tmp'
            ],
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        '<%= app.dist %>/*',
                        '!<%= app.dist %>/.git*'
                    ]
                }]
            }
        },
        jekyll: {
            options: {
                config: '_config.yml,_config.build.yml',
                src: '<%= app.source %>'
            },
            dist: {
                options: {
                    dest: '<%= app.dist %>'
                }
            },
            server: {
                options: {
                    config: '_config.yml',
                    dest: '.jekyll'
                }
            }
        },
        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    collapseBooleanAttributes: true,
                    removeAttributeQuotes: true,
                    removeRedundantAttributes: true,
                    removeEmptyAttributes: true,
                    minifyJS: true,
                    minifyCSS: true
                },
                files: [{
                    expand: true,
                    cwd: '<%= app.dist %>',
                    src: '**/*.html',
                    dest: '<%= app.dist %>'
                }]
            }
        },
        uglify: {
            server: {
                options: {
                    mangle: false,
                    beautify: true
                },
                files: {
                    '.tmp/js/scripts.js': ['<%= app.source %>/_assets/js/**/*.js']
                }
            },
            dist: {
                options: {
                    compress: {},
                    preserveComments: false,
                    report: 'min'
                },
                files: {
                    '<%= app.dist %>/js/scripts.js': ['<%= app.source %>/_assets/js/**/*.js']
                }
            }
        },
        concat_css: {
            server: {
                src: [
                    '<%= app.source %>/_assets/css/poole.css',
                    '<%= app.source %>/_assets/css/syntax.css',
                    '<%= app.source %>/_assets/css/hyde.css',
                    '<%= app.source %>/_assets/css/jamie.css'
                ],
                dest: '.tmp/css/blog.css'
            },
            dist: {
                src: [
                    '<%= app.source %>/_assets/css/poole.css',
                    '<%= app.source %>/_assets/css/syntax.css',
                    '<%= app.source %>/_assets/css/hyde.css',
                    '<%= app.source %>/_assets/css/jamie.css'
                ],
                dest: '<%= app.dist %>/css/blog.css'
            }
        },
        postcss: {
            options: {
                map: true,
                processors: [
                    require('autoprefixer')({browsers: ['last 1 version']})
                ]
            },
            server: {
                files: [{
                    expand: true,
                    cwd: '.tmp/css',
                    src: '**/*.css',
                    dest: '.tmp/css'
                }]
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= app.dist %>/css',
                    src: '**/*.css',
                    dest: '<%= app.dist %>/css'
                }]
            }
        },
        critical: {
            dist: {
                options: {
                    base: './',
                    css: [
                        '<%= app.dist %>/css/blog.css'
                    ],
                    minify: true,
                    width: 320,
                    height: 480
                },
                files: [{
                    expand: true,
                    cwd: '<%= app.dist %>',
                    src: ['**/*.html'],
                    dest: '<%= app.dist %>'
                }]
            }
        },
        cssmin: {
            dist: {
                options: {
                    keepSpecialComments: 0,
                    check: 'gzip'
                },
                files: [{
                    expand: true,
                    cwd: '<%= app.dist %>/css',
                    src: ['*.css'],
                    dest: '<%= app.dist %>/css'
                }]
            }
        },
        imagemin: {
            options: {
                progressive: true,
                optimizationLevel: 7
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= app.dist %>/img',
                    src: '**/*.{jpg,jpeg,png,gif}',
                    dest: '<%= app.dist %>/img'
                }]
            }
        },
        svgmin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= app.dist %>/img',
                    src: '**/*.svg',
                    dest: '<%= app.dist %>/img'
                }]
            }
        },
        copy: {
            dist: {
                files: [{
                    flatten: true,
                    expand: true,
                    dot: true,
                    filter: 'isFile',
                    cwd: '<%= app.source %>/_assets',
                    src: ['img/**/*'],
                    dest: '<%= app.dist %>/img'
                }]
            }
        }
    });

    // Define Tasks
    grunt.registerTask('serve', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'connect:dist:keepalive']);
        }

        grunt.task.run([
            'clean:server',
            'jekyll:server',
            'concat_css:server',
            'postcss:server',
            'uglify:server',
            'connect:livereload',
            'watch'
        ]);
    });

    grunt.registerTask('build', [
        'clean:dist',
        'jekyll:dist',
        'copy',
        'imagemin',
        'svgmin',
        'concat_css:dist',
        'postcss',
        'cssmin',
        'uglify:dist',
        'critical',
        'htmlmin'
    ]);

    grunt.registerTask('default', [
        'serve'
    ]);
};