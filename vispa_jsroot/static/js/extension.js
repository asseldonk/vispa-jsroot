require.config({
  paths: {
    "JSRootCore"    : vispa.url.dynamic("extensions/jsroot/static/vendor/jsroot/scripts/JSRootCore"),
    "JSRootPainter" : vispa.url.dynamic("extensions/jsroot/static/vendor/jsroot/scripts/JSRootPainter"),
    "d3"            : vispa.url.dynamic("extensions/jsroot/static/vendor/jsroot/scripts/d3.v3.min"),
    "mathjax"       : vispa.url.dynamic("extensions/jsroot/static/vendor/mathjax/MathJax.js?config=TeX-AMS-MML_SVG&amp;delayStartupUntil=configured"),
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
        iconClass: "jsroot-icon-menu",
        priority : 1,
        callback : this.openViaFileSelector.bind(this) 
      });

      // default preferences
      this.setDefaultPreferences(JsROOTView, {
        sidebarWidth: {
          type       : "integer",
          value      : 200,
          description: "Width of the sidebar in pixels."
        }
      }, {
        title: "ROOT File Browser"
      });

      // tell other extensions to open root files with this jsROOTView
      this.addFileHandler("root", function(workspaceId, path) {
        self.createInstance(workspaceId, JsROOTView, { path: path });
      });

      // default fast menu entries
      this.getDefaultPreferences(JsROOTView).fastMenuEntries.value = [ "open" ];
      this.getDefaultPreferences(JsROOTView).fastMenuEntries.value = [ "help" ];

    },


    openViaFileSelector: function(workspaceId, callback) {
      var self = this;

      if (callback === undefined) {
        callback = function(workspaceId, path) {
          self.createInstance(workspaceId, JsROOTView, { path: path });
        };
      }

      var args = {
        callback: function(path) {
          // a root file?
          var ext = path.split(".").pop().toLowerCase();
          if (ext != "root") {
            vispa.messenger.alert("The selected file is not a root file. Please select a different one!");
            self.openViaFileSelector(workspaceId, callback);
          } else {
            callback(workspaceId, path);
          }
        }
      };

      vispa.extensions.createInstance(workspaceId, "file", "FileSelector", 0, args);
    }

  });


  var JsROOTView = CenterView._extend({

    init: function init(obj) {
      init._super.apply(this, arguments);

      var self = this;

      require(["JSRootCore", "JSRootPainter", "mathjax"]);

      this.path    = (obj || {}).path;
      this.painter = null;
      this.nodes   = {};

      this.addMenuEntry("open", {
        label      : "Open File ...",
        iconClass  : "glyphicon glyphicon-folder-open",
        buttonClass: "btn-primary",
        callback: function() {
          self._extension.openViaFileSelector(self.getWorkspaceId(), function(_, path) {
            self.openFile(path);
          });
        }
      });

      this.addMenuEntry("help", {
        label      : "Help",
        iconClass  : "glyphicon glyphicon-question-sign",
        buttonClass: "btn-primary",
        callback: function() {
          self.openHelpDialog();
        }
      });

      // look if file has been deleted or modified
      this.onSocket("watch", function(data) {
        if (data.watch_id != "jsroot")
          return;
        // in case file deleting or renamings
        if (data.event == "vanish" && data.mtime == -1) {
          var filename = ((data.path).split('/')).pop();
          self.confirm("The file '" + filename + 
                       "' has been deleted or renamed. \n Please open a new file or the browser is closed.",
          function(res) {
            if (!res)
              self.close();
            else {
              var callback = function() {
                self.spawnInstance("jsroot", "JSROOT", {
                  path: this.path
                });
                self.close();
              };
              self._extension.openViaFileSelector(self.getWorkspaceId(), function(_, path) {
                self.openFile(path);
              });
            }
          });
        }
        // in case up file modification
        if (data.event == "vanish" && data.mtime != -1) {
          var filename = ((data.path).split('/')).pop();
          self.confirm("The file '" + filename +
                       "' has been modified. \n Would you like to reload it?", function(res) {
            if (!res)
              self.close();
            else {
              var callback = function() {
                self.spawnInstance("jsroot", "JSROOT", {
                  path: this.path
                });
                self.close();
              };
              self.openFile(data.path);
            }
          });
        }
        if (data.event == "modify") {
          var filename = ((data.path).split('/')).pop();
          self.confirm("The file '" + filename +
                       "' has been modified. \n Would you like to reload it?", function(res) {
            if (!res)
              self.close();
            else {
              var callback = function() {
                self.spawnInstance("jsroot", "JSROOT", {
                  path: this.path
                });
                self.close();
              };
              self.openFile(data.path);
            }
          });
        }

      });

    },


    applyPreferences: function applyPreferences() {
      applyPreferences._super.call(this);

      this.layout(this.getPreference("sidebarWidth"));
    },


    render: function($node) {
      var self = this;

      // set icon for tab
      this.setIcon("jsroot-icon-tab");

      // get html template
      this.getTemplate("html/main.html", function(err, tmpl) {
        if (err) throw err;

        var $main        = $(tmpl).appendTo($node);
        var $sidebar     = $main.find(".sidebar-resize-wrapper");
        var $content     = $main.find(".content-wrapper");
        var $placeholder = $main.find(".placeholder");
        var $canvas      = $main.find(".canvas-wrapper");

        // make divs resizable
        $sidebar.resizable({
          start: function() {
            var mainWidth  = $main.width();
            $sidebar.resizable("option", "grid", [mainWidth * 0.01, 1]);
            $sidebar.resizable("option", "minWidth", 0);
            $sidebar.resizable("option", "maxWidth", mainWidth);
          },
          resize: function() {
            var mainWidth    = $main.width();
            var sidebarWidth = $sidebar.width();
            var contentWidth = mainWidth - sidebarWidth;
            $sidebar.css({
              left : 0,
              width: sidebarWidth
            });
            $content.css({
              left : sidebarWidth,
              width: contentWidth
            });
          },
          stop: function() {
            // tell the preferences about the new width
            self.setPreference("sidebarWidth", parseInt(Math.floor($sidebar.width())));
            // self.pushPreferences();
          }
        });

        // make canvas wrapper resizable
        $canvas.resizable({
          start: function() {
            // set max dimensions
            $canvas.resizable("option", "maxWidth",  $content.width());
            $canvas.resizable("option", "maxHeight", $content.height());
          }
        });

        // store nodes
        self.nodes.$main        = $main;
        self.nodes.$sidebar     = $sidebar;
        self.nodes.$content     = $content;
        self.nodes.$placeholder = $placeholder;
        self.nodes.$canvas      = $canvas;

        // apply preferences
        self.applyPreferences();

        // open initial path?
        self.openFile(self.path);

      });
    },

    layout: function(sidebarWidth) {
      if (!this.nodes.$main) return;

      // limit the sidebar width
      var width = Math.min(Math.max(sidebarWidth, 0), this.nodes.$main.width());
      if (width != sidebarWidth) {
        this.setPreference("sidebarWidth", width);
        this.pushPreferences();
        return;
      }

      // set sidebar and content layout
      this.nodes.$sidebar.css({
        left : 0,
        width: sidebarWidth
      });
      this.nodes.$content.css({
        left : sidebarWidth,
        width: ""
      });

      // maybe update the canvas width
      var contentWidth = this.nodes.$content.width();
      if (this.nodes.$canvas.width() > contentWidth) {
        this.nodes.$canvas.width(contentWidth);
      }
    },


    openFile: function(path) {
      var self = this;

      if (!path || !this.nodes.$main) return;
      this.setLoading(true);
      this.path = path;
      console.log(this);
      console.trace();
      this.setLabel(path, true);

      require(["JSRootPainter"], function(JSROOT) {
        JSROOT.MathJax = 2;
        self.nodes.$placeholder.hide();
        self.nodes.$canvas.show().find("> div.pad").empty();

        // set new ids
        var treeId = "tree-" + vispa.uuid();
        var padId  = "pad-"  + vispa.uuid();

        self.nodes.$main.find(".tree").attr("id", treeId);
        self.nodes.$main.find(".pad").attr("id", padId);

        // build the root file path
        var workspaceId = self.getWorkspaceId();
        path = "fs/getfile?path=" + path + "&_workspaceId=" + workspaceId;
        path = vispa.url.dynamic(path);

        // load root file
        self.painter = new JSROOT.HierarchyPainter("painter-" + vispa.uuid(), treeId);
        JSROOT.RegisterForResize(self.painter);
        self.painter.SetDisplay("simple", padId);
        self.painter.OpenRootFile(path, function() {
          self.setLoading(false);
        });
      });

      // watch
      this.POST("/ajax/fs/watch", {
        path    : this.path,
        watch_id: "jsroot"
      });

    },


    openHelpDialog: function() {
      var self    = this;
      var header  = "<i class='glyphicon glyphicon-question-sign'></i> Help";
      var body    = "<h3>Why are my root files not shown correctely?</h3><br>VISPA adopts" +
                    " the <a target='_blank' href='https://github.com/linev/jsroot'>jsroot </a> library to draw" +
                    " <a target='_blank' href='https://root.cern.ch'>ROOT</a> objects. Currently, the classes" +
                    " <ul><li>TH1</li><li>TH2</li><li>TH3 </li><li>TProfile</li><li>TGraph</li><li>TF1</li>" +
                    " <li>TPaveText</li><li>TCanvas</li></ul> are supported, as well as LaTeX strings." +
                    " <br>For more information, visit the jsroot <a target='_blank'" +
                    " href='https://github.com/linev/jsroot/blob/master/docs/JSROOT.md'> documentation site</a>.";
      var $footer = $("<div><button class='btn btn-primary'>Close</button></div>");
      self.dialog({
        header  : header,
        body    : body,
        footer  : $footer,
        onRender: function() {
          var self = this;
          $footer.find("button").click(function() {
            self.close();
          });
        }
      });
    },

    onClose: function() {
      this.POST("/ajax/fs/unwatch");
    }


  });


  return JsROOTExtension;
});
