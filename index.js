'user strict';

const fs = require('fs');
const pathTool = require('path');
const async = require('async');
const datejs = require('datejs');

var config = {};
var ui = {
  clear: function () {
    document.getElementsByClassName("navigation")[0].innerHTML = '';
    document.getElementsByClassName("directories")[0].innerHTML = '';
    document.getElementsByClassName("notifications")[0].innerHTML = '';
    document.getElementsByClassName("files")[0].innerHTML = '';
  },
  appendNotification: function (html) {
    var element = document.createElement('span');
    element.innerHTML = html;
    document.getElementsByClassName("notifications")[0].appendChild('<br />' + element);
  },
  appendDirectory: function (path) {
    var element = document.createElement('span');
    element.innerHTML = `<br /> <a class="click" onclick="smartDirectory.goto('${path}');">${path.pathToFileName()}</a>`;
    document.getElementsByClassName("directories")[0].appendChild(element);
  },
  appendFile: function (obj) {
    var element = document.createElement('p');
    element.innerHTML = obj.html;
    document.getElementsByClassName("files")[0].appendChild(element);
  },
  appendNavigation: function (path) {
    /* Path navigation */
    var slash = '';
    if (path !== '') { slash = '/'; }
    var element = document.createElement('span');
    element.innerHTML = `<span onclick="smartDirectory.goto('');" class="click">/root</span>${slash + path}`;
    document.getElementsByClassName("navigation")[0].appendChild(element);

    /* Back-button */
    element = document.createElement('span');
    element.innerHTML = `<a onclick="smartDirectory.goto('${path.pathToParent()}');" class="click black">⬑</a>`;
    document.getElementsByClassName("directories")[0].appendChild(element);
  }
};
var smartDirectory = {
  currentDirectory: '',
  filePathToHtml: {
    /* Use file extension and path to create a html-string */
    default: function (file) { return `${file.path.pathToFileName()}:[not supported]`; },
    img: function (file) {
      return `
    <div class="panel panel-default responsive">
      <div class="panel-heading">
      ${file.name}
      <span class="label label-success" title="File path">${file.path}</span>
      <span class="label label-danger" title="File size on disk in bits">${file.sizeOnDisk}</span>
      <span class="label label-warning" title="File unix time">${file.time}</span>
      </div>
      <div class="panel-body">
        <img class="responsive" src="${file.path.pathToUrl()}">
      </div>
    </div>
    `;
    },
    txt: function (file) {
      return `
    <div class="panel panel-default responsive">
    <div class="panel-heading">
    ${file.name}
    <span class="label label-success" title="File path">${file.path}</span>
    <span class="label label-danger" title="File size on disk in bits">${file.sizeOnDisk}</span>
    <span class="label label-warning" title="File unix time">${file.time}</span>
    </div>
    <div class="panel-body">
    <iframe src="${file.path.pathToUrl()}"></iframe>
    </div>
    </div>
    `;
    },

    png: function (a) { return this.img(a); },
    jpg: function (a) { return this.img(a); },
    jpeg: function (a) { return this.img(a); },
  },
  isSmartDirectory: function (path) {
    /* Return true if $path points to a smartDir */
    if (config.settings.global.autoMode === true) {
      /* Auto-mode is enabled */
      if (fs.existsSync(path.pathToUrl())) {
        if (fs.statSync(path.pathToUrl()).isDirectory()) {
          return true;
        }
      }
      return false;
    } else {
      /* Auto-mode is disabled, the smartDir must be declared in config */
      if (settings.hasOwnProperty(path) && fs.existsSync(path.pathToUrl())) {
        if (fs.statSync(path.pathToUrl()).isDirectory()) {
          return true;
        }
      }
      return false;
    }
  },
  createNotExistingDirectories: function (callback) {
    /* Mkdir smartDirs that are declared in config but don't exist */
    for (var path in config.declaredSmartDirectories) {
      if (config.declaredSmartDirectories.hasOwnProperty(path)) {
        if (!fs.existsSync(path.pathToUrl())) {
          fs.mkdirSync(path.pathToUrl());
          ui.appendNotification("Created " + path);
        }
      }
    }
    return callback();
  },
  callbackDeclaredDirectories: function (callback, path) {
    /* $callback() each smartDir that's been declared in config AND exists in $path*/
    /* Default $path is ''  */
    if (path === undefined) { path = ''; }
    /* For each directory declared in config */
    for (var dir in config.declaredSmartDirectories) {
      if (config.declaredSmartDirectories.hasOwnProperty(dir)) {
        if (dir.pathToParent() === path) {
          /* The directory is located in $path */
          callback(dir);
        }
      }
    }
    return;
  },
  callbackDirectories: function (callback, path) {
    /* $callback() each smartDir that exists in $path */

    /* 1. Default $path is '' and if $path is not '' add a slash at the end of it */
    if (path === undefined || path === '') { path = ''; } else { path = path + '/'; }

    if (config.settings.global.autoMode === true) {
      /* Auto-mode is enabled, scan for smartDirs in $path */
      fs.readdirSync(path.pathToUrl()).filter(file => {
        if (this.isSmartDirectory(path + file)) {
          var directory = file;
          callback(path + directory);
        }
      });
    } else {
      /* Auto-mode is disabled, search for smartDirs in $path from config */
      this.callbackDeclaredDirectories(smartDir => {
        callback(path + smartDir);
      }, path);
    }
    return;
  },
  callbackFiles: function (callback, first, last, path) {
    /* $callback() each file that exists in $path */
    fs.readdir(path.pathToUrl(), (err, files) => {
      var validFiles = [];
      var validFilesWithTime = [];

      /* For each file in $path */
      async.each(files, function (file, callback) {
        fs.stat(pathTool.join(path.pathToUrl(), file), (err, stat) => {
          if (!stat.isDirectory()) {
            /* It's a valid file (not a directory) */
            validFiles.push({ path: pathTool.join(path.pathToUrl(), file), size: stat.size });
          }
          return callback();
        });
      }, function (err) {
        if (err) { return ui.appendNotification(err); }

        /* Check for custom settings to sort by */
        var sortBy = config.settings.defaultSmartDirectory.sortBy;
        if (config.declaredSmartDirectories[path] !== undefined && config.declaredSmartDirectories[path].sortBy !== undefined) {
          sortBy = config.declaredSmartDirectories[path].sortBy;
        }

        /* For each file in $validFiles */
        validFiles.forEach(file => {
          /* For each option to sort by */
          for (i = 0; i < sortBy.length; i++) {
            var fileNameWithoutExtension = file.path.pathToFileName().removeFileExtension();
            var fileExtension = file.path.pathToFileName().fileNameToExtension().toLowerCase();

            /* @TODO add a support for prefixes and suffixes like _Screenshot or IMG_ */
            /* @TODO add a support for flags and hashtags like #cool and @auto-open */

            var date = Date.parseExact(fileNameWithoutExtension, sortBy[i].format); /* => ISO-format*/

            if (date) {
              /* A date was found in the fileName */
              var time = date.getTime(); /* ISO-format => unix */

              var fileObj = { name: file.path.pathToFileName(), path: file.path, sizeOnDisk: file.size, time: time }; /* An object for HTML renderer */
              var html = smartDirectory.filePathToHtml[fileExtension] ?
                smartDirectory.filePathToHtml[fileExtension](fileObj) :
                smartDirectory.filePathToHtml.default(fileObj);

              validFilesWithTime.push({ html: html, time: time }); /* An object for sorting algorithm (and appender) */

              break; /* sortBy[i] complied  */

            } else {
              /* sortBy[i] didn't comply */
            }
          }
        });

        /* Sort validFilesWithTime based on unix time */
        validFilesWithTime.sort(function (a, b) { return a.time - b.time; });

        /* Callback the files in ascending or descending order */
        if (first < last) {
          for (i = first; i < last; i++) {
            if (validFilesWithTime[i] === undefined) break;
            callback(validFilesWithTime[i]);
          }
        } else {
          for (i = first; i >= last; i--) {
            if (validFilesWithTime[i] !== undefined) {
              callback(validFilesWithTime[i]);
            }
          }
        }

        return;
      });
    });
  },
  goto: function (path) {
    /* Go to $path smartDir */
    if (this.isSmartDirectory(path)) {
      this.currentDirectoryPath = path;

      /* Clear UI before appending elements */
      ui.clear();

      /* Append navigation */
      ui.appendNavigation(path);

      /* For each directory in $this.currentDirectoryPath */
      smartDirectory.callbackDirectories(function (path) {
        /* Append to the UI */
        ui.appendDirectory(path);
      }, this.currentDirectoryPath);

      /* For each file in $this.currentDirectoryPath */
      smartDirectory.callbackFiles(function (file) {
        /* Append the file to the UI*/
        ui.appendFile(file);
      }, 0, 24, this.currentDirectoryPath);

      return;
    }
    return ui.appendNotification(`Error: ${path} isn't a valid smartDirectory`);
  }
};

