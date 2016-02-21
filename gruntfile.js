module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      },
    },
    'create-windows-installer': {
      x64: {
        appDirectory: './NewTropensTV-win32-x64',
        outputDirectory: './build/newtropenstv-installer64',
        authors: 'NewTropens (MrDJthib)',
        exe: 'NewTropensTV.exe'
      }
    }
  });


  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-electron-installer')

  // Default task(s).
  grunt.registerTask('default', ['uglify']);

};