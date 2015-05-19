define([
  "vispa/extensions", 
  "vispa/views/center",
  "css!../css/styles",
  "css!../vendor/jsroot/style/JSRootPainter"
], function(Extensions, CenterView) {

  this.$main     = null;
  this.$controls = null;
  this.$image    = null;

  var jsROOTExtension = Extensions.Extension._extend({

    init: function init() {
      init._super.call(this, "jsroot");

      require.config({
        paths: {
          jsroot                    : vispa.url.dynamic("extensions/jsroot/static/vendor/jsroot/scripts/JSRootCore"),
          "jsroot/painter"          : vispa.url.dynamic("extensions/jsroot/static/vendor/jsroot/scripts/JSRootPainter"),
          "jsroot/d3"               : vispa.url.dynamic("extensions/jsroot/static/vendor/jsroot/scripts/d3.v3.min"),
          "jsroot/jquery.mousewheel": vispa.url.dynamic("extensions/jsroot/static/vendor/jsroot/scripts/jquery.mousewheel")
        },
        shim: {
          jsroot: {
            exports: "JSROOT"
          },
          "jsroot/painter": [ "jsroot", "jsroot/d3", "jsroot/jquery.mousewheel" ]
        }
      });

      require(["jsroot", "jsroot/painter"], function(JSROOT) {
      });

      var self = this;

      this.addView("jsroot", jsROOTView);
      this.addMenuEntry("Browse ROOT File", {
        iconClass: "fa fa-leaf",
        callback: function(workspaceId) {
          self.createInstance(workspaceId, jsROOTView);
        }
      });

      // default preferences
      this.setDefaultPreferences(jsROOTView, {
        widthFraction: {
          type: "integer",
          value: 20,
          range: [5, 95, 1],
          description: "Width fraction in %."
        },
      }, {
        title: "Browse Root File"
      });

      // tell other extensions to open root files with this jsROOTView
      this.fileExtensions = ["root"];
      $.each(this.fileExtensions, function(i, key) {
        self.addFileHandler(key, function(workspaceId, path) {
          self.createInstance(workspaceId, jsROOTView, {
            path: path
          });
        });
      });

      // this.onSocket("watch", function(data) {
      //   if (data.watch_id != "root")
      //     return;
      //   if (data.event == "vanish") {
      //     self.confirm("File has been deleted or renamed. \n Please open a new file or the browser is closed.", function(res) {
      //       if (!res)
      //         self.close();
      //       else {
      //         var callback = function() {
      //           self.spawnInstance("jsroot", "jsROOT", {
      //             path: self.getState("path")
      //           });
      //           self.close();
      //         };
      //         self.openFileSelector(null, callback);
      //       }
      //     });
      //   }
      // });

    }
  });


  var jsROOTView = CenterView._extend({

    init: function init(pathReceived) {
      init._super.apply(this, arguments);
      this.setLabel("Browse ROOT File");
      this.pathReceived = pathReceived;
    },


    applyPreferences: function applyPreferences() {
      applyPreferences._super.call(this);
      this.setWidth(this.getPreference("widthFraction"));
    },

    render: function($node) {
      var self = this;
      // set icon for tab
      this.setIcon(this.static("img/root_icon.png"));
      // get html template
      this.getTemplate("html/main.html", function(err, tmpl) {
        if (err)
          throw err
        else {
          $main = $(tmpl).appendTo($node);

            // open file selector when clicking on open file button
            var $openFileButton = $main.find(".open-file").click(function($event) {
              var args = {
                callback: function(path) {
                  //check if file has pxl proper extension
                  var ext = path.split(".").pop();
                  if ((self._extension.fileExtensions = ["root"]).indexOf(ext) == -1) {
                    self.alert("The selected file is not a root file. Please select a different one!");
                    path = null;
                  }
                  else {
                    // call function to process root file
                    self.createGUI(path);
                  }
                }
              };
              self.spawnInstance("file", "FileSelector", args);
            });

          // make divs resizable
          $controls = $main.find(".controls-resize-wrapper");
          $image    = $main.find(".image-wrapper");
          $controls.resizable({
            start: function() {
              var mainWidth  = $main.width();
              $controls.resizable("option", "grid", [mainWidth * 0.01, 1]);
            },
            resize: function() {
              var mainWidth     = $main.width();
              var controlsWidth = $controls.width();
              $controls.css({
                left : 0,
                width: controlsWidth
              });
              $image.css({
                left : controlsWidth,
                width: mainWidth - controlsWidth
              });
            },
            stop: function() {
              // prevent the resized divs from being larger than the window 
              var controlsWidth = $controls.width();
              var mainWidth     = $main.width();
              var frac = Math.round(100.0 * controlsWidth / mainWidth);
              frac = Math.max(5, Math.min(95, frac));
              // set the new width
              self.setWidth(frac);
              // tell the preferences about the new width
              self.setPreference("widthFraction", frac);
              self.pushPreferences();
            }
          });

          // // call function to process root file if this.pathReceived exists
          if (self.pathReceived) {
            self.createGUI(self.pathReceived.path);
          }
        }
      });
    },

    setWidth: function(widthFraction) {
      if (!$main) {
        return this;
      }
      $controls.css({
        left : 0,
        width: widthFraction + "%"
      });
      $image.css({
        left : widthFraction + "%",
        width: (100 - widthFraction) + "%"
      });
    },

    createGUI: function(file) {
      var workspaceId = this.getWorkspaceId();
      file = "fs/getfile?path=" + file + "&_workspaceId=" + workspaceId;
      var h = new JSROOT.HierarchyPainter("example", "TreeView");
      h.SetDisplay("simple", "PadView");
      h.OpenRootFile(file, function() {
      });
    },

  });
  return jsROOTExtension;
});