/* -- String prototypes --*/
String.prototype.pathToUrl = function () {
  return pathTool.join(config.settings.global.rootUrl, String(this));
};
String.prototype.urlToPath = function () {
  return "" + String(this).replace(config.settings.global.rootUrl, "");
};
String.prototype.pathToFileName = function () {
  if (String(this).lastIndexOf(`/`) > String(this).lastIndexOf(`\\`)) {
    return "" + String(this).substr(String(this).lastIndexOf(`/`) + 1, String(this).length);
  } else {
    return "" + String(this).substr(String(this).lastIndexOf(`\\`) + 1, String(this).length);
  }
};
String.prototype.pathToParent = function () {
  if (String(this).lastIndexOf(`/`) > String(this).lastIndexOf(`\\`)) {
    return "" + String(this).substr(0, String(this).lastIndexOf(`/`));
  } else {
    return "" + String(this).substr(0, String(this).lastIndexOf(`\\`));
  }
};
String.prototype.removeFileExtension = function () {
  return "" + String(this).substr(0, String(this).lastIndexOf(`.`));
};
String.prototype.removeFileExtensions = function () {
  return "" + String(this).substr(0, String(this).indexOf(`.`));
};
String.prototype.fileNameToExtension = function () {
  return "" + String(this).substr((String(this).lastIndexOf(`.`) + 1), String(this).length);
};

/* -- "Boot" -- */
fs.readFile('config.json', 'utf8', function (err, data) {
  /* Load config */
  if (err) return ui.appendNotification(err);
  try { config = JSON.parse(data); } catch (e) { return ui.appendNotification(e); }

  /* @TODO check for mandatory configs */
  smartDirectory.createNotExistingDirectories(function () {
    ui.appendNavigation('');
    smartDirectory.callbackDirectories(function (smartDir) {
      ui.appendDirectory(smartDir);
    });
  });
});