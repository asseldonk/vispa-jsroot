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

define([
  "vispa/extensions", 
  "vispa/views/center",
  "css!../css/styles",
  "css!../vendor/jsroot/style/JSRootPainter"
], function(Extensions, CenterView) {

  var JsROOTExtension = Extensions.Extension._extend({

    init: function init() {
      init._super.call(this, "jsroot");

      var self = this;


      this.addView("jsroot", JsROOTView);

      this.addMenuEntry("Open ROOT File", {
        iconClass: "fa fa-leaf",
        callback: function(workspaceId) {
          self.createInstance(workspaceId, JsROOTView);
        }
      });

      // default preferences
      this.setDefaultPreferences(JsROOTView, {
        widthFraction: {
          type: "integer",
          value: 20,
          range: [5, 95, 1],
          description: "Width fraction in %."
        }
      });

      // tell other extensions to open root files with this jsROOTView
      this.addFileHandler("root", function(workspaceId, path) {
        self.createInstance(workspaceId, JsROOTView, { path: path });
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


  var JsROOTView = CenterView._extend({

    init: function init(obj) {
      init._super.apply(this, arguments);

      this.path    = (obj || {}).path;
      this.painter = null;
      this.nodes   = {};
    },


    applyPreferences: function applyPreferences() {
      applyPreferences._super.call(this);
      this.setWidth(this.getPreference("widthFraction"));
    },


    render: function($node) {
      var self = this;

      // set icon for tab
      this.setIcon("jsroot-tab-icon");

      // get html template
      this.getTemplate("html/main.html", function(err, tmpl) {
        if (err) throw err

        var $main        = $(tmpl).appendTo($node);
        var $controls    = $main.find(".controls-resize-wrapper");
        var $content     = $main.find(".content-wrapper");
        var $placeholder = $main.find(".placeholder");
        var $canvas      = $main.find(".canvas-wrapper");

        // open file selector when clicking on open file button
        var $openFileButton = $main.find(".open-file").click(function($event) {
          var args = {
            callback: function(path) {
              // a root file?
              var ext = path.split(".").pop().toLowerCase();
              if (ext != "root") {
                self.alert("The selected file is not a root file. Please select a different one!");
              } else {
                self.openFile(path);
              }
            }
          };
          self.spawnInstance("file", "FileSelector", args);
        });

        // make divs resizable
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
            $content.css({
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

        // make canvas wrapper resizable
        var maxResizeWidth  = $content.width();
        var maxResizeHeight = $content.height();
        $canvas.resizable({
          maxWidth : maxResizeWidth,
          maxHeight: maxResizeHeight
        });

        // store nodes
        self.nodes.$main        = $main;
        self.nodes.$controls    = $controls;
        self.nodes.$content     = $content;
        self.nodes.$placeholder = $placeholder;
        self.nodes.$canvas      = $canvas;

        // open initial path?
        self.openFile(self.path);
      });
    },


    setWidth: function(widthFraction) {
      if (!this.nodes$main) return;

      this.nodes.$controls.css({
        left : 0,
        width: widthFraction + "%"
      });
      this.nodes.$content.css({
        left : widthFraction + "%",
        width: (100 - widthFraction) + "%"
      });
    },


    openFile: function(path) {
      var self = this;

      if (!path || !this.nodes.$main) return;
      this.path = path;

      require(["jsroot", "jsroot/painter"], function(JSROOT) {
        self.nodes.$placeholder.hide();
        self.nodes.$canvas.show().find("#PadView").empty();

        // build the root file path
        var workspaceId = self.getWorkspaceId();
        path = "fs/getfile?path=" + path + "&_workspaceId=" + workspaceId;
        path = vispa.url.dynamic(path);

        // load root file
        self.painter = new JSROOT.HierarchyPainter("jsroot", "TreeView");
        JSROOT.RegisterForResize(self.painter);
        self.painter.SetDisplay("simple", "PadView");
        self.painter.OpenRootFile(path);
      });
    }

  });


  return JsROOTExtension;
});
