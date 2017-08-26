/* 
directory, dir = path of a smartdir, for example the path of a smartDirectory "c" may be "a/b/c"
"One" = smartdir = smartdirectory = name of a smartDirectory, for example the name of a smartDirectory "c" is "c"
location = a path for filesystem, for example the path of a smartDirectory "c" may be "./a/b/c"
*/

const fs = require('fs');
const path = require('path');
const async = require('async');

var config = {};

var ui = {
  clear: function() {
    document.getElementsByClassName("tree")[0].innerHTML = '';
    document.getElementsByClassName("directories")[0].innerHTML = '';
    document.getElementsByClassName("notifications")[0].innerHTML = '';
    document.getElementsByClassName("files")[0].innerHTML = '';
  },
  appendNotification: function(html) {
    var element = document.createElement('p');
    element.innerHTML = html;

    document.getElementsByClassName("notifications")[0].appendChild(element);
  },
  appendDirectory: function(directory) {
    var element = document.createElement('span');
    var smartDir = directory.substr(directory.lastIndexOf(`/`) + 1, directory.length);
    element.innerHTML = `<p onclick="smartDirectory.goto('${directory}');" style="color:blue">${smartDir}</p>`;
    document.getElementsByClassName("directories")[0].appendChild(element);
  },
  appendSmartFile: function(html) {
    var element = document.createElement('p');
    element.innerHTML = html;

    document.getElementsByClassName("files")[0].appendChild(element);
  },
  appendTree: function(directory) {
    var element = document.createElement('p');
    element.innerHTML = `/<a onclick="smartDirectory.goto('${directory.substr(0, directory.lastIndexOf(`/`))}');" style="color:blue">..</a>/<a onclick="smartDirectory.goto('');" style="color:blue">root</a>/${directory}`;

    document.getElementsByClassName("tree")[0].appendChild(element);
  }
};

var smartDirectory = {
  currentDirectory: '',
  isOne: function(directory) {
    /* Return true if given "directory" is a smart directory */
    if (config.settings.global.auto_mode === true) {
      /* If auto-mode is enabled */
      if (fs.existsSync(path.join(config.settings.global.root_path, directory))) { 
        if (fs.statSync(path.join(config.settings.global.root_path, directory)).isDirectory()) {
          return true;
        }
      }
      return false;
    } else {
      /* If auto-mode is disabled, the directory must be also declared in config */
      if (settings.hasOwnProperty(directory) && fs.existsSync(path.join(config.settings.global.root_path, directory))) { 
        if (fs.statSync(path.join(config.settings.global.root_path, directory).isDirectory())) {
          return true;
        }
      }
      return false;
    }
  },
  createNotExistingOnes: function(callback) {
    /* If some smartDirectories are declared in config but don't exist, create them */
    for (var directory in config.declaredSmartDirectories) { 
      if (config.declaredSmartDirectories.hasOwnProperty(directory)) {
        if (!fs.existsSync(path.join(config.settings.global.root_path, directory))) {
          fs.mkdirSync(path.join(config.settings.global.root_path, directory));
          ui.appendNotification("Created " + directory);
        }
      }
    }

    return callback();
  },
  callbackDeclaredOnes: function(callback, directory) {
    /* If scope directory is not given, set it to default '' (root) */
    if (directory === undefined) { directory = ''; }

    /* Callback each declared directory */
    for (var dir in config.declaredSmartDirectories) { 
      if (config.declaredSmartDirectories.hasOwnProperty(dir)) {
        if (directory.substr(0, t.lastIndexOf('/')) === directory) {
          callback(dir);
        }
      }
    }
    return;
  },
  callbackOnes: function(callback, directory) {
    /* Callback each directory */
    var location = config.settings.global.root_path;
    
    /* 
      1. If scope directory is not defined, scope directory is set to '' (root)
      2. If scope directory is '' (root), don't add a backslash to it
    */
    if (directory !== undefined && directory !== '') { location = path.join(location, directory); directory = directory + '/'; } else { directory = ''; }
    if (config.settings.global.auto_mode === true) {
      /* If auto-mode is enabled, search for valid directories in "location" */
      fs.readdirSync(location).filter(smartDir => {
        if (this.isOne(directory + smartDir)) {
          callback(directory + smartDir);
        }
      });
    } else {
      /* If auto-mode is disabled, search for valid diretories in the scope directory */
      this.callbackDeclaredOnes(smartDir => {
        if (this.IsOne(directory + smartDir)); {
          callback(directory + smartDir);
        }
      }, directory);
    }

    return;
  },
  date_to_unix: function(date, schema) {
    /* @TODO "Screenshot_YYYY-MM-DD-hh-mm-ss"}, */
  },
  callbackFiles: function(directory, first, last, callback) {
    fs.readdir(path.join(config.settings.global.root_path, directory), (err, files) => {
      var valid_files = [];
      var valid_files_in_unix = [];
      // assuming openFiles is an array of file names
      async.each(files, function(file, callback) {
        fs.stat(path.join(path.join(config.settings.global.root_path, directory), file), (err, stat) => {
          if (err) return callback(err);
          if (!stat.isDirectory()) {
            valid_files.push(path.join(path.join(config.settings.global.root_path, directory), file));
          }
          callback();
        });

        console.log(file);
      }, function(err) {
        if(err) { return ui.appendNotification(err); }

        var sort_by = config.settings.defaultSmartDirectory.sort_by;
        /* Convert them into unix-time */
        valid_files.forEach(function(file) {
          for (i = 0; i < sort_by.length; i++) {
            if (this.date_to_unix((file.substr(file.lastIndexOf(`/`) + 1, file.length), sort_by[i])) !== false) {
              valid_files_in_unix[file] = this.date_to_unix((file.substr(file.lastIndexOf(`/`) + 1, file.length), sort_by[i]));
              break;
            }
          }
        });

        /* Actual sorting*/
        valid_files_in_unix.sort(function(a, b) { return a - b; });
        
        if (first < last) {
          for (i = first; i < last; i++) {
            callback(valid_files_in_unix.charAt(i));
          }
        } else {
          for (i = last; i > first; i--) {
            callback(valid_files_in_unix.charAt(i));
          }
        }

        return;
      });
    });
  },
  goto: function(directory) {
    if (smartDirectory.isOne(directory)) {
      this.currentDirectory = directory;

      ui.clear();

      /* Call for each directory in the scope directory */
      smartDirectory.callbackOnes(function(directory) {
        /* Append the link to the UI */
        ui.appendDirectory(directory);
      }, this.currentDirectory);

      /* Call for each file in the scope directory */
      smartDirectory.callbackFiles(directory, 24, 0, function(file) {
        /* Append the file to the UI*/
        ui.appendFile(file);
      });

      /* Append tree */
      ui.appendTree(directory);

      return;
    }

    return alert(`Error: ${directory} isn't a valid smartDirectory`);
  }
};

/* Load Config */
fs.readFile('config.json', 'utf8', function(err, data) {
  if (err) return ui.appendNotification(err);
  /* Try to parse */
  try {
    config = JSON.parse(data);
  } catch(e) {
    return ui.appendNotification(e);
  }
  /* @TODO check for mandatory configs */

  smartDirectory.createNotExistingOnes(function() {
    smartDirectory.callbackOnes(function(directory) {
      ui.appendDirectory(directory);
    });
    ui.appendTree('');
  });
});