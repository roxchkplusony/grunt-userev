/*
 * grunt-runtask
 * https://github.com/salsita/grunt-runtask
 *
 * Copyright (c) 2013 Salsita Software
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

  /**                                                                                           @
   * The `userev` task updates references to assets versioned with `filerev`.
   *
   * It uses `grunt.filerev.summary`.
   */
  function reEscape(s) { // http://stackoverflow.com/a/18620139/899047
    return s.replace(/[$-\/?[-^{|}]/g, '\\$&');
  }

  function endsWith(s, suffix) { // http://stackoverflow.com/a/2548133/899047
    return s.indexOf(suffix, s.length - suffix.length) !== -1;
  }

  function replaceFirstGroup(s, pattern, replacement) {
    var match = pattern.exec(s);
    if (match) {
      return s.replace(pattern, match[0].replace(match[1] || match[0], replacement));
    } else {
      return s;
    }
  }

  grunt.task.registerMultiTask('userev', 'Update versioned assets references.', function() {
    var path = require('path');
    var sep = '/';
    var options = this.options();
    var versioned = grunt.filerev && grunt.filerev.summary;

    if (versioned && path.sep !== sep) {
      var re = new RegExp(reEscape(path.sep), 'g');
      for (var assetpath in versioned) {
        versioned[assetpath.replace(re, sep)] = versioned[assetpath].replace(re, sep);
        delete versioned[assetpath];
      }
    }

    grunt.log.debug(this.nameArgs + ': ' + JSON.stringify(this.files, null, 4) +
      JSON.stringify(options, null, 4));
    grunt.log.debug('filerev.summary: ' + JSON.stringify(versioned, null, 4));

    if (versioned) {
      this.files.forEach(function (file) {
        file.src.filter(function (filepath) {
          if (!grunt.file.exists(filepath)) {
            grunt.log.warn('Source file "' + filepath + '" not found.');
            return false;
          } else {
            return true;
          }
        }).forEach(function (filepath) {
            var acc = grunt.file.read(filepath);
            var content = "";
            var updated = false;
            var link, hashed;
            for (var label in options.patterns) {
              if (options.patterns.hasOwnProperty(label)) {
                content = acc + content;
                acc = "";
                var pattern = options.patterns[label];
                var match = pattern.exec(content);
                while (match) {
                  grunt.log.debug('Matching ' + [filepath, pattern, JSON.stringify(match)].join(': '));
                  link = match[1] || match[0];
                  var found = false;
                  for (var assetPath in versioned) {
                    if (versioned.hasOwnProperty(assetPath)) {
                      if (endsWith(assetPath, link)) {
                        hashed = versioned[assetPath].slice(assetPath.length - link.length);
                        if (link !== hashed) {
                          var pos = content.indexOf(link);
                          while (pos > -1) {
                            if (!updated) {
                              grunt.log.writeln('Updating ' + filepath.cyan +
                                (file.dest ? ' -> ' + file.dest.cyan : '.'));
                            }
                            grunt.log.writeln('Linking ' + label + ': ' + link + ' -> ' + hashed);
                            acc += content.substr(0, pos) + hashed;
                            content = content.substr(pos + link.length);
                            updated = true;
                            found = true;
                            pos = content.indexOf(link);
                          }
                        }
                        break;
                      }
                    }
                  }
                  match = found && pattern.exec(content);
                }
              }
            }
            if (updated) {
              grunt.file.write(file.dest || filepath, acc + content);
            }
          });
      });
    }
  });
};
